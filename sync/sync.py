#!/usr/bin/env python3
# TorBox to storage box sync, v3
# Writes a live status file for the dashboard, listens to the pause button, and skips duplicates:
# - only video and subtitle files get downloaded, no nfo, images, samples or extras
# - if you already have a film or episode in 1080p or better, other copies are skipped whatever there quality
# - if TorBox has several copies of the same thing, only the best one is downloaded

import hashlib
import json
import os
import re
import shutil
import signal
import sqlite3
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
# Off by default. When on, saved files get plain "Title (Year)" names in Movies and TV Shows folders (no release names or torbox folders) and
# have their embedded tags stripped. Kino reads the clean names fine, it matches by title and year or season and episode
CLEAN = os.environ.get("CLEAN_FILES", "0") == "1"
KINO_DB = Path(os.environ.get("KINO_DB", "/var/lib/kino/kino.db"))  # only the rename-existing tool touches it
RENAME_LOG = Path(os.environ.get("RENAME_LOG", "/var/lib/kino/rename-log.jsonl"))
KIND_DIRS = {"torrents", "webdl", "usenet"}
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


HEIGHTS = DEST / ".heights.json"  # remembers each file's picture height, clean names dont say the quality and ffprobe on the whole box every run is slow
HEIGHT_CACHE = {}


def load_heights():
    try:
        HEIGHT_CACHE.update(json.loads(HEIGHTS.read_text()))
    except Exception:
        pass


def save_heights():
    if not HEIGHT_CACHE:
        return
    try:
        tmp = HEIGHTS.with_name(".heights.tmp")
        tmp.write_text(json.dumps(HEIGHT_CACHE))
        tmp.replace(HEIGHTS)
    except OSError:
        pass


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
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in SKIP_DIRS]
        for n in names:
            p = Path(root) / n
            if n.startswith(".") or p.suffix.lower() not in VIDEO_EXT:
                continue
            key, res = media_key(str(p.relative_to(DEST)))
            if not key:
                continue
            if not res:
                try:
                    ck = f"{p.relative_to(DEST)}|{p.stat().st_size}"
                except OSError:
                    continue
                if ck not in HEIGHT_CACHE:
                    h = probe_height(p)  # Name doesnt say the quality, so ffprobe reads it from the file
                    if h:
                        HEIGHT_CACHE[ck] = h  # a failed probe (0) isnt remembered, it is tried again next time
                    res = h
                else:
                    res = HEIGHT_CACHE[ck]
            if res >= have.get(key, (-1, ""))[0]:
                have[key] = (res, n)
    return have


def safe_name(x):
    return re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|]+', " ", str(x))).strip(" .")


def clean_rel(name):
    """Plain path for a file, like Movies/Heat (1995)/Heat (1995).mkv or TV Shows/Fargo/Season 02/Fargo - S02E03.mkv. None means it
    couldnt be worked out, and then the file keeps its normal name"""
    if not guessit:
        return None
    try:
        g = guessit(name)
    except Exception:
        return None
    title = safe_name(first(g.get("title")) or "")
    nt = norm(title)
    # The parser can cut a title short (WALL-E became E, Spider-Man became Man), a plain name made from that would be wrong. The title has to be
    # where the file name begins, and an episode needs a real S01E02 style number (Blade Runner 2049 is not season 20 episode 49)
    if not nt or not any(norm(Path(x).stem).startswith(nt) for x in Path(name).parts):
        return None
    if g.get("type") == "episode" and not re.search(r"[Ss]\d{1,2}[ ._-]?[Ee]\d{1,3}|\b\d{1,2}x\d{2,3}\b|[Ss]eason[ ._-]?\d", name):
        return None
    ext = Path(name).suffix.lower()
    lang = ""
    if ext in SUB_EXT:
        try:
            lang = "." + first(g.get("subtitle_language")).alpha2
            low = name.lower()
            lang += (".forced" if re.search(r"(^|[\W_])forced([\W_]|$)", low) else "") + (".sdh" if re.search(r"(^|[\W_])(sdh|hi)([\W_]|$)", low) else "")
        except Exception:
            lang = ""
    if g.get("type") == "episode":
        se, ep = first(g.get("season")), first(g.get("episode"))
        if se is None or ep is None:
            return None
        return f"TV Shows/{title}/Season {int(se):02d}/{title} - S{int(se):02d}E{int(ep):02d}{lang}{ext}"
    year = first(g.get("year"))
    base = f"{title} ({year})" if year else title
    return f"Movies/{base}/{base}{lang}{ext}"


