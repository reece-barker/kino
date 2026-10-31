#!/usr/bin/env python3
# TorBox to storage box sync, v3
# Writes a live status file for the dashboard, listens to the pause button, and skips duplicates:
# - only video and subtitle files get downloaded, no nfo, images, samples or extras
# - if you already have a film or episode in 1080p or better, other copies are skipped whatever there quality
# - if TorBox has several copies of the same thing, only the best one is downloaded

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

import requests

try:
    from guessit import guessit
except ImportError:  # Without guessit the duplicate check is off, everything else still works
    guessit = None

API = os.environ.get("TORBOX_API", "https://api.torbox.app/v1/api")  # Only changed for testing
KEY = os.environ["TORBOX_API_KEY"]
DEST = Path(os.environ.get("TORBOX_DEST", "/srv/torbox")).resolve()
STATE = DEST / ".state.json"
STATUS = Path(os.environ.get("SYNC_STATUS", "/var/lib/torbox-sync/status.json"))
PAUSE = Path(os.environ.get("PAUSE_FILE", "/var/lib/kino/pause.json"))
DELETED = Path(os.environ.get("DELETED_FILE", "/var/lib/kino/deleted.json"))  # written by the dashboard when the admin deletes media
REQUIRE_MOUNT = os.environ.get("REQUIRE_MOUNT", "1") == "1"
MIN_FREE = 20 * 1024**3  # Keeps 20gb free so the storage box dosent fill up compleatly

# Kind of download and the name of the id param that requestdl wants for it
KINDS = [("torrents", "torrent_id"), ("webdl", "web_id"), ("usenet", "usenet_id")]

s = requests.Session()
s.headers["Authorization"] = f"Bearer {KEY}"

# Everything the dashboard shows comes from this dict
status = {"state": "starting", "pid": os.getpid(), "run_started": time.time(), "current": None,
          "queue_total": 0, "queue_done": 0, "new": 0, "failed": [], "skipped": [], "recent": [], "last_run": None,
          "message": None, "updated": time.time()}

VIDEO_EXT = {".mkv", ".mp4", ".m4v", ".avi", ".mov", ".webm", ".ts", ".wmv"}
SUB_EXT = {".srt", ".vtt", ".ass", ".ssa", ".sub", ".idx"}
EXTRA_DIRS = {"extras", "featurettes", "behind the scenes", "deleted scenes", "trailers", "samples", "sample",
              "interviews", "bonus", "shorts", "scenes"}
GOOD_ENOUGH = 1080  # Already having this or better means other copies get skipped


def norm(x):
    return re.sub(r"[^a-z0-9]+", " ", str(x).lower()).strip()


def first(v):
    return v[0] if isinstance(v, list) and v else v


def res_of(text):
    t = str(text or "").lower()
    if re.search(r"2160p|\b4k\b|uhd", t):
        return 2160
    for r in (1440, 1080, 720, 576, 480):
        if f"{r}p" in t or f"{r}i" in t:
            return r
    return 0


def media_key(name):
    # Same film or same episode gives the same key, whatever the release or quality
    if not guessit:
        return None, 0
    try:
        g = guessit(name)
    except Exception:
        return None, 0
    title = norm(first(g.get("title")) or "")
    if not title:
        return None, 0
    res = res_of(g.get("screen_size")) or res_of(name)
    if g.get("type") == "episode" and g.get("episode") is not None:
        return ("ep", title, first(g.get("season")) or 0, first(g.get("episode"))), res
    return ("movie", title, first(g.get("year")) or 0), res


def probe_height(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height",
                              "-of", "csv=p=0", str(path)], capture_output=True, text=True, timeout=60).stdout
        h = int(out.strip().split()[0])
        return 2160 if h >= 1600 else 1080 if h >= 800 else 720 if h >= 600 else h
    except Exception:
        return 0


def existing_library():
    """What we already have on the storage box: key -> (best resolution, file name)"""
    have = {}
    for root, dirs, names in os.walk(DEST):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for n in names:
            p = Path(root) / n
            if n.startswith(".") or p.suffix.lower() not in VIDEO_EXT:
                continue
            key, res = media_key(str(p.relative_to(DEST)))
            if not key:
                continue
            if not res:
                res = probe_height(p)  # Name doesnt say the quality, so ffprobe reads it from the file
            if res >= have.get(key, (-1, ""))[0]:
                have[key] = (res, n)
    return have


def is_junk(name, size):
    p = Path(name)
    parts = {x.lower() for x in p.parts[:-1]}
    low = p.name.lower()
    if parts & EXTRA_DIRS:
        return True
    if "sample" in low and size < 400 * 1024**2:
        return True
    if re.search(r"(^|[\W_])(trailer|featurette)([\W_]|$)", low) and size < 1024**3:
        return True
    return False


