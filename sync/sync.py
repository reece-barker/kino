#!/usr/bin/env python3
# TorBox to storage box sync, v2
# Same as before but it now writes a live status file for the dashboard and listens to the pause button

import json
import os
import shutil
import signal
import sys
import time
from pathlib import Path

import requests

API = os.environ.get("TORBOX_API", "https://api.torbox.app/v1/api")  # Only changed for testing
KEY = os.environ["TORBOX_API_KEY"]
DEST = Path(os.environ.get("TORBOX_DEST", "/srv/torbox")).resolve()
STATE = DEST / ".state.json"
STATUS = Path(os.environ.get("SYNC_STATUS", "/var/lib/torbox-sync/status.json"))
PAUSE = Path(os.environ.get("PAUSE_FILE", "/var/lib/kino/pause.json"))
REQUIRE_MOUNT = os.environ.get("REQUIRE_MOUNT", "1") == "1"
MIN_FREE = 20 * 1024**3  # Keeps 20gb free so the storage box dosent fill up compleatly

# Kind of download and the name of the id param that requestdl wants for it
KINDS = [("torrents", "torrent_id"), ("webdl", "web_id"), ("usenet", "usenet_id")]

s = requests.Session()
s.headers["Authorization"] = f"Bearer {KEY}"

# Everything the dashboard shows comes from this dict
status = {"state": "starting", "pid": os.getpid(), "run_started": time.time(), "current": None,
          "queue_total": 0, "queue_done": 0, "new": 0, "failed": [], "recent": [], "last_run": None,
          "message": None, "updated": time.time()}


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
                          "failed": len(status["failed"]), "result": result, "message": message}
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

    # Builds the full todo list first so the dashboard can show "3 of 12"
    todo = []
    for kind, id_param in KINDS:
        for item in list_items(kind):
            # Skip stuff thats still downloading or already gone from torbox
            if not (item.get("download_finished") and item.get("download_present")):
                continue
            for f in item.get("files") or []:
                key = f"{kind}:{item['id']}:{f['id']}"
                if key in state:
                    continue
                target = (DEST / kind / f["name"].lstrip("/")).resolve()
                # Makes sure a weird filename cant write outside of the dest folder
                if DEST not in target.parents:
                    print(f"skipping suspicious path: {f['name']}")
                    continue
                todo.append((kind, id_param, item["id"], f, key, target))

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
            state[key] = {"path": str(target), "size": f.get("size", 0)}
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