# A stream title is kept unless it looks like a release name or a site (Kino shows these in the audio and subtitle pickers, like Atmos,
# Director's Commentary or Spanish (Latin America)). Dots between words, underscores, site names, codec/source words and a -GROUP on the end go
RELEASEY = re.compile(r"(www\.|https?:|@|_|\.(com|net|org|to|io|tv|cc|me)\b|[A-Za-z]{2,}\.[A-Za-z]{2,}|\b(bluray|blu-ray|web-?dl|webrip|hdtv|x26[45]|h\.?26[45]|remux|yify|rarbg|ettv|amzn)\b)", re.I)
GROUP_OK = {"hd", "ma", "es", "ex", "x", "he", "lc", "hra"}  # DTS-HD, DTS-ES and so on are not group names
INTRO_RX = re.compile(r"\b(intro|opening|op)\b", re.I)
CREDITS_RX = re.compile(r"\b(credits|ending|outro|ed)\b", re.I)
TAGGABLE = {".mkv", ".mp4", ".m4v", ".mov", ".webm"}  # other containers (avi, ts, wmv) are left alone, remuxing them is where things go wrong


def title_ok(t):
    t = str(t or "").strip()
    if not t or len(t) > 60 or RELEASEY.search(t):
        return False
    m = re.search(r"-([A-Za-z0-9]{2,10})$", t)
    return not (m and m.group(1).lower() not in GROUP_OK)


def strip_tags(path):
    """Remuxes a video without the tags that could say where it came from (title, comment, encoder strings, cover art, odd stream titles).
    What Kino uses stays: audio and subtitle languages, stream titles made only of known words (Atmos, Commentary, SDH), default and forced
    flags, and the chapters (their times always, their titles only when they are an intro or credits, that is how skip intro works).
    Dolby Vision files and other containers are left alone. Any problem and the file is left exactly as it was"""
    if path.suffix.lower() not in TAGGABLE:
        return False
    tmp = path.with_name(".clean-" + path.name)
    meta = path.with_name(".clean-" + path.name + ".txt")
    try:
        pr = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_chapters", "-of", "json", str(path)],
                            capture_output=True, text=True, timeout=300)
        j = json.loads(pr.stdout)
        streams = j.get("streams") or []
        if any("dovi" in json.dumps(st.get("side_data_list") or []).lower() for st in streams):
            print(f"{path.name} is Dolby Vision, tags left alone so it keeps playing in Dolby Vision", flush=True)
            return False
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(path)]
        chapters = j.get("chapters") or []
        lines = [";FFMETADATA1"]
        for c in chapters:
            t = (c.get("tags") or {}).get("title", "")
            keep = t if (INTRO_RX.search(t) or CREDITS_RX.search(t)) else ""
            tb = str(c.get("time_base") or "1/1000").split("/")
            lines += ["[CHAPTER]", f"TIMEBASE={tb[0]}/{tb[1]}", f"START={c['start']}", f"END={c['end']}"] + ([f"title={keep}"] if keep else [])
        if chapters:
            meta.write_text("\n".join(lines) + "\n")
            cmd += ["-i", str(meta)]
        langs, count = [], {"video": 0, "audio": 0, "subtitle": 0}
        for st in streams:
            t = st.get("codec_type")
            if t not in count or (st.get("disposition") or {}).get("attached_pic"):
                continue
            cmd += ["-map", f"0:{st['index']}"]
            tags = st.get("tags") or {}
            if tags.get("language"):
                langs += [f"-metadata:s:{t[0]}:{count[t]}", f"language={tags['language']}"]
            if t != "video" and title_ok(tags.get("title")):
                langs += [f"-metadata:s:{t[0]}:{count[t]}", f"title={tags['title']}"]
            count[t] += 1
        if not count["video"]:
            return False
        cmd += ["-c", "copy", "-map_metadata:g", "-1", "-map_chapters", "1" if chapters else "-1", "-map_metadata:s:v", "-1", "-map_metadata:s:a", "-1",
                "-map_metadata:s:s", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact", *(["-default_mode", "passthrough"] if path.suffix.lower() in (".mkv", ".webm") else []), *langs, str(tmp)]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
        if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < path.stat().st_size * 0.9:
            raise RuntimeError((r.stderr or "ffmpeg failed")[-200:])
        st = path.stat()
        os.utime(tmp, ns=(st.st_atime_ns, st.st_mtime_ns))  # Kino uses the file date for Recently Added and new-episode checks, a rewrite mustnt make it look new
        tmp.replace(path)
        return True
    except Exception as e:
        print(f"couldnt strip tags from {path.name}, left as it was: {e}", flush=True)
        return False
    finally:
        meta.unlink(missing_ok=True)
        tmp.unlink(missing_ok=True)  # gone already after a good run, but a stop (SIGTERM) halfway must not leave it behind


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


def short_id(x):
    return hashlib.sha1(x.encode()).hexdigest()[:16]  # same as kino, its file ids are made from the path, so a renamed file needs its history moved


SKIP_DIRS = {"kino-backups", "kino-recordings"}  # kino keeps its own things in these, they are never renamed (a recording has its path in the database)


def parse_key(rel):
    """What kino will think a file is, kind of title plus year or season and episode, so a rename can be checked not to change it"""
    parts = Path(rel).parts
    if parts and parts[0] in KIND_DIRS:
        parts = parts[1:]
    try:
        g = guessit(str(Path(*parts)))
    except Exception:
        return None
    t = norm(first(g.get("title")) or "")
    if g.get("type") == "episode":
        return ("ep", t, first(g.get("season")), first(g.get("episode")))
    return ("movie", t, first(g.get("year")))


def src_of(rel):
    parts = Path(rel).parts
    return str(Path(*parts[1:])) if parts[0] in KIND_DIRS and len(parts) > 1 else rel


def walk_media(want):
    out = []
    for root, dirs, names in os.walk(DEST):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in SKIP_DIRS]
        for n in names:
            p = Path(root) / n
            if n.startswith(".") or p.suffix.lower() not in want or p.is_symlink():
                continue
            out.append(str(p.relative_to(DEST)))
    return out