def write_status():
    status["updated"] = time.time()
    try:
        STATUS.parent.mkdir(parents=True, exist_ok=True)
        tmp = STATUS.with_suffix(".tmp")
        tmp.write_text(json.dumps(status))
        tmp.chmod(0o644)
        tmp.replace(STATUS)  # Replace in one go so the dashboard never reads half a file
    except OSError as e:
        print(f"couldnt write status: {e}")


def load_old_status():
    try:
        old = json.loads(STATUS.read_text())
        status["recent"] = old.get("recent", [])[:20]
        status["last_run"] = old.get("last_run")
    except Exception:
        pass


def paused_until():
    try:
        until = json.loads(PAUSE.read_text()).get("until", 0)
        return until if until > time.time() else 0
    except Exception:
        return 0


def load_deleted():
    """What the admin deleted from the library (so it isnt fetched again) and what was let back in after being watched on TorBox.
    Returns (blocked media key -> when it was deleted, allowed torbox file key -> when it was allowed)"""
    blocked, allow = {}, {}
    try:
        j = json.loads(DELETED.read_text())
    except Exception:
        return blocked, allow
    for t in j.get("tombs") or []:
        mk, _ = media_key(t.get("rel") or "")
        if mk:
            blocked[mk] = max(blocked.get(mk, 0), t.get("at") or 0)
    for a in j.get("allow") or []:
        allow[a.get("key")] = a.get("at") or 0
    return blocked, allow


def item_time(item):
    # When the item was added to TorBox, an item added after something was deleted is a new request for it and is let through
    from datetime import datetime
    for k in ("created_at", "cached_at"):
        try:
            return datetime.fromisoformat(str(item[k]).replace("Z", "+00:00")).timestamp()
        except Exception:
            continue
    return 0


def load_state():
    # Remembers what we allready downloaded so the timer dosent grab everything twice
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {}


def save_state(state):
    tmp = STATE.with_name(".state.tmp")
    tmp.write_text(json.dumps(state, indent=1))
    tmp.replace(STATE)


def list_items(kind):
    items, offset = [], 0
    while True:
        r = s.get(f"{API}/{kind}/mylist",
                  params={"offset": offset, "limit": 1000, "bypass_cache": "true"}, timeout=60)
        if r.status_code == 404:
            break
        r.raise_for_status()
        data = r.json().get("data") or []
        items += data
        if len(data) < 1000:
            break
        offset += 1000
    return items


def get_link(kind, id_param, item_id, file_id):
    # Links only last 3 hours so we ask for a fresh one right before each file
    r = s.get(f"{API}/{kind}/requestdl",
              params={"token": KEY, id_param: item_id, "file_id": file_id}, timeout=60)
    r.raise_for_status()
    return r.json()["data"]


def download(url, target, size, rel):
    free = shutil.disk_usage(DEST).free
    if free < size + MIN_FREE:
        raise RuntimeError("not enough disk space left on the storage box, stopping")
    target.parent.mkdir(parents=True, exist_ok=True)
    part = target.with_name(target.name + ".part")
    cur = {"name": target.name, "rel": rel, "bytes": 0, "total": size, "speed": 0, "started": time.time()}
    status["current"] = cur
    write_status()
    last_t, last_b = time.time(), 0
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(part, "wb") as f:
            for chunk in r.iter_content(1024 * 1024):
                f.write(chunk)
                cur["bytes"] += len(chunk)
                now = time.time()
                # Updates the dashboard every 2 seconds, more often would just spam the disk
                if now - last_t >= 2:
                    cur["speed"] = (cur["bytes"] - last_b) / (now - last_t)
                    last_t, last_b = now, cur["bytes"]
                    write_status()
    part.rename(target)  # Only renamed at the end so half files never look finished
    status["current"] = None


def finish(result, message=None):
    status["state"] = "idle" if result != "paused" else "paused"
    status["current"] = None
    status["message"] = message
    status["last_run"] = {"finished": time.time(), "started": status["run_started"], "new": status["new"],
                          "failed": len(status["failed"]), "skipped": len(status["skipped"]), "result": result,
                          "message": message}
    write_status()


def on_term(*_):
    # systemctl stop sends this, turning it into a normal exit so the finally block still runs
    raise SystemExit(0)


