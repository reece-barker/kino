#!/usr/bin/env python3
# kino dashboard, shows the torbox sync status, the vps stats and the whole library on the storage box
# with a player, runs behind nginx on 127.0.0.1 only so its never open to the internet directly
#
# Run as cli to manage users:
#   python3 app.py adduser NAME --role admin|viewer
#   python3 app.py passwd NAME
#   python3 app.py deluser NAME
#   python3 app.py users

import argparse
import asyncio
import getpass
import hashlib
import hmac
import html
import json
import logging
import os
import re
import secrets
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote, urlparse

import httpx
import psutil
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles


def env(name, default):
    return os.environ.get(name, default)


MEDIA_DIR = Path(env("MEDIA_DIR", "/srv/torbox"))
DATA_DIR = Path(env("DATA_DIR", "/var/lib/kino"))
SYNC_STATUS = Path(env("SYNC_STATUS", "/var/lib/torbox-sync/status.json"))
PAUSE_FILE = Path(env("PAUSE_FILE", str(DATA_DIR / "pause.json")))
SYNC_UNIT = env("SYNC_UNIT", "torbox-sync.service")
TIMER_UNIT = env("TIMER_UNIT", "torbox-sync.timer")
SECRET = env("KINO_SECRET", "").encode()
COOKIE_SECURE = env("COOKIE_SECURE", "1") == "1"
CINEMETA = env("CINEMETA_URL", "https://v3-cinemeta.strem.io")
OFFLINE_META = env("OFFLINE_META", "0") == "1"  # Only for testing without internet
MAX_FFMPEG = int(env("MAX_FFMPEG", "3"))
RESCAN_MINUTES = int(env("RESCAN_MINUTES", "10"))
STATIC = Path(__file__).parent / "static"

VIDEO_EXT = {".mkv", ".mp4", ".m4v", ".avi", ".mov", ".webm", ".ts", ".wmv"}
SUB_EXT = {".srt", ".vtt"}
TEXT_SUB_CODECS = {"subrip", "ass", "ssa", "mov_text", "webvtt", "text"}
KIND_DIRS = {"torrents", "webdl", "usenet"}
# Only these hosts can be fetched by the image proxy, otherwise someone could use it to reach random urls
IMG_HOSTS = {"images.metahub.space", "episodes.metahub.space", "live.metahub.space",
             "m.media-amazon.com", "image.tmdb.org"}
SESSION_DAYS = 30

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("kino")
logging.getLogger("httpx").setLevel(logging.WARNING)  # Otherwise every cinemeta request spams the log

LANGS = {"en": "English", "eng": "English", "de": "German", "ger": "German", "deu": "German", "fr": "French", "fre": "French",
         "fra": "French", "es": "Spanish", "spa": "Spanish", "it": "Italian", "ita": "Italian", "nl": "Dutch", "dut": "Dutch",
         "nld": "Dutch", "pl": "Polish", "pol": "Polish", "pt": "Portuguese", "por": "Portuguese", "ru": "Russian", "rus": "Russian",
         "ja": "Japanese", "jpn": "Japanese", "ko": "Korean", "kor": "Korean", "zh": "Chinese", "chi": "Chinese", "zho": "Chinese",
         "sv": "Swedish", "swe": "Swedish", "da": "Danish", "dan": "Danish", "no": "Norwegian", "nor": "Norwegian",
         "fi": "Finnish", "fin": "Finnish", "tr": "Turkish", "tur": "Turkish", "ar": "Arabic", "ara": "Arabic", "cs": "Czech",
         "cze": "Czech", "hu": "Hungarian", "hun": "Hungarian", "el": "Greek", "gre": "Greek", "he": "Hebrew", "heb": "Hebrew"}


def lang_name(code):
    return LANGS.get(str(code or "").lower().strip(), str(code or "").upper())