def plan_renames():
    """(old rel, new rel) for every video that isnt named plainly yet, plus its subtitles, and the ones left alone with a reason. A subtitle only
    moves together with the video it sits next to, and a name that is already taken leaves the file where it is"""
    vids, subs, skipped, moves, by_dir = walk_media(VIDEO_EXT), walk_media(SUB_EXT), [], [], {}
    taken = {r.lower() for r in vids + subs}  # lower case, so a box that doesnt tell Heat and heat apart is safe too

    def free(new):
        return new.lower() not in taken and not (DEST / new).exists()

    for rel in sorted(vids):
        new = clean_rel(src_of(rel))
        if not new:
            skipped.append((rel, "couldnt work out a safe plain name"))
            continue
        pk = parse_key(rel)
        if pk and pk[0] == "movie" and not pk[2]:
            skipped.append((rel, "no year in the name, so a plain name could be a guess"))
            continue
        if pk != parse_key(new):
            skipped.append((rel, "the new name would change what kino matches it to"))
            continue
        if new != rel:
            if not free(new):
                skipped.append((rel, "a file with the plain name is already there"))
                continue
            taken.add(new.lower())
            moves.append((rel, new))
        by_dir.setdefault(str(Path(rel).parent), []).append((Path(rel).stem, Path(new).stem, str(Path(new).parent)))
    for rel in sorted(subs):
        stem, ext = Path(rel).stem, Path(rel).suffix.lower()
        best = None
        for v in by_dir.get(str(Path(rel).parent), []):
            tail = stem[len(v[0]):]
            if stem.startswith(v[0]) and (not tail or not tail[0].isalnum()) and (best is None or len(v[0]) > len(best[0][0])):
                best = (v, tail)
        if not best:
            skipped.append((rel, "no video it belongs to was renamed, left where it is"))
            continue
        (vs, nstem, ndir), tail = best
        tail = re.sub(r'[\\/:*?"<>|]+', "_", tail)  # what comes after the video's name stays exactly as it was, only characters a path cant have change
        new = str(Path(ndir) / f"{nstem}{tail}{ext}")
        if new != rel:
            if not free(new):
                skipped.append((rel, "a file with the plain name is already there"))
                continue
            taken.add(new.lower())
            moves.append((rel, new))
    return moves, skipped