def main():
    signal.signal(signal.SIGTERM, on_term)
    load_old_status()

    if paused_until():
        finish("paused", "Sync is paused")
        print("paused, skipping this run")
        return
    if REQUIRE_MOUNT and not os.path.ismount(DEST):
        finish("error", f"{DEST} isnt mounted, the storage box mount is missing")
        sys.exit(f"{DEST} is not mounted, refusing to fill the local disk")

    status["state"] = "listing"
    write_status()
    state = load_state()
    blocked, allow = load_deleted()

    # Builds the full todo list first so the dashboard can show "3 of 12"
    have = existing_library() if guessit else {}
    skipped_deleted = []
    cands = []  # (kind, id_param, item_id, file, key, target, media_key, res)
    for kind, id_param in KINDS:
        for item in list_items(kind):
            # Skip stuff thats still downloading or already gone from torbox
            if not (item.get("download_finished") and item.get("download_present")):
                continue
            for f in item.get("files") or []:
                key = f"{kind}:{item['id']}:{f['id']}"
                # Done before is skipped, unless the dashboard let it back in after it was watched again (allowed later than it was fetched)
                if key in state and not (key in allow and allow[key] > (state[key].get("at") or 0)):
                    continue
                name = f.get("name") or ""
                ext = Path(name).suffix.lower()
                if ext not in VIDEO_EXT and ext not in SUB_EXT:
                    continue  # nfo, txt, images, exe and so on never get downloaded
                if is_junk(name, f.get("size", 0)):
                    continue
                target = (DEST / kind / name.lstrip("/")).resolve()
                # Makes sure a weird filename cant write outside of the dest folder
                if DEST not in target.parents:
                    print(f"skipping suspicious path: {name}")
                    continue
                mk, res = media_key(name) if ext in VIDEO_EXT else (None, 0)
                # Deleted by the admin: not fetched again, unless this copy was only added to TorBox after the delete or was allowed back
                if mk and mk in blocked and key not in allow and item_time(item) <= blocked[mk]:
                    skipped_deleted.append({"name": target.name, "reason": "You deleted it"})
                    continue
                f = dict(f, _item=item.get("name"))
                cands.append((kind, id_param, item["id"], f, key, target, mk, res))

    # Picks one copy per film or episode, the best quality, and the smaller file when the quality is the same
    best = {}
    for c in cands:
        mk, res, size = c[6], c[7], c[3].get("size", 0)
        if not mk:
            continue
        cur = best.get(mk)
        if cur is None or (res, -size) > (cur[7], -cur[3].get("size", 0)):
            best[mk] = c
    todo, skipped, keep_items = [], [], set()
    for c in cands:
        kind, id_param, item_id, f, key, target, mk, res = c
        if Path(f.get("name", "")).suffix.lower() in SUB_EXT:
            continue  # Subtitles get decided after the videos
        if mk:
            got = have.get(mk)
            if got and got[0] >= GOOD_ENOUGH:
                skipped.append({"name": target.name, "reason": f"Already have it in {got[0]}p"})
                continue
            if got and res and res <= got[0]:
                skipped.append({"name": target.name, "reason": f"Already have it in {got[0]}p"})
                continue
            if best.get(mk) is not c:
                skipped.append({"name": target.name, "reason": "Picked a better copy"})
                continue
        todo.append(c)
        keep_items.add((kind, item_id))
    # Subtitles only come along with a video thats being downloaded from the same item
    for c in cands:
        if Path(c[3].get("name", "")).suffix.lower() in SUB_EXT and (c[0], c[2]) in keep_items:
            todo.append(c)
    skipped += skipped_deleted
    status["skipped"] = skipped[:60]
    todo = [c[:6] for c in todo]

    status.update(state="running", queue_total=len(todo), queue_done=0)
    write_status()
    stopped_by_pause = False
    for kind, id_param, item_id, f, key, target in todo:
        if paused_until():
            stopped_by_pause = True
            break
        rel = str(target.relative_to(DEST))
        try:
            print(f"downloading {target}", flush=True)
            url = get_link(kind, id_param, item_id, f["id"])
            download(url, target, f.get("size", 0), rel)
            # Which TorBox item it came from and when, so the dashboard can show where a file came from and the delete list can
            # tell a new download from an old one
            state[key] = {"path": str(target), "size": f.get("size", 0), "at": time.time(), "item": f.get("_item"), "kind": kind}
            save_state(state)  # Saved after every file so a crash dosent lose progress
            status["new"] += 1
            status["recent"] = ([{"name": target.name, "rel": rel, "size": f.get("size", 0), "at": time.time()}]
                                + status["recent"])[:20]
        except RuntimeError as e:
            print(e, flush=True)
            finish("error", str(e))
            sys.exit(1)
        except Exception as e:
            print(f"failed {key}: {e}", flush=True)  # One bad file shouldnt stop the whole run
            status["failed"].append({"name": target.name, "error": str(e)[:200]})
            status["current"] = None
        status["queue_done"] += 1
        write_status()
    finish("paused" if stopped_by_pause else "ok")
    print(f"done, {status['new']} new files", flush=True)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:
        # Stopped from the dashboard or systemctl, marks it so the dashboard dosent think its still running
        if status["state"] in ("running", "listing", "starting"):
            finish("stopped", "Stopped before it finished")
        raise
    except Exception as e:
        finish("error", str(e)[:300])
        raise