# ---------------------------------------------------------------- database

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, pw TEXT NOT NULL, role TEXT NOT NULL, created REAL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT, created REAL, expires REAL, ip TEXT, ua TEXT);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, data TEXT, fetched REAL);
CREATE TABLE IF NOT EXISTS probe (path TEXT PRIMARY KEY, size INTEGER, mtime REAL, data TEXT);
CREATE TABLE IF NOT EXISTS progress (username TEXT, file_id TEXT, pos REAL, dur REAL, updated REAL, PRIMARY KEY (username, file_id));
"""


class DB:
    def __init__(self, path):
        self.lock = threading.Lock()
        self.c = sqlite3.connect(str(path), check_same_thread=False)
        self.c.row_factory = sqlite3.Row
        self.c.execute("PRAGMA journal_mode=WAL")
        self.c.executescript(SCHEMA)

    def q(self, sql, args=()):
        with self.lock:
            cur = self.c.execute(sql, args)
            rows = cur.fetchall()
            self.c.commit()
            return rows


_db = None


def db():
    global _db
    if _db is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _db = DB(DATA_DIR / "kino.db")
    return _db


# ---------------------------------------------------------------- passwords and sessions

def hash_pw(pw):
    salt = secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt$16384$8$1${salt.hex()}${h.hex()}"


def check_pw(pw, stored):
    try:
        _, n, r, p, salt, h = stored.split("$")
        got = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=len(h) // 2)
        return hmac.compare_digest(got.hex(), h)
    except Exception:
        return False


# Used when the username dosent exist so the response takes the same time and you cant guess usernames
DUMMY_HASH = hash_pw(secrets.token_hex(8))
FAILS = {}  # ip -> times of failed logins


def too_many_fails(ip):
    d = FAILS.get(ip)
    if not d:
        return False
    now = time.time()
    while d and d[0] < now - 900:
        d.popleft()
    return len(d) >= 5


def tok_hash(tok):
    return hashlib.sha256(tok.encode()).hexdigest()


def client_ip(request):
    # nginx sets this, the app only listens on localhost so it cant be faked from outside
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "?")


def current_user(request: Request):
    tok = request.cookies.get("kino")
    if not tok:
        raise HTTPException(401, "Sign in to continue")
    rows = db().q("SELECT s.username, s.expires, u.role FROM sessions s JOIN users u ON u.username = s.username "
                  "WHERE s.token_hash = ?", (tok_hash(tok),))
    if not rows or rows[0]["expires"] < time.time():
        raise HTTPException(401, "Your session ended, sign in again")
    return {"username": rows[0]["username"], "role": rows[0]["role"]}


def require_admin(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Only admins can do that")
    return user


def sign(*parts):
    return hmac.new(SECRET, ":".join(str(p) for p in parts).encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------- library scan

LIB = {"titles": {}, "files": {}, "scanned_at": 0, "scanning": False, "error": None}


def short_id(s):
    return hashlib.sha1(s.encode()).hexdigest()[:16]


def first(v):
    return v[0] if isinstance(v, list) and v else v


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def guess(rel):
    from guessit import guessit
    parts = Path(rel).parts
    # Drop the torrents/webdl/usenet folder so guessit dosent think its part of the title
    if parts and parts[0] in KIND_DIRS:
        parts = parts[1:]
    try:
        return dict(guessit(str(Path(*parts)) if parts else rel))
    except Exception:
        return {"title": Path(rel).stem}


def title_key(kind, name, year):
    k = f"{kind}:{norm(name)}"
    if kind == "movie" and year:
        k += f":{year}"
    return k


def sub_label(video_stem, sub_path):
    rest = sub_path.stem
    if rest.lower().startswith(video_stem.lower()):
        rest = rest[len(video_stem):]
    rest = rest.strip(" ._-") or sub_path.parent.name
    rest = rest.replace("_", " ").replace(".", " ").strip()
    return LANGS.get(rest.lower(), rest) or "Subtitles"


def scan_fs():
    if not MEDIA_DIR.is_dir():
        raise RuntimeError(f"{MEDIA_DIR} isnt reachable, check the Storage Box mount")
    vids, subs = [], {}
    for root, dirs, names in os.walk(MEDIA_DIR):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for n in names:
            if n.startswith(".") or n.endswith(".part"):
                continue
            p = Path(root) / n
            ext = p.suffix.lower()
            if ext in SUB_EXT:
                subs.setdefault(root, []).append(p)
            elif ext in VIDEO_EXT:
                vids.append(p)

    files, titles = {}, {}
    for p in vids:
        try:
            st = p.stat()
        except OSError:
            continue
        # Skip the little sample clips that come with some releases
        if "sample" in p.name.lower() and st.st_size < 400 * 1024**2:
            continue
        rel = str(p.relative_to(MEDIA_DIR))
        g = guess(rel)
        kind = "series" if g.get("type") == "episode" else "movie"
        name = str(first(g.get("title")) or p.stem)
        year = first(g.get("year"))
        key = title_key(kind, name, year)
        tid = short_id(key)
        fid = short_id(rel)

        # Subtitle files next to the video or in a Subs folder
        here = subs.get(str(p.parent), []) + subs.get(str(p.parent / "Subs"), []) + subs.get(str(p.parent / "subs"), [])
        same_dir_videos = [v for v in vids if v.parent == p.parent]
        ext_subs = []
        for s in here:
            if len(same_dir_videos) > 1 and s.parent == p.parent and not s.stem.lower().startswith(p.stem.lower()):
                continue
            ext_subs.append({"id": "x" + short_id(str(s))[:8], "label": sub_label(p.stem, s), "path": str(s)})

        files[fid] = {
            "id": fid, "rel": rel, "path": str(p), "name": p.name, "size": st.st_size, "mtime": st.st_mtime,
            "title_id": tid, "season": first(g.get("season")), "episode": first(g.get("episode")),
            "quality": g.get("screen_size"), "ext_subs": ext_subs,
        }
        t = titles.setdefault(tid, {"id": tid, "key": key, "kind": kind, "guess_name": name, "year": year,
                                    "files": [], "added": 0, "size": 0})
        t["files"].append(fid)
        t["added"] = max(t["added"], st.st_mtime)
        t["size"] += st.st_size
    for t in titles.values():
        t["files"].sort(key=lambda f: (files[f]["season"] or 0, files[f]["episode"] or 0, files[f]["name"]))
    return files, titles


# ---------------------------------------------------------------- metadata from cinemeta

def poster_for(m):
    i = m.get("id", "")
    return f"https://images.metahub.space/poster/medium/{i}/img" if i.startswith("tt") else m.get("poster")


def unesc(v):
    # Cinemeta sometimes sends names like O&apos;Dea, this turns them back into normal text
    if isinstance(v, str):
        return html.unescape(v)
    if isinstance(v, list):
        return [unesc(x) for x in v]
    return v


def slim_meta(m, kind):
    m = {k: unesc(v) if k in ("name", "description", "cast", "director", "genres", "genre") else v for k, v in m.items()}
    i = m.get("id", "")
    vids = []
    for v in m.get("videos") or []:
        if v.get("season") is None:
            continue
        vids.append({"season": v.get("season"), "episode": v.get("episode") or v.get("number"),
                     "name": unesc(v.get("name") or v.get("title")), "overview": unesc(v.get("overview") or v.get("description")),
                     "thumbnail": v.get("thumbnail"), "released": v.get("released")})
    return {
        "id": i, "kind": kind, "name": m.get("name"), "description": m.get("description"),
        "genres": m.get("genres") or m.get("genre") or [], "releaseInfo": m.get("releaseInfo") or m.get("year"),
        "runtime": m.get("runtime"), "rating": m.get("imdbRating"), "cast": (m.get("cast") or [])[:10],
        "director": m.get("director"), "poster": poster_for(m),
        "background": m.get("background") or (f"https://images.metahub.space/background/medium/{i}/img" if i.startswith("tt") else None),
        "logo": m.get("logo") or (f"https://images.metahub.space/logo/medium/{i}/img" if i.startswith("tt") else None),
        "videos": vids,
    }


async def cinemeta_lookup(client, kind, name, year):
    r = await client.get(f"{CINEMETA}/catalog/{kind}/top/search={quote(name)}.json", timeout=20)
    r.raise_for_status()
    metas = r.json().get("metas") or []
    pick = None
    if year:
        for m in metas:
            ri = str(m.get("releaseInfo") or "")
            if ri[:4].isdigit() and abs(int(ri[:4]) - int(year)) <= 1:
                pick = m
                break
    pick = pick or (metas[0] if metas else None)
    if not pick:
        return None
    r = await client.get(f"{CINEMETA}/meta/{kind}/{pick['id']}.json", timeout=20)
    full = (r.json().get("meta") if r.status_code == 200 else None) or pick
    return slim_meta(full, kind)


def cached_meta(key):
    rows = db().q("SELECT data, fetched FROM meta WHERE key = ?", (key,))
    if not rows:
        return None, 0
    return json.loads(rows[0]["data"]), rows[0]["fetched"]


async def ensure_meta(keys):
    """Looks up metadata for title keys that arent cached yet, one at a time so cinemeta isnt hammered"""
    if OFFLINE_META:
        return
    async with httpx.AsyncClient(headers={"User-Agent": "kino-dashboard"}) as client:
        for key, kind, name, year in keys:
            data, fetched = cached_meta(key)
            age = time.time() - fetched
            # Found entries are kept a week, not found ones are retried after a day
            if data is not None and (age < 7 * 86400 if data.get("id") else age < 86400):
                continue
            try:
                m = await cinemeta_lookup(client, kind, name, year)
            except Exception as e:
                log.warning("cinemeta lookup failed for %s: %s", name, e)
                continue
            db().q("INSERT OR REPLACE INTO meta VALUES (?,?,?)", (key, json.dumps(m or {"none": True}), time.time()))
            await asyncio.sleep(0.3)


async def rescan():
    if LIB["scanning"]:
        return
    LIB["scanning"] = True
    try:
        files, titles = await asyncio.to_thread(scan_fs)
        LIB.update(files=files, titles=titles, scanned_at=time.time(), error=None)
        await ensure_meta([(t["key"], t["kind"], t["guess_name"], t["year"]) for t in titles.values()])
    except Exception as e:
        LIB["error"] = str(e)
        log.warning("scan failed: %s", e)
    finally:
        LIB["scanning"] = False


# ---------------------------------------------------------------- ffprobe

def run_probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
                         capture_output=True, timeout=120)
    j = json.loads(out.stdout or b"{}")
    fmt = j.get("format") or {}
    video, audio, subs = None, [], []
    a_i = s_i = 0
    for s in j.get("streams") or []:
        t = s.get("codec_type")
        tags = s.get("tags") or {}
        if t == "video" and video is None and (s.get("disposition") or {}).get("attached_pic") != 1:
            video = {"codec": s.get("codec_name"), "width": s.get("width"), "height": s.get("height"),
                     "transfer": s.get("color_transfer"), "profile": s.get("profile"),
                     "dovi": any("DOVI" in str(sd.get("side_data_type", "")) or "Dolby Vision" in str(sd.get("side_data_type", ""))
                                 for sd in s.get("side_data_list") or [])}
        elif t == "audio":
            audio.append({"n": a_i, "codec": s.get("codec_name"), "channels": s.get("channels"),
                          "profile": s.get("profile"), "lang": tags.get("language"), "title": tags.get("title"),
                          "default": (s.get("disposition") or {}).get("default") == 1})
            a_i += 1
        elif t == "subtitle":
            subs.append({"index": s.get("index"), "n": s_i, "codec": s.get("codec_name"),
                         "lang": tags.get("language"), "title": tags.get("title")})
            s_i += 1
    return {"duration": float(fmt.get("duration") or 0), "container": fmt.get("format_name", ""),
            "video": video, "audio": audio, "subs": subs}


async def get_probe(f):
    rows = db().q("SELECT size, mtime, data FROM probe WHERE path = ?", (f["path"],))
    if rows and rows[0]["size"] == f["size"] and abs(rows[0]["mtime"] - f["mtime"]) < 1:
        return json.loads(rows[0]["data"])
    data = await asyncio.to_thread(run_probe, f["path"])
    db().q("INSERT OR REPLACE INTO probe VALUES (?,?,?,?)", (f["path"], f["size"], f["mtime"], json.dumps(data)))
    return data


def cached_probe(f):
    rows = db().q("SELECT size, data FROM probe WHERE path = ?", (f["path"],))
    if rows and rows[0]["size"] == f["size"]:
        return json.loads(rows[0]["data"])
    return None


def badges(p):
    if not p or not p.get("video"):
        return []
    v, out = p["video"], []
    w = v.get("width") or 0
    out.append("4K" if w >= 3800 else "HD" if w >= 1270 else "SD")
    if v.get("dovi"):
        out.append("Dolby Vision")
    elif v.get("transfer") in ("smpte2084", "arib-std-b67"):
        out.append("HDR")
    a = next((x for x in p["audio"] if x.get("default")), p["audio"][0] if p["audio"] else None)
    if a:
        if "atmos" in str(a.get("profile") or "").lower() or "atmos" in str(a.get("title") or "").lower():
            out.append("Dolby Atmos")
        elif (a.get("channels") or 0) >= 6:
            out.append("5.1" if a["channels"] < 8 else "7.1")
    if p.get("subs"):
        out.append("CC")
    return out


async def probe_worker():
    # Slowly probes every file in the background so the badges show up without opening each one
    while True:
        try:
            for f in list(LIB["files"].values()):
                if cached_probe(f) is None:
                    try:
                        await get_probe(f)
                    except Exception as e:
                        log.info("probe failed for %s: %s", f["name"], e)
                    await asyncio.sleep(1)
        except Exception as e:
            log.warning("probe worker: %s", e)
        await asyncio.sleep(60)


# ---------------------------------------------------------------- vps stats

STATS = {"hist": deque(maxlen=120), "procs": [], "last_net": None, "last_disk": None}
PROC_CACHE = {}


def disk(path):
    try:
        u = shutil.disk_usage(path)
        return {"total": u.total, "used": u.total - u.free, "free": u.free}
    except Exception:
        return None


def sample_stats():
    now = time.time()
    net = psutil.net_io_counters()
    dio = psutil.disk_io_counters()
    rx = tx = rd = wr = 0.0
    if STATS["last_net"]:
        t0, n0, d0 = STATS["last_net"]
        dt = max(now - t0, 0.001)
        rx, tx = (net.bytes_recv - n0.bytes_recv) / dt, (net.bytes_sent - n0.bytes_sent) / dt
        if dio and d0:
            rd, wr = (dio.read_bytes - d0.read_bytes) / dt, (dio.write_bytes - d0.write_bytes) / dt
    STATS["last_net"] = (now, net, dio)
    vm = psutil.virtual_memory()
    STATS["hist"].append({"t": now, "cpu": psutil.cpu_percent(None), "mem": vm.percent,
                          "rx": rx, "tx": tx, "rd": rd, "wr": wr})

    # Top processes by cpu, keeps the process objects so cpu_percent has something to compare to
    seen = {}
    for p in psutil.process_iter(["pid", "name", "username", "memory_info"]):
        proc = PROC_CACHE.get(p.pid) or p
        try:
            cpu = proc.cpu_percent(None)
            seen[p.pid] = proc
            mi = p.info.get("memory_info")
            seen_info = {"pid": p.pid, "name": p.info.get("name"), "user": p.info.get("username"),
                         "cpu": cpu, "mem": mi.rss if mi else 0}
            proc._kino = seen_info
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    PROC_CACHE.clear()
    PROC_CACHE.update(seen)
    infos = [getattr(p, "_kino", None) for p in seen.values()]
    infos = [i for i in infos if i]
    STATS["procs"] = sorted(infos, key=lambda i: i["cpu"], reverse=True)[:6]


async def stats_worker():
    psutil.cpu_percent(None)
    while True:
        try:
            await asyncio.to_thread(sample_stats)
        except Exception as e:
            log.warning("stats: %s", e)
        await asyncio.sleep(3)


# ---------------------------------------------------------------- sync control

def systemctl_show():
    try:
        out = subprocess.run(["systemctl", "show", SYNC_UNIT, TIMER_UNIT, "--timestamp=unix", "-p",
                              "ActiveState,SubState,Result,ExecMainStartTimestamp,ExecMainExitTimestamp,"
                              "NextElapseUSecRealtime,LastTriggerUSec"],
                             capture_output=True, text=True, timeout=8).stdout
    except Exception as e:
        return {"error": str(e)}, {}
    blocks = out.strip().split("\n\n")

    def parse(b):
        d = {}
        for line in b.splitlines():
            k, _, v = line.partition("=")
            if v.startswith("@"):
                try:
                    v = int(v[1:])
                except ValueError:
                    pass
            d[k] = v
        return d

    svc = parse(blocks[0]) if blocks else {}
    tmr = parse(blocks[1]) if len(blocks) > 1 else {}
    return svc, tmr


def read_json(p):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return None


def pause_state():
    p = read_json(PAUSE_FILE)
    if p and p.get("until", 0) > time.time():
        return p
    return None


def systemctl(*args):
    r = subprocess.run(["systemctl", *args], capture_output=True, text=True, timeout=15)
    if r.returncode != 0:
        raise HTTPException(500, (r.stderr or r.stdout or "systemctl failed").strip()[:300])


# ---------------------------------------------------------------- hls playback sessions

HLS_DIR = DATA_DIR / "hls"
SUBS_DIR = DATA_DIR / "subs"
SESS = {}
SUB_JOBS = {}
FF_INFO = {"burst": False}


def ffmpeg_supports_burst():
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-h", "full"], capture_output=True, text=True, timeout=20).stdout
        return "readrate_initial_burst" in out
    except Exception:
        return False


def kill_session(sid):
    s = SESS.pop(sid, None)
    if not s:
        return
    try:
        if s["proc"].returncode is None:
            s["proc"].kill()
    except ProcessLookupError:
        pass
    shutil.rmtree(s["dir"], ignore_errors=True)


async def session_reaper():
    # Kills players nobody is watching anymore and deletes there temp files
    while True:
        await asyncio.sleep(15)
        for sid, s in list(SESS.items()):
            if time.time() - s["last"] > 90:
                kill_session(sid)


# ---------------------------------------------------------------- app

@asynccontextmanager
async def lifespan(app):
    db()
    if not SECRET:
        log.warning("KINO_SECRET is empty, set it in /etc/kino/kino.env")
    shutil.rmtree(HLS_DIR, ignore_errors=True)
    HLS_DIR.mkdir(parents=True, exist_ok=True)
    SUBS_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "img").mkdir(parents=True, exist_ok=True)
    FF_INFO["burst"] = await asyncio.to_thread(ffmpeg_supports_burst)

    async def scanner():
        while True:
            await rescan()
            await asyncio.sleep(RESCAN_MINUTES * 60)

    tasks = [asyncio.create_task(c()) for c in (scanner, stats_worker, session_reaper, probe_worker)]
    yield
    for t in tasks:
        t.cancel()
    for sid in list(SESS):
        kill_session(sid)


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

CSP = ("default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; "
       "script-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")


@app.middleware("http")
async def guard(request: Request, call_next):
    # Every change request needs this header, other websites cant add it so they cant trick your browser into doing stuff
    if request.method in ("POST", "PUT", "DELETE") and request.headers.get("x-kino") != "1":
        return JSONResponse({"detail": "Missing request header"}, status_code=403)
    resp = await call_next(request)
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/") and "cache-control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store"
    return resp


# ---- auth

@app.post("/api/login")
async def login(request: Request):
    ip = client_ip(request)
    if too_many_fails(ip):
        log.warning("kino login blocked ip=%s", ip)
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    body = await request.json()
    user = str(body.get("username", "")).strip().lower()[:64]
    pw = str(body.get("password", ""))[:256]
    rows = db().q("SELECT pw FROM users WHERE username = ?", (user,))
    ok = await asyncio.to_thread(check_pw, pw, rows[0]["pw"] if rows else DUMMY_HASH)
    if not rows or not ok:
        FAILS.setdefault(ip, deque()).append(time.time())
        # fail2ban watches for this exact line
        log.warning("kino login failed user=%s ip=%s", user, ip)
        raise HTTPException(401, "That username and password dont match")
    FAILS.pop(ip, None)
    tok = secrets.token_urlsafe(32)
    exp = time.time() + SESSION_DAYS * 86400
    db().q("INSERT INTO sessions VALUES (?,?,?,?,?,?)",
           (tok_hash(tok), user, time.time(), exp, ip, request.headers.get("user-agent", "")[:200]))
    db().q("DELETE FROM sessions WHERE expires < ?", (time.time(),))
    log.info("kino login ok user=%s ip=%s", user, ip)
    resp = JSONResponse({"ok": True})
    resp.set_cookie("kino", tok, max_age=SESSION_DAYS * 86400, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/")
    return resp


@app.post("/api/logout")
async def logout(request: Request):
    tok = request.cookies.get("kino")
    if tok:
        db().q("DELETE FROM sessions WHERE token_hash = ?", (tok_hash(tok),))
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("kino", path="/")
    return resp


@app.get("/api/me")
async def me(user=Depends(current_user)):
    return user


# ---- library

def title_summary(t, meta):
    m = meta or {}
    return {
        "id": t["id"], "kind": t["kind"], "name": m.get("name") or t["guess_name"], "year": t["year"],
        "releaseInfo": m.get("releaseInfo") or t["year"], "poster": m.get("poster"), "background": m.get("background"),
        "logo": m.get("logo"), "genres": m.get("genres") or [], "rating": m.get("rating"), "runtime": m.get("runtime"),
        "description": m.get("description"), "added": t["added"], "count": len(t["files"]), "size": t["size"],
        "matched": bool(m.get("id")),
    }


def meta_for(t):
    m, _ = cached_meta(t["key"])
    return m if m and m.get("id") else None


@app.get("/api/library")
async def library(user=Depends(current_user)):
    titles = [title_summary(t, meta_for(t)) for t in LIB["titles"].values()]
    titles.sort(key=lambda x: x["added"], reverse=True)
    rows = db().q("SELECT file_id, pos, dur, updated FROM progress WHERE username = ? ORDER BY updated DESC LIMIT 30",
                  (user["username"],))
    cont = []
    for r in rows:
        f = LIB["files"].get(r["file_id"])
        if not f or not r["dur"] or not (0.02 < r["pos"] / r["dur"] < 0.93):
            continue
        t = LIB["titles"].get(f["title_id"])
        if not t:
            continue
        s = title_summary(t, meta_for(t))
        s.update(file_id=f["id"], pos=r["pos"], dur=r["dur"], season=f["season"], episode=f["episode"])
        cont.append(s)
    return {"titles": titles, "continue": cont[:12], "scanned_at": LIB["scanned_at"], "scanning": LIB["scanning"],
            "error": LIB["error"], "files": len(LIB["files"])}


@app.get("/api/title/{tid}")
async def title(tid: str, user=Depends(current_user)):
    t = LIB["titles"].get(tid)
    if not t:
        raise HTTPException(404, "That title isnt in the library anymore")
    meta = meta_for(t)
    prog = {r["file_id"]: {"pos": r["pos"], "dur": r["dur"], "updated": r["updated"]} for r in
            db().q("SELECT file_id, pos, dur, updated FROM progress WHERE username = ?", (user["username"],))}
    eps = {(v["season"], v["episode"]): v for v in (meta or {}).get("videos", [])}
    files = []
    for fid in t["files"]:
        f = LIB["files"][fid]
        p = cached_probe(f)
        ep = eps.get((f["season"], f["episode"])) or {}
        files.append({"id": fid, "name": f["name"], "size": f["size"], "season": f["season"], "episode": f["episode"],
                      "ep_name": ep.get("name"), "ep_overview": ep.get("overview"), "thumbnail": ep.get("thumbnail"),
                      "duration": p["duration"] if p else None, "badges": badges(p), "progress": prog.get(fid)})
    out = title_summary(t, meta)
    out.update(files=files, cast=(meta or {}).get("cast", []), director=(meta or {}).get("director"))
    return out


@app.post("/api/library/rescan")
async def library_rescan(user=Depends(require_admin)):
    asyncio.create_task(rescan())
    return {"ok": True}


def file_or_404(fid):
    f = LIB["files"].get(fid)
    if not f:
        raise HTTPException(404, "That file isnt in the library anymore")
    return f


@app.get("/api/file/{fid}")
async def file_info(fid: str, user=Depends(current_user)):
    f = file_or_404(fid)
    try:
        p = await get_probe(f)
    except Exception as e:
        raise HTTPException(500, f"Couldnt read the file: {e}")
    v = p.get("video") or {}
    a = next((x for x in p["audio"] if x.get("default")), p["audio"][0] if p["audio"] else None)
    direct = ("mp4" in p["container"] or "mov" in p["container"]) and v.get("codec") in ("h264", "hevc") \
        and (a is None or a.get("codec") in ("aac", "mp3"))
    subs = [{"id": s["id"], "label": s["label"], "kind": "file"} for s in f["ext_subs"]]
    for s in p["subs"]:
        if s["codec"] in TEXT_SUB_CODECS:
            label = s.get("title") or (lang_name(s["lang"]) if s.get("lang") else "") or f"Track {s['n'] + 1}"
            subs.append({"id": f"e{s['index']}", "label": label, "kind": "embedded",
                         "ready": (SUBS_DIR / f"{fid}_{s['index']}.vtt").exists()})
    # Two tracks called English look the same in the menu, so the separate file ones get marked
    seen = {}
    for s in subs:
        seen[s["label"]] = seen.get(s["label"], 0) + 1
    for s in subs:
        if seen[s["label"]] > 1 and s["kind"] == "file":
            s["label"] += " (separate file)"
    exp = int(time.time()) + 6 * 3600
    dl = f"/api/dl/{fid}?u={quote(user['username'])}&exp={exp}&sig={sign(fid, user['username'], exp)}"
    row = db().q("SELECT pos FROM progress WHERE username = ? AND file_id = ?", (user["username"], fid))
    return {"id": fid, "name": f["name"], "size": f["size"], "duration": p["duration"], "video": v,
            "audio": [{"n": x["n"], "label": " ".join(str(y) for y in (x.get("title") or lang_name(x.get("lang")),
                                                                          x.get("codec", "").upper(),
                                                                          f"{x.get('channels')}ch") if y)}
                      for x in p["audio"]],
            "default_audio": a["n"] if a else 0, "direct": direct, "subs": subs, "badges": badges(p),
            "download": dl, "resume": row[0]["pos"] if row else 0, "season": f["season"], "episode": f["episode"],
            "title_id": f["title_id"]}


MIME = {".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".mkv": "video/x-matroska",
        ".webm": "video/webm", ".avi": "video/x-msvideo", ".ts": "video/mp2t", ".wmv": "video/x-ms-wmv"}


def range_response(path, request, download_name=None):
    size = os.path.getsize(path)
    start, end, status = 0, size - 1, 200
    rng = request.headers.get("range")
    if rng:
        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        if m:
            s, e = m.groups()
            if s == "" and e:
                start = max(0, size - int(e))
            elif s:
                start = int(s)
                end = int(e) if e else size - 1
            end = min(end, size - 1)
            if start > end:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
            status = 206

    def gen():
        with open(path, "rb") as fh:
            fh.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = fh.read(min(1 << 20, left))
                if not chunk:
                    break
                left -= len(chunk)
                yield chunk

    headers = {"Accept-Ranges": "bytes", "Content-Length": str(end - start + 1), "Cache-Control": "private, max-age=3600"}
    if status == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    if download_name:
        headers["Content-Disposition"] = "attachment; filename*=UTF-8''" + quote(download_name)
    return StreamingResponse(gen(), status_code=status, headers=headers,
                             media_type=MIME.get(Path(path).suffix.lower(), "application/octet-stream"))


@app.get("/api/stream/{fid}/direct")
async def stream_direct(fid: str, request: Request, user=Depends(current_user)):
    return range_response(file_or_404(fid)["path"], request)


@app.get("/api/dl/{fid}")
async def download(fid: str, u: str, exp: int, sig: str, request: Request):
    # Signed link so it works in vlc or a download manager without the login cookie, runs out after 6 hours
    if exp < time.time() or not hmac.compare_digest(sig, sign(fid, u, exp)):
        raise HTTPException(403, "This link ran out, get a new one from the dashboard")
    if not db().q("SELECT 1 FROM users WHERE username = ?", (u,)):
        raise HTTPException(403, "This link isnt valid anymore")
    f = file_or_404(fid)
    return range_response(f["path"], request, download_name=f["name"] if request.query_params.get("save") else None)


@app.post("/api/play/{fid}")
async def play_start(fid: str, request: Request, user=Depends(current_user)):
    f = file_or_404(fid)
    body = await request.json()
    t = max(0.0, float(body.get("t") or 0))
    a = int(body.get("audio") or 0)
    p = await get_probe(f)
    v = p.get("video")
    if not v:
        raise HTTPException(415, "This file has no video track")

    # One player per person, starting a new one stops there old one
    for sid, s in list(SESS.items()):
        if s["user"] == user["username"]:
            kill_session(sid)
    if len(SESS) >= MAX_FFMPEG:
        raise HTTPException(429, "Too many people are watching right now, try again in a minute")

    codec = v.get("codec")
    if codec in ("h264", "hevc", "av1", "vp9"):
        vargs = ["-c:v", "copy"] + (["-tag:v", "hvc1"] if codec == "hevc" else [])
    elif (v.get("height") or 9999) <= 1080:
        # Old codecs like xvid get converted, only up to 1080p cause the vps has no gpu
        vargs = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p"]
    else:
        raise HTTPException(415, f"{codec} video above 1080p cant be converted on this server, use Download instead")

    sid = secrets.token_hex(8)
    out = HLS_DIR / sid
    out.mkdir(parents=True)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin"]
    if FF_INFO["burst"]:
        # Reads a minute ahead quickly then at 2x speed so it dosent copy the whole movie to the local disk at once
        args += ["-readrate", "2", "-readrate_initial_burst", "60"]
    if t > 0:
        args += ["-ss", f"{t:.3f}"]
    args += ["-i", f["path"], "-map", "0:v:0", "-map", f"0:a:{a}?", *vargs,
             "-c:a", "aac", "-ac", "2", "-b:a", "192k", "-sn", "-dn", "-max_muxing_queue_size", "2048",
             "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "event", "-hls_segment_type", "fmp4",
             "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", str(out / "seg%05d.m4s"),
             str(out / "index.m3u8")]
    errlog = open(out / "ffmpeg.log", "wb")
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=errlog)
    SESS[sid] = {"proc": proc, "dir": out, "user": user["username"], "fid": fid, "last": time.time(), "offset": t}

    # Waits for the first segment before telling the player to start
    pl = out / "index.m3u8"
    for _ in range(120):
        if pl.exists() and "#EXTINF" in pl.read_text(errors="ignore"):
            break
        if proc.returncode is not None:
            err = (out / "ffmpeg.log").read_text(errors="ignore")[-400:]
            kill_session(sid)
            raise HTTPException(500, f"The player couldnt start: {err or 'ffmpeg stopped'}")
        await asyncio.sleep(0.25)
    else:
        kill_session(sid)
        raise HTTPException(504, "The Storage Box took too long to respond, try again")
    return {"sid": sid, "url": f"/api/hls/{sid}/index.m3u8", "offset": t}


HLS_NAME = re.compile(r"^(index\.m3u8|init\.mp4|seg\d{5}\.m4s)$")


@app.get("/api/hls/{sid}/{name}")
async def hls_file(sid: str, name: str, user=Depends(current_user)):
    s = SESS.get(sid)
    if not s or s["user"] != user["username"] or not HLS_NAME.match(name):
        raise HTTPException(404, "This player session ended")
    s["last"] = time.time()
    p = s["dir"] / name
    for _ in range(40):
        if p.exists():
            break
        await asyncio.sleep(0.25)
    if not p.exists():
        raise HTTPException(404, "Not ready yet")
    if name.endswith(".m3u8"):
        return Response(p.read_text(errors="ignore"), media_type="application/vnd.apple.mpegurl",
                        headers={"Cache-Control": "no-store"})
    return FileResponse(p, media_type="video/mp4" if name.endswith(".mp4") else "video/iso.segment",
                        headers={"Cache-Control": "private, max-age=600"})


@app.post("/api/play/{sid}/stop")
async def play_stop(sid: str, user=Depends(current_user)):
    s = SESS.get(sid)
    if s and s["user"] == user["username"]:
        kill_session(sid)
    return {"ok": True}


def srt_to_vtt(text):
    text = text.replace("\r", "")
    text = re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", text)
    return "WEBVTT\n\n" + re.sub(r"^\d+\n(?=\d{2}:\d{2})", "", text, flags=re.M)


async def extract_sub(fid, path, index):
    target = SUBS_DIR / f"{fid}_{index}.vtt"
    tmp = target.with_suffix(".tmp")
    # This has to read the whole video over the network so it can take a few minutes for big files
    proc = await asyncio.create_subprocess_exec("ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                                                "-i", path, "-map", f"0:{index}", "-f", "webvtt", str(tmp),
                                                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
    await proc.wait()
    if proc.returncode == 0 and tmp.exists():
        tmp.rename(target)
    else:
        tmp.unlink(missing_ok=True)
    SUB_JOBS.pop((fid, index), None)


@app.get("/api/subs/{fid}/{sub_id}")
async def subtitles(fid: str, sub_id: str, user=Depends(current_user)):
    f = file_or_404(fid)
    if sub_id.startswith("x"):
        s = next((s for s in f["ext_subs"] if s["id"] == sub_id), None)
        if not s:
            raise HTTPException(404, "Subtitle not found")
        raw = Path(s["path"]).read_bytes()
        txt = raw.decode("utf-8-sig", errors="ignore")
        if "�" in txt or not txt.strip():
            txt = raw.decode("latin-1")
        return Response(txt if s["path"].lower().endswith(".vtt") else srt_to_vtt(txt), media_type="text/vtt")
    if sub_id.startswith("e") and sub_id[1:].isdigit():
        idx = int(sub_id[1:])
        target = SUBS_DIR / f"{fid}_{idx}.vtt"
        if target.exists():
            return Response(target.read_text(errors="ignore"), media_type="text/vtt")
        if (fid, idx) not in SUB_JOBS and len(SUB_JOBS) < 2:
            SUB_JOBS[(fid, idx)] = asyncio.create_task(extract_sub(fid, f["path"], idx))
        return JSONResponse({"status": "preparing"}, status_code=202)
    raise HTTPException(404, "Subtitle not found")


@app.post("/api/progress")
async def progress(request: Request, user=Depends(current_user)):
    b = await request.json()
    fid = str(b.get("file_id", ""))
    if fid not in LIB["files"]:
        raise HTTPException(404, "Unknown file")
    db().q("INSERT OR REPLACE INTO progress VALUES (?,?,?,?,?)",
           (user["username"], fid, float(b.get("pos") or 0), float(b.get("dur") or 0), time.time()))
    return {"ok": True}


# ---- images

@app.get("/api/img")
async def img(u: str, user=Depends(current_user)):
    host = urlparse(u).hostname or ""
    if urlparse(u).scheme != "https" or host not in IMG_HOSTS:
        raise HTTPException(400, "Image host not allowed")
    cache = DATA_DIR / "img" / hashlib.sha1(u.encode()).hexdigest()
    if cache.exists():
        meta = read_json(str(cache) + ".json") or {}
        if meta.get("missing"):
            raise HTTPException(404, "No image")
        return FileResponse(cache, media_type=meta.get("type", "image/jpeg"),
                            headers={"Cache-Control": "private, max-age=604800"})
    if OFFLINE_META:
        raise HTTPException(404, "No image")
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20, headers={"User-Agent": "kino-dashboard"}) as c:
            r = await c.get(u)
    except Exception:
        raise HTTPException(502, "Image host didnt answer")
    ctype = r.headers.get("content-type", "")
    if r.status_code != 200 or not ctype.startswith("image/") or len(r.content) > 10 * 1024**2:
        cache.write_bytes(b"")
        Path(str(cache) + ".json").write_text(json.dumps({"missing": True}))
        raise HTTPException(404, "No image")
    cache.write_bytes(r.content)
    Path(str(cache) + ".json").write_text(json.dumps({"type": ctype}))
    return Response(r.content, media_type=ctype, headers={"Cache-Control": "private, max-age=604800"})


# ---- sync

@app.get("/api/sync")
async def sync_status(user=Depends(require_admin)):
    svc, tmr = await asyncio.to_thread(systemctl_show)
    st = read_json(SYNC_STATUS) or {}
    cur = st.get("current") if svc.get("ActiveState") in ("active", "activating") else None
    poster = None
    if cur:
        g = guess(cur.get("rel") or cur.get("name", ""))
        kind = "series" if g.get("type") == "episode" else "movie"
        name, year = str(first(g.get("title")) or ""), first(g.get("year"))
        key = title_key(kind, name, year)
        m, _ = cached_meta(key)
        if m is None:
            asyncio.create_task(ensure_meta([(key, kind, name, year)]))
        elif m.get("id"):
            poster = m.get("poster")
            cur = {**cur, "title": m.get("name"), "background": m.get("background")}
        cur = {**cur, "season": first(g.get("season")), "episode": first(g.get("episode"))}
    return {
        "service": {"state": svc.get("ActiveState"), "sub": svc.get("SubState"), "result": svc.get("Result"),
                    "started": svc.get("ExecMainStartTimestamp"), "exited": svc.get("ExecMainExitTimestamp"),
                    "error": svc.get("error")},
        "timer": {"state": tmr.get("ActiveState"), "next": tmr.get("NextElapseUSecRealtime"),
                  "last": tmr.get("LastTriggerUSec")},
        "status": st, "current": cur, "poster": poster, "paused": pause_state(), "now": time.time(),
    }


@app.post("/api/sync/{action}")
async def sync_action(action: str, request: Request, user=Depends(require_admin)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    if action == "start":
        PAUSE_FILE.unlink(missing_ok=True)
        await asyncio.to_thread(systemctl, "start", "--no-block", SYNC_UNIT)
    elif action == "stop":
        await asyncio.to_thread(systemctl, "stop", "--no-block", SYNC_UNIT)
    elif action == "pause":
        hours = float(body.get("hours") or 24)
        until = time.time() + hours * 3600 if hours > 0 else 32503680000  # 0 means until i resume it
        PAUSE_FILE.write_text(json.dumps({"until": until, "by": user["username"], "set_at": time.time()}))
        PAUSE_FILE.chmod(0o644)
        await asyncio.to_thread(systemctl, "stop", "--no-block", SYNC_UNIT)
    elif action == "resume":
        PAUSE_FILE.unlink(missing_ok=True)
    else:
        raise HTTPException(404, "Unknown action")
    log.info("kino sync %s by %s", action, user["username"])
    return {"ok": True}


# ---- server stats

@app.get("/api/stats")
async def stats(user=Depends(require_admin)):
    vm, sw = psutil.virtual_memory(), psutil.swap_memory()
    mounted = os.path.ismount(MEDIA_DIR) or env("ASSUME_MOUNTED", "0") == "1"
    return {
        "hist": list(STATS["hist"]), "procs": STATS["procs"], "cores": psutil.cpu_count(),
        "load": os.getloadavg(), "uptime": time.time() - psutil.boot_time(),
        "mem": {"total": vm.total, "used": vm.total - vm.available, "percent": vm.percent},
        "swap": {"total": sw.total, "used": sw.used},
        "disks": {"vps": disk("/"), "box": disk(MEDIA_DIR) if mounted else None},
        "box_mounted": mounted, "players": len(SESS),
    }


# ---- frontend

@app.get("/healthz")
async def healthz():
    # The deploy checks this after every update, no login needed and it shows nothing private
    return {"ok": True, "files": len(LIB["files"]), "scanning": LIB["scanning"]}


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory=STATIC), name="static")


# ---------------------------------------------------------------- cli for users

def cli():
    ap = argparse.ArgumentParser(description="kino user management")
    sp = ap.add_subparsers(dest="cmd", required=True)
    a = sp.add_parser("adduser")
    a.add_argument("name")
    a.add_argument("--role", choices=["admin", "viewer"], default="viewer")
    sp.add_parser("passwd").add_argument("name")
    sp.add_parser("deluser").add_argument("name")
    sp.add_parser("users")
    args = ap.parse_args()
    d = db()
    name = getattr(args, "name", "").strip().lower()

    def ask():
        while True:
            pw = getpass.getpass("Password (12+ characters): ")
            if len(pw) < 12:
                print("Too short, use at least 12 characters")
                continue
            if pw != getpass.getpass("Same again: "):
                print("They didnt match, try again")
                continue
            return pw

    if args.cmd == "adduser":
        if d.q("SELECT 1 FROM users WHERE username = ?", (name,)):
            sys.exit("That user already exists, use passwd to change the password")
        d.q("INSERT INTO users VALUES (?,?,?,?)", (name, hash_pw(ask()), args.role, time.time()))
        print(f"Added {name} as {args.role}")
    elif args.cmd == "passwd":
        if not d.q("SELECT 1 FROM users WHERE username = ?", (name,)):
            sys.exit("No user with that name")
        d.q("UPDATE users SET pw = ? WHERE username = ?", (hash_pw(ask()), name))
        d.q("DELETE FROM sessions WHERE username = ?", (name,))
        print(f"Password changed, {name} is signed out everywhere")
    elif args.cmd == "deluser":
        d.q("DELETE FROM users WHERE username = ?", (name,))
        d.q("DELETE FROM sessions WHERE username = ?", (name,))
        print(f"Removed {name}")
    else:
        for r in d.q("SELECT username, role FROM users ORDER BY username"):
            print(f"{r['username']:20} {r['role']}")


if __name__ == "__main__":
    cli()