def migrate_rows(db, old, new):
    """Everything in kino's database that is tied to a file's path"""
    o, n = short_id(old), short_id(new)
    for sql, args in (("UPDATE OR IGNORE watch SET file_id = ? WHERE file_id = ?", (n, o)),
                      ("UPDATE OR IGNORE progress SET file_id = ? WHERE file_id = ?", (n, o)),
                      ("UPDATE OR IGNORE auto_intros SET file_id = ? WHERE file_id = ?", (n, o)),
                      ("UPDATE OR IGNORE media_origin SET rel = ? WHERE rel = ?", (new, old))):
        db.execute(sql, args)


def kino_running():
    try:
        return subprocess.run(["systemctl", "is-active", "--quiet", "kino"], timeout=10).returncode == 0
    except Exception:
        return False


def mark_stripped(rel, old=None):
    """Remembers which files had their tags removed, so a second run doesnt rewrite them all again"""
    f = DEST / ".stripped.json"
    try:
        done = set(json.loads(f.read_text()))
    except Exception:
        done = set()
    if old:
        if old not in done:
            return
        done.discard(old)
    done.add(rel)
    try:
        tmp = f.with_name(".stripped.tmp")
        tmp.write_text(json.dumps(sorted(done)))
        tmp.replace(f)
    except OSError:
        pass


def stripped_set():
    try:
        return set(json.loads((DEST / ".stripped.json").read_text()))
    except Exception:
        return set()


def fix_state(state, by_path, old, new):
    k = by_path.get(os.path.realpath(DEST / old))
    if k and isinstance(state.get(k), dict):
        state[k] = {"path": str(DEST / new), "size": state[k].get("size"), "at": state[k].get("at")}  # the TorBox name and kind go too
        by_path[os.path.realpath(DEST / new)] = k


def rename_existing(apply, strip, recover=False):
    """Renames what is already on the box to plain names. Every rename is written to the log first, and the database is changed in the same step
    as the file (one file at a time), so if it stops half way `--recover` finishes the bookkeeping from the log. Without --apply it only prints
    what it would do"""
    if not guessit:
        sys.exit("guessit isnt installed, cant work out names")
    if REQUIRE_MOUNT and not os.path.ismount(DEST):
        sys.exit(f"{DEST} is not mounted")
    if (apply or recover) and not KINO_DB.is_file():
        sys.exit(f"{KINO_DB} doesnt exist, set KINO_DB to kino's database. Nothing was changed")
    if apply or recover:
        try:
            chk = sqlite3.connect(f"file:{KINO_DB}?mode=ro", uri=True)
            chk.execute("SELECT 1 FROM watch LIMIT 1")
            chk.close()
        except sqlite3.Error as e:
            sys.exit(f"{KINO_DB} doesnt look like kino's database ({e}). Nothing was changed")
        if kino_running() and "--force" not in sys.argv:
            sys.exit("kino is running. Stop it first (systemctl stop kino), it writes watch history under the old names. Nothing was changed")
    try:
        state = json.loads(STATE.read_text())
    except Exception:
        state = {}
    by_path = {os.path.realpath(v.get("path") or ""): k for k, v in state.items() if isinstance(v, dict)}
    if recover:
        db = sqlite3.connect(str(KINO_DB), timeout=60, isolation_level=None)
        n = 0
        try:
            for line in RENAME_LOG.read_text().splitlines():
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                if (DEST / e["new"]).exists() and not (DEST / e["old"]).exists():
                    before = db.total_changes
                    db.execute("BEGIN IMMEDIATE")
                    migrate_rows(db, e["old"], e["new"])
                    db.execute("COMMIT")
                    fix_state(state, by_path, e["old"], e["new"])
                    mark_stripped(e["new"], e["old"])
                    n += db.total_changes > before
        finally:
            db.close()
            if state:
                save_state(state)
        print(f"went through the log, {n} files still had history under the old name and it was moved to the new one")
        return
    moves, skipped = plan_renames()
    for old, why in skipped:
        print(f"leaving {old}: {why}")
    for old, new in moves:
        print(f"{old}  ->  {new}")
    print(f"\n{len(moves)} to rename, {len(skipped)} left alone")
    if not apply:
        print("Nothing changed. Stop kino first (systemctl stop kino) and the sync timer (systemctl stop torbox-sync.timer), back up kino.db, "
              "run again with --apply, then start them again. Add --strip-tags to remove embedded tags as well")
        return
    shutil.copy2(KINO_DB, KINO_DB.with_name(KINO_DB.name + ".pre-rename"))  # a copy of the database from just before, in case something is wrong
    db = sqlite3.connect(str(KINO_DB), timeout=60, isolation_level=None)
    db.execute("PRAGMA busy_timeout = 60000")
    RENAME_LOG.parent.mkdir(parents=True, exist_ok=True)
    done = 0
    signal.signal(signal.SIGTERM, on_term)
    with open(RENAME_LOG, "a") as jf:
        try:
            for old, new in moves:
                src, dst = DEST / old, DEST / new
                jf.write(json.dumps({"old": old, "new": new}) + "\n")  # written before the file moves, so a stop in the middle can be recovered
                jf.flush()
                os.fsync(jf.fileno())
                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    db.execute("BEGIN IMMEDIATE")
                    migrate_rows(db, old, new)
                    src.rename(dst)
                    db.execute("COMMIT")
                except sqlite3.Error as e:
                    try:
                        db.execute("ROLLBACK")
                    except sqlite3.Error:
                        pass
                    print(f"database problem, stopping so nothing gets out of step: {e}")
                    break
                except OSError as e:
                    try:
                        db.execute("ROLLBACK")
                    except sqlite3.Error:
                        pass
                    print(f"failed {old}: {e}")
                    continue
                fix_state(state, by_path, old, new)
                mark_stripped(new, old)
                done += 1
                if done % 25 == 0 and state:
                    save_state(state)
                if strip and dst.suffix.lower() in VIDEO_EXT and new not in stripped_set() and strip_tags(dst):
                    mark_stripped(new)
                d = src.parent
                while d != DEST and DEST in d.parents:  # empty folders left behind, including the old torrents/webdl/usenet ones
                    try:
                        d.rmdir()
                    except OSError:
                        break
                    d = d.parent
        finally:
            db.close()
            if state:
                save_state(state)
    stripped = 0
    if strip:
        have = stripped_set()
        for rel in sorted(walk_media(VIDEO_EXT)):  # files that were already named plainly, or weren't touched by the rename, still get their tags removed
            if rel not in have and (DEST / rel).suffix.lower() in TAGGABLE and strip_tags(DEST / rel):
                mark_stripped(rel)
                stripped += 1
    print(f"\nrenamed {done}{f', removed tags from {stripped} more' if strip else ''}. Every rename is in {RENAME_LOG}. Start kino again and press Rescan Library. "
          f"A copy of the database from before is next to it ({KINO_DB.name}.pre-rename)")


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
    load_heights()
    have = existing_library() if guessit else {}
    save_heights()
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
                if CLEAN:
                    cr = clean_rel(name)
                    if cr:
                        target = (DEST / cr).resolve()  # same-name clashes are sorted out below, once it is known what is really being downloaded
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
    if CLEAN:
        # A file whose plain name is already taken (by another file in this run or one already on the box) keeps its normal name instead, and so do
        # the subtitles of its item. Numbering them (2) would make kino attach subtitles to the wrong copy
        used, fallen, fixed = set(), set(), []
        is_vid = lambda c: Path(c[3].get("name", "")).suffix.lower() in VIDEO_EXT
        for c in [x for x in todo if is_vid(x)] + [x for x in todo if not is_vid(x)]:
            orig = (DEST / c[0] / c[3]["name"].lstrip("/")).resolve()
            t = c[5]
            if t != orig and (t in used or t.exists() or (c[0], c[2]) in fallen):
                t = orig
                fallen.add((c[0], c[2]))
            used.add(t)
            fixed.append(c[:5] + (t,))
        todo = fixed
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
            if CLEAN and target.suffix.lower() in VIDEO_EXT:
                status["message"] = "Removing tags"
                write_status()
                if strip_tags(target):
                    mark_stripped(str(target.relative_to(DEST)))
                status["message"] = None
            # Which TorBox item it came from and when, so the dashboard can show where a file came from and the delete list can
            # tell a new download from an old one
            state[key] = {"path": str(target), "size": f.get("size", 0), "at": time.time()}
            if not CLEAN:  # clean mode keeps the TorBox name and kind off the box, the key is all kino needs
                state[key].update(item=f.get("_item"), kind=kind)
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
    if "--rename-existing" in sys.argv:
        rename_existing("--apply" in sys.argv, "--strip-tags" in sys.argv, "--recover" in sys.argv)
        sys.exit(0)
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
