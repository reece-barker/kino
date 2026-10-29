#!/usr/bin/env python3
# kino, netflix style family dashboard for the storage box library, with the torbox sync and vps stats for the admin
# runs behind nginx on 127.0.0.1 only. Family get in by being on the ip allow list and picking a profile,
# the admin has a proper login for the sync, server and settings stuff
#
# Run as cli to manage admin accounts:
#   python3 app.py adduser NAME
#   python3 app.py passwd NAME
#   python3 app.py deluser NAME
#   python3 app.py users

import argparse
import asyncio
import getpass
import hashlib
import hmac
import html
import io
import ipaddress
import json
import logging
import math
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
ALLOWLIST = Path(env("ALLOWLIST_FILE", str(DATA_DIR / "allowlist.json")))
ALLOWLIST_APPLIED = Path(env("ALLOWLIST_APPLIED", str(DATA_DIR / "allowlist-applied.json")))
WATCHDOG_STATUS = Path(env("WATCHDOG_STATUS", "/var/lib/kino-watchdog/status.json"))
SYNC_UNIT = env("SYNC_UNIT", "torbox-sync.service")
TIMER_UNIT = env("TIMER_UNIT", "torbox-sync.timer")
SECRET = env("KINO_SECRET", "").encode()
COOKIE_SECURE = env("COOKIE_SECURE", "1") == "1"
CINEMETA = env("CINEMETA_URL", "https://v3-cinemeta.strem.io")
OFFLINE_META = env("OFFLINE_META", "0") == "1"  # Only for testing without internet
ALLOW_ALL = env("ALLOW_ALL", "0") == "1"  # Only for testing, skips the ip check in the app
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
AVATAR_COUNT = 18  # Has to match the AVATARS list in app.js
DEFAULT_PREFS = {"audio_lang": "", "sub_lang": "", "sub_size": "m", "autoplay": True, "skip_intro": False}

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("kino")
logging.getLogger("httpx").setLevel(logging.WARNING)  # Otherwise every cinemeta request spams the log

LANGS = {"en": "English", "eng": "English", "de": "German", "ger": "German", "deu": "German", "fr": "French", "fre": "French",
         "fra": "French", "es": "Spanish", "spa": "Spanish", "it": "Italian", "ita": "Italian", "nl": "Dutch", "dut": "Dutch",
         "nld": "Dutch", "pl": "Polish", "pol": "Polish", "pt": "Portuguese", "por": "Portuguese", "ru": "Russian", "rus": "Russian",
         "ja": "Japanese", "jpn": "Japanese", "ko": "Korean", "kor": "Korean", "zh": "Chinese", "chi": "Chinese", "zho": "Chinese",
         "sv": "Swedish", "swe": "Swedish", "da": "Danish", "dan": "Danish", "no": "Norwegian", "nor": "Norwegian",
         "fi": "Finnish", "fin": "Finnish", "tr": "Turkish", "tur": "Turkish", "ar": "Arabic", "ara": "Arabic", "cs": "Czech",
         "cze": "Czech", "hu": "Hungarian", "hun": "Hungarian", "el": "Greek", "gre": "Greek", "he": "Hebrew", "heb": "Hebrew",
         "hi": "Hindi", "hin": "Hindi", "uk": "Ukrainian", "ukr": "Ukrainian", "ro": "Romanian", "rum": "Romanian", "ron": "Romanian"}


def lang_name(code):
    return LANGS.get(str(code or "").lower().strip(), str(code or "").upper())


# ---------------------------------------------------------------- database

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, pw TEXT NOT NULL, role TEXT NOT NULL, created REAL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT, created REAL, expires REAL, ip TEXT, ua TEXT);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, data TEXT, fetched REAL);
CREATE TABLE IF NOT EXISTS probe (path TEXT PRIMARY KEY, size INTEGER, mtime REAL, data TEXT);
CREATE TABLE IF NOT EXISTS progress (username TEXT, file_id TEXT, pos REAL, dur REAL, updated REAL, PRIMARY KEY (username, file_id));
CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon INTEGER NOT NULL,
    prefs TEXT NOT NULL DEFAULT '{}', created REAL);
CREATE TABLE IF NOT EXISTS watch (profile_id INTEGER, file_id TEXT, pos REAL, dur REAL, watched INTEGER DEFAULT 0, updated REAL,
    PRIMARY KEY (profile_id, file_id));
CREATE TABLE IF NOT EXISTS ratings (profile_id INTEGER, title_id TEXT, value INTEGER, updated REAL, PRIMARY KEY (profile_id, title_id));
CREATE TABLE IF NOT EXISTS overrides (key TEXT PRIMARY KEY, kind TEXT, imdb_id TEXT, set_at REAL);
CREATE TABLE IF NOT EXISTS intros (title_id TEXT, season INTEGER, start REAL, end REAL, PRIMARY KEY (title_id, season));
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
        migrate()
    return _db


def migrate():
    # First run with profiles: makes one profile per old login and moves there watch progress over
    d = _db
    if d.q("SELECT COUNT(*) AS n FROM profiles")[0]["n"]:
        return
    users = d.q("SELECT username FROM users ORDER BY created")
    names = [u["username"] for u in users] or ["Family"]
    for i, name in enumerate(names):
        d.q("INSERT INTO profiles (name, icon, prefs, created) VALUES (?,?,?,?)",
            (name[:1].upper() + name[1:], i % AVATAR_COUNT, json.dumps(DEFAULT_PREFS), time.time()))
        pid = d.q("SELECT last_insert_rowid() AS id")[0]["id"]
        d.q("INSERT OR IGNORE INTO watch SELECT ?, file_id, pos, dur, CASE WHEN dur > 0 AND pos / dur > 0.93 THEN 1 ELSE 0 END, updated "
            "FROM progress WHERE username = ?", (pid, name))


# ---------------------------------------------------------------- passwords, sessions, ip list

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


def sign(*parts):
    return hmac.new(SECRET, ":".join(str(p) for p in parts).encode(), hashlib.sha256).hexdigest()


_ALLOW_CACHE = {"mtime": None, "nets": []}


def read_json(p):
    try:
        return json.loads(Path(p).read_text())
    except Exception:
        return None


def allow_entries():
    return (read_json(ALLOWLIST) or {}).get("entries", [])


def allowed_nets():
    try:
        mt = ALLOWLIST.stat().st_mtime
    except OSError:
        mt = None
    if mt != _ALLOW_CACHE["mtime"]:
        nets = []
        for e in allow_entries():
            try:
                nets.append(ipaddress.ip_network(e["cidr"], strict=False))
            except (ValueError, KeyError):
                pass
        _ALLOW_CACHE.update(mtime=mt, nets=nets)
    return _ALLOW_CACHE["nets"]


def ip_allowed(ip):
    # Second lock behind nginx, if the nginx list ever goes missing the app still says no
    if ALLOW_ALL:
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if addr.is_loopback:
        return True
    if getattr(addr, "ipv4_mapped", None):
        addr = addr.ipv4_mapped
    return any(addr in n for n in allowed_nets() if n.version == addr.version)


def admin_user(request):
    tok = request.cookies.get("kino_admin")
    if not tok:
        return None
    rows = db().q("SELECT s.username, s.expires FROM sessions s JOIN users u ON u.username = s.username "
                  "WHERE s.token_hash = ? AND u.role = 'admin'", (tok_hash(tok),))
    if not rows or rows[0]["expires"] < time.time():
        return None
    return rows[0]["username"]


def require_admin(request: Request):
    u = admin_user(request)
    if not u:
        raise HTTPException(401, "Sign in as admin to do that")
    return u


def profile_row(pid):
    rows = db().q("SELECT id, name, icon, prefs FROM profiles WHERE id = ?", (pid,))
    if not rows:
        return None
    r = rows[0]
    prefs = {**DEFAULT_PREFS, **(json.loads(r["prefs"] or "{}"))}
    return {"id": r["id"], "name": r["name"], "icon": r["icon"], "prefs": prefs}


def current_profile(request: Request):
    pid = request.cookies.get("kino_profile", "")
    p = profile_row(int(pid)) if pid.isdigit() else None
    if not p:
        raise HTTPException(409, "Pick a profile first")
    return p


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
        raise RuntimeError(f"{MEDIA_DIR} isn't reachable, check the Storage Box mount")
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

def unesc(v):
    # Cinemeta sometimes sends names like O&apos;Dea, this turns them back into normal text
    if isinstance(v, str):
        return html.unescape(v)
    if isinstance(v, list):
        return [unesc(x) for x in v]
    return v


def poster_for(m):
    i = m.get("id", "")
    return f"https://images.metahub.space/poster/medium/{i}/img" if i.startswith("tt") else m.get("poster")


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


async def cinemeta_search(client, kind, name):
    r = await client.get(f"{CINEMETA}/catalog/{kind}/top/search={quote(name)}.json", timeout=20)
    r.raise_for_status()
    return r.json().get("metas") or []


async def cinemeta_meta(client, kind, imdb_id):
    r = await client.get(f"{CINEMETA}/meta/{kind}/{imdb_id}.json", timeout=20)
    if r.status_code != 200:
        return None
    m = r.json().get("meta")
    return slim_meta(m, kind) if m else None


async def cinemeta_lookup(client, kind, name, year):
    metas = await cinemeta_search(client, kind, name)
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
    return await cinemeta_meta(client, kind, pick["id"]) or slim_meta(pick, kind)


def cached_meta(key):
    rows = db().q("SELECT data, fetched FROM meta WHERE key = ?", (key,))
    if not rows:
        return None, 0
    return json.loads(rows[0]["data"]), rows[0]["fetched"]


def override_for(key):
    rows = db().q("SELECT kind, imdb_id FROM overrides WHERE key = ?", (key,))
    return dict(rows[0]) if rows else None


async def ensure_meta(keys, force=False):
    """Looks up metadata for title keys that arent cached yet, one at a time so cinemeta isnt hammered"""
    if OFFLINE_META:
        return
    async with httpx.AsyncClient(headers={"User-Agent": "kino-dashboard"}) as client:
        for key, kind, name, year in keys:
            data, fetched = cached_meta(key)
            age = time.time() - fetched
            # Found entries are kept a week, not found ones are retried after a day
            if not force and data is not None and (age < 7 * 86400 if data.get("id") else age < 86400):
                continue
            ov = override_for(key)
            try:
                if ov:
                    m = await cinemeta_meta(client, ov["kind"], ov["imdb_id"])
                else:
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
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams",
                          "-show_chapters", path], capture_output=True, timeout=120)
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
                         "lang": tags.get("language"), "title": tags.get("title"),
                         "forced": (s.get("disposition") or {}).get("forced") == 1})
            s_i += 1
    chapters = [{"start": float(c.get("start_time") or 0), "end": float(c.get("end_time") or 0),
                 "title": (c.get("tags") or {}).get("title", "")} for c in j.get("chapters") or []]
    return {"duration": float(fmt.get("duration") or 0), "container": fmt.get("format_name", ""),
            "video": video, "audio": audio, "subs": subs, "chapters": chapters}


async def get_probe(f):
    rows = db().q("SELECT size, mtime, data FROM probe WHERE path = ?", (f["path"],))
    if rows and rows[0]["size"] == f["size"] and abs(rows[0]["mtime"] - f["mtime"]) < 1:
        data = json.loads(rows[0]["data"])
        if "chapters" in data:
            return data
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

STATS = {"hist": deque(maxlen=120), "procs": [], "last_net": None}
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
    seen, infos = {}, []
    for p in psutil.process_iter(["pid", "name", "username", "memory_info"]):
        proc = PROC_CACHE.get(p.pid) or p
        try:
            cpu = proc.cpu_percent(None)
            seen[p.pid] = proc
            mi = p.info.get("memory_info")
            infos.append({"pid": p.pid, "name": p.info.get("name"), "user": p.info.get("username"),
                          "cpu": cpu, "mem": mi.rss if mi else 0})
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    PROC_CACHE.clear()
    PROC_CACHE.update(seen)
    STATS["procs"] = sorted(infos, key=lambda i: i["cpu"], reverse=True)[:6]


async def stats_worker():
    psutil.cpu_percent(None)
    while True:
        try:
            await asyncio.to_thread(sample_stats)
        except Exception as e:
            log.warning("stats: %s", e)
        await asyncio.sleep(3)


def box_mounted():
    return os.path.ismount(MEDIA_DIR) or env("ASSUME_MOUNTED", "0") == "1"


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

STATIC_VERSION = {"v": "1"}


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
    # Changes whenever a static file changes so browsers and the app install pick up new versions
    h = hashlib.sha1()
    for p in sorted(STATIC.glob("*")):
        if p.is_file():
            h.update(p.name.encode() + str(p.stat().st_mtime_ns).encode())
    STATIC_VERSION["v"] = h.hexdigest()[:10]

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
       "script-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; "
       "base-uri 'none'; form-action 'self'")


@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    # Every change request needs this header, other websites cant add it so they cant trick your browser into doing stuff
    if request.method in ("POST", "PUT", "DELETE") and request.headers.get("x-kino") != "1":
        return JSONResponse({"detail": "Missing request header"}, status_code=403)
    if path.startswith("/api/") and not path.startswith("/api/dl/") and not ip_allowed(client_ip(request)):
        log.warning("kino blocked ip=%s path=%s", client_ip(request), path)
        return JSONResponse({"detail": "This network isn't on the allow list"}, status_code=403)
    resp = await call_next(request)
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if path.startswith("/api/") and "cache-control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store"
    return resp


def set_cookie(resp, name, value, max_age):
    resp.set_cookie(name, value, max_age=max_age, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/")


# ---- profiles and admin sign in

def pub_profile(p):
    return {"id": p["id"], "name": p["name"], "icon": p["icon"]}


@app.get("/api/me")
async def me(request: Request):
    pid = request.cookies.get("kino_profile", "")
    p = profile_row(int(pid)) if pid.isdigit() else None
    return {"profile": p, "admin": admin_user(request), "ip": client_ip(request)}


@app.get("/api/profiles")
async def profiles(request: Request):
    rows = db().q("SELECT id, name, icon FROM profiles ORDER BY id")
    return {"profiles": [dict(r) for r in rows], "admin": admin_user(request)}


@app.post("/api/profiles/{pid}/select")
async def profile_select(pid: int):
    p = profile_row(pid)
    if not p:
        raise HTTPException(404, "That profile doesn't exist anymore")
    resp = JSONResponse({"ok": True, "profile": p})
    set_cookie(resp, "kino_profile", str(pid), 365 * 86400)
    return resp


def clean_name(n):
    n = re.sub(r"\s+", " ", str(n or "")).strip()[:24]
    if not n:
        raise HTTPException(400, "Give the profile a name")
    return n


def clean_icon(i):
    try:
        i = int(i)
    except (TypeError, ValueError):
        raise HTTPException(400, "Pick an icon")
    if not 0 <= i < AVATAR_COUNT:
        raise HTTPException(400, "Pick an icon")
    return i


@app.put("/api/profile")
async def profile_update(request: Request, p=Depends(current_profile)):
    b = await request.json()
    name = clean_name(b.get("name", p["name"]))
    icon = clean_icon(b.get("icon", p["icon"]))
    prefs = dict(p["prefs"])
    for k, v in (b.get("prefs") or {}).items():
        if k in ("audio_lang", "sub_lang"):
            prefs[k] = str(v or "")[:30]
        elif k == "sub_size" and v in ("s", "m", "l"):
            prefs[k] = v
        elif k in ("autoplay", "skip_intro"):
            prefs[k] = bool(v)
    db().q("UPDATE profiles SET name = ?, icon = ?, prefs = ? WHERE id = ?", (name, icon, json.dumps(prefs), p["id"]))
    return {"ok": True, "profile": profile_row(p["id"])}


@app.post("/api/admin/profiles")
async def profile_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if db().q("SELECT COUNT(*) AS n FROM profiles")[0]["n"] >= 12:
        raise HTTPException(400, "That's the maximum of 12 profiles")
    db().q("INSERT INTO profiles (name, icon, prefs, created) VALUES (?,?,?,?)",
           (clean_name(b.get("name")), clean_icon(b.get("icon", 0)), json.dumps(DEFAULT_PREFS), time.time()))
    log.info("kino profile added by %s", admin)
    return {"ok": True}


@app.put("/api/admin/profiles/{pid}")
async def profile_admin_edit(pid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if not profile_row(pid):
        raise HTTPException(404, "That profile doesn't exist")
    db().q("UPDATE profiles SET name = ?, icon = ? WHERE id = ?", (clean_name(b.get("name")), clean_icon(b.get("icon")), pid))
    return {"ok": True}


@app.delete("/api/admin/profiles/{pid}")
async def profile_delete(pid: int, admin=Depends(require_admin)):
    if db().q("SELECT COUNT(*) AS n FROM profiles")[0]["n"] <= 1:
        raise HTTPException(400, "Keep at least one profile")
    for t in ("watch", "ratings"):
        db().q(f"DELETE FROM {t} WHERE profile_id = ?", (pid,))
    db().q("DELETE FROM profiles WHERE id = ?", (pid,))
    log.info("kino profile %s deleted by %s", pid, admin)
    return {"ok": True}


@app.post("/api/admin/login")
async def admin_login(request: Request):
    ip = client_ip(request)
    if too_many_fails(ip):
        log.warning("kino login blocked ip=%s", ip)
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    body = await request.json()
    user = str(body.get("username", "")).strip().lower()[:64]
    pw = str(body.get("password", ""))[:256]
    rows = db().q("SELECT pw FROM users WHERE username = ? AND role = 'admin'", (user,))
    ok = await asyncio.to_thread(check_pw, pw, rows[0]["pw"] if rows else DUMMY_HASH)
    if not rows or not ok:
        FAILS.setdefault(ip, deque()).append(time.time())
        # fail2ban watches for this exact line
        log.warning("kino login failed user=%s ip=%s", user, ip)
        raise HTTPException(401, "That username and password don't match")
    FAILS.pop(ip, None)
    tok = secrets.token_urlsafe(32)
    exp = time.time() + SESSION_DAYS * 86400
    db().q("INSERT INTO sessions VALUES (?,?,?,?,?,?)",
           (tok_hash(tok), user, time.time(), exp, ip, request.headers.get("user-agent", "")[:200]))
    db().q("DELETE FROM sessions WHERE expires < ?", (time.time(),))
    log.info("kino login ok user=%s ip=%s", user, ip)
    resp = JSONResponse({"ok": True, "admin": user})
    set_cookie(resp, "kino_admin", tok, SESSION_DAYS * 86400)
    return resp


@app.post("/api/admin/logout")
async def admin_logout(request: Request):
    tok = request.cookies.get("kino_admin")
    if tok:
        db().q("DELETE FROM sessions WHERE token_hash = ?", (tok_hash(tok),))
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("kino_admin", path="/")
    return resp


# ---- library helpers

def meta_for(t):
    m, _ = cached_meta(t["key"])
    return m if m and m.get("id") else None


def watch_map(pid):
    return {r["file_id"]: dict(r) for r in db().q("SELECT file_id, pos, dur, watched, updated FROM watch WHERE profile_id = ?", (pid,))}


def rating_map(pid):
    return {r["title_id"]: r["value"] for r in db().q("SELECT title_id, value FROM ratings WHERE profile_id = ?", (pid,))}


def title_summary(t, meta, wm=None, rm=None):
    m = meta or {}
    wm, rm = wm or {}, rm or {}
    watched = sum(1 for f in t["files"] if wm.get(f, {}).get("watched"))
    last = max((wm[f]["updated"] for f in t["files"] if f in wm), default=0)
    return {
        "id": t["id"], "kind": m.get("kind") or t["kind"], "name": m.get("name") or t["guess_name"], "year": t["year"],
        "releaseInfo": m.get("releaseInfo") or t["year"], "poster": m.get("poster"), "background": m.get("background"),
        "logo": m.get("logo"), "genres": m.get("genres") or [], "rating": m.get("rating"), "runtime": m.get("runtime"),
        "description": m.get("description"), "added": t["added"], "count": len(t["files"]), "size": t["size"],
        "matched": bool(m.get("id")), "imdb": m.get("id"), "watched": watched == len(t["files"]) and watched > 0,
        "watched_count": watched, "my_rating": rm.get(t["id"], 0), "last_activity": last,
    }


def all_summaries(pid):
    wm, rm = watch_map(pid), rating_map(pid)
    return [title_summary(t, meta_for(t), wm, rm) for t in LIB["titles"].values()], wm, rm


def imdb_score(s):
    try:
        return float(s["rating"])
    except (TypeError, ValueError):
        return 6.0


def genre_weights(summ):
    # What this profile likes, built from thumbs and what they actualy watched
    w = {}
    for s in summ:
        sig = {2: 3.0, 1: 2.0, -1: -3.0}.get(s["my_rating"], 0.0)
        if s["watched_count"]:
            sig += 1.0
        elif s["last_activity"]:
            sig += 0.5
        if not sig:
            continue
        for g in s["genres"]:
            w[g] = w.get(g, 0) + sig
    return w


def rec_score(s, weights, now):
    gw = sum(weights.get(g, 0) for g in s["genres"]) / math.sqrt(max(len(s["genres"]), 1))
    fresh = max(0.0, 1.0 - (now - s["added"]) / (30 * 86400))  # New stuff gets a little push for a month
    return gw + 0.4 * imdb_score(s) + fresh


def next_unwatched(t, wm):
    for f in t["files"]:
        if not wm.get(f, {}).get("watched"):
            return f
    return None


def continue_list(summ, wm):
    out, seen = [], set()
    rows = sorted(wm.values(), key=lambda r: r["updated"], reverse=True)
    by_id = {s["id"]: s for s in summ}
    for r in rows:
        f = LIB["files"].get(r["file_id"])
        if not f or f["title_id"] in seen:
            continue
        t = LIB["titles"].get(f["title_id"])
        s = by_id.get(f["title_id"])
        if not t or not s:
            continue
        seen.add(t["id"])
        target, pos, dur = f, r["pos"], r["dur"]
        if r["watched"] or (dur and pos / dur > 0.93):
            # Finished this one, for a show the next episode goes in Continue Watching instead
            if s["kind"] != "series":
                continue
            nf = next_unwatched(t, wm)
            if not nf or t["files"].index(nf) < t["files"].index(f["id"]):
                continue
            target, pos, dur = LIB["files"][nf], 0, 0
        elif not dur or pos / dur < 0.02:
            continue
        out.append({**s, "file_id": target["id"], "pos": pos, "dur": dur, "season": target["season"],
                    "episode": target["episode"], "next_episode": target["id"] != f["id"]})
        if len(out) >= 14:
            break
    return out


@app.get("/api/library")
async def library(p=Depends(current_profile)):
    summ, wm, rm = all_summaries(p["id"])
    summ.sort(key=lambda x: x["added"], reverse=True)
    return {"titles": summ, "scanned_at": LIB["scanned_at"], "scanning": LIB["scanning"],
            "error": LIB["error"], "files": len(LIB["files"]), "mounted": box_mounted()}


@app.get("/api/home")
async def home(p=Depends(current_profile)):
    summ, wm, rm = all_summaries(p["id"])
    now = time.time()
    weights = genre_weights(summ)
    has_signal = any(v > 0 for v in weights.values())
    visible = [s for s in summ if s["my_rating"] != -1]
    for s in visible:
        s["score"] = rec_score(s, weights, now)
    by_score = sorted(visible, key=lambda s: s["score"], reverse=True)
    recent = sorted(summ, key=lambda s: s["added"], reverse=True)

    hero_pool = [s for s in (by_score if has_signal else recent) if s["background"] and s["matched"] and not s["watched"]]
    hero = (hero_pool or [s for s in recent if s["background"]] or recent)[:5]

    shelves = []
    cont = continue_list(summ, wm)
    if cont:
        shelves.append({"id": "continue", "title": f"Continue Watching for {p['name']}", "style": "continue", "items": cont})
    if has_signal:
        picks = [s for s in by_score if not s["watched"]][:16]
        if picks:
            shelves.append({"id": "picks", "title": f"Top Picks for {p['name']}", "style": "poster", "items": picks})
    shelves.append({"id": "recent", "title": "Recently Added", "style": "wide", "items": recent[:16]})

    # Because you watched, based on the last thing they finished or loved
    anchors = sorted([s for s in summ if (s["watched_count"] or s["my_rating"] > 0) and s["genres"]],
                     key=lambda s: (s["my_rating"] == 2, s["last_activity"]), reverse=True)
    if anchors:
        a = anchors[0]
        similar = [s for s in visible if s["id"] != a["id"] and not s["watched"] and set(s["genres"]) & set(a["genres"])]
        similar.sort(key=lambda s: (len(set(s["genres"]) & set(a["genres"])), s["score"]), reverse=True)
        if len(similar) >= 2:
            shelves.append({"id": "because", "title": f"Because You Watched {a['name']}", "style": "poster", "items": similar[:16]})

    movies = [s for s in recent if s["kind"] == "movie"]
    shows = [s for s in recent if s["kind"] == "series"]
    if movies:
        shelves.append({"id": "movies", "title": "Movies", "style": "poster", "items": movies[:24], "more": "#/movies"})
    if shows:
        shelves.append({"id": "shows", "title": "TV Shows", "style": "poster", "items": shows[:24], "more": "#/shows"})

    rated = sorted([s for s in visible if imdb_score(s) >= 7.5 and s["rating"]], key=imdb_score, reverse=True)
    if len(rated) >= 3:
        shelves.append({"id": "acclaimed", "title": "Critically Acclaimed", "style": "poster", "items": rated[:16]})

    counts = {}
    for s in visible:
        for g in s["genres"]:
            counts[g] = counts.get(g, 0) + 1
    genres = sorted([g for g, n in counts.items() if n >= 3], key=lambda g: (weights.get(g, 0), counts[g]), reverse=True)
    for g in genres[:8]:
        items = sorted([s for s in visible if g in s["genres"]], key=lambda s: s["score"], reverse=True)
        shelves.append({"id": "g-" + norm(g), "title": g, "style": "poster", "items": items[:16]})

    unwatched = [s for s in by_score if not s["watched_count"] and not s["last_activity"]]
    if summ and len(unwatched) >= 3 and len(unwatched) < len(summ):
        shelves.append({"id": "new-to-you", "title": "Not Watched Yet", "style": "poster", "items": unwatched[:16]})

    return {"hero": hero, "shelves": shelves, "empty": not summ, "scanning": LIB["scanning"], "error": LIB["error"],
            "mounted": box_mounted()}


@app.get("/api/search")
async def search(q: str, p=Depends(current_profile)):
    q = norm(q)[:60]
    if not q:
        return {"titles": [], "episodes": []}
    words = q.split()
    summ, wm, rm = all_summaries(p["id"])
    scored = []
    for s in summ:
        name = norm(s["name"])
        sc = 0
        if name.startswith(q):
            sc += 100
        elif q in name:
            sc += 60
        elif all(w in name for w in words):
            sc += 40
        m = meta_for(LIB["titles"][s["id"]]) or {}
        people = norm(" ".join(m.get("cast") or []) + " " + " ".join([m.get("director")] if isinstance(m.get("director"), str) else (m.get("director") or [])))
        if q in people:
            sc += 30
        if any(q == norm(g) or q in norm(g) for g in s["genres"]):
            sc += 20
        if sc == 0 and len(q) > 3 and q in norm(s.get("description") or ""):
            sc += 5
        if sc:
            scored.append((sc + imdb_score(s) / 10, s))
    scored.sort(key=lambda x: x[0], reverse=True)

    eps = []
    for t in LIB["titles"].values():
        m = meta_for(t)
        if not m or t["kind"] != "series":
            continue
        vids = {(v["season"], v["episode"]): v for v in m.get("videos", [])}
        for fid in t["files"]:
            f = LIB["files"][fid]
            v = vids.get((f["season"], f["episode"]))
            if v and v.get("name") and q in norm(v["name"]):
                eps.append({"title_id": t["id"], "file_id": fid, "show": m.get("name"), "name": v["name"],
                            "season": f["season"], "episode": f["episode"], "thumbnail": v.get("thumbnail")})
    return {"titles": [s for _, s in scored[:40]], "episodes": eps[:20]}


@app.get("/api/title/{tid}")
async def title(tid: str, request: Request, p=Depends(current_profile)):
    t = LIB["titles"].get(tid)
    if not t:
        raise HTTPException(404, "That title isn't in the library anymore")
    meta = meta_for(t)
    wm, rm = watch_map(p["id"]), rating_map(p["id"])
    eps = {(v["season"], v["episode"]): v for v in (meta or {}).get("videos", [])}
    files = []
    for fid in t["files"]:
        f = LIB["files"][fid]
        pr = cached_probe(f)
        ep = eps.get((f["season"], f["episode"])) or {}
        w = wm.get(fid)
        files.append({"id": fid, "name": f["name"], "size": f["size"], "season": f["season"], "episode": f["episode"],
                      "ep_name": ep.get("name"), "ep_overview": ep.get("overview"), "thumbnail": ep.get("thumbnail"),
                      "duration": pr["duration"] if pr else None, "badges": badges(pr),
                      "progress": {"pos": w["pos"], "dur": w["dur"], "updated": w["updated"]} if w and not w["watched"] else None,
                      "watched": bool(w and w["watched"])})
    out = title_summary(t, meta, wm, rm)
    out.update(files=files, cast=(meta or {}).get("cast", []), director=(meta or {}).get("director"),
               guess_name=t["guess_name"], is_admin=bool(admin_user(request)))
    return out


def set_watched(pid, fids, watched):
    now = time.time()
    for fid in fids:
        if watched:
            row = db().q("SELECT dur FROM watch WHERE profile_id = ? AND file_id = ?", (pid, fid))
            dur = row[0]["dur"] if row else 0
            db().q("INSERT OR REPLACE INTO watch VALUES (?,?,?,?,?,?)", (pid, fid, dur, dur, 1, now))
        else:
            db().q("DELETE FROM watch WHERE profile_id = ? AND file_id = ?", (pid, fid))


@app.post("/api/watched")
async def watched(request: Request, p=Depends(current_profile)):
    b = await request.json()
    if b.get("title_id"):
        t = LIB["titles"].get(b["title_id"])
        if not t:
            raise HTTPException(404, "Unknown title")
        fids = t["files"]
    else:
        fids = [x for x in [b.get("file_id")] if x in LIB["files"]]
        if not fids:
            raise HTTPException(404, "Unknown file")
    set_watched(p["id"], fids, bool(b.get("watched")))
    return {"ok": True}


@app.post("/api/rate")
async def rate(request: Request, p=Depends(current_profile)):
    b = await request.json()
    tid, v = b.get("title_id"), int(b.get("value") or 0)
    if tid not in LIB["titles"] or v not in (-1, 0, 1, 2):
        raise HTTPException(400, "Unknown title or rating")
    if v == 0:
        db().q("DELETE FROM ratings WHERE profile_id = ? AND title_id = ?", (p["id"], tid))
    else:
        db().q("INSERT OR REPLACE INTO ratings VALUES (?,?,?,?)", (p["id"], tid, v, time.time()))
    return {"ok": True}


def file_or_404(fid):
    f = LIB["files"].get(fid)
    if not f:
        raise HTTPException(404, "That file isn't in the library anymore")
    return f


def chapter_like(chapters, pattern):
    rx = re.compile(pattern, re.I)
    return next((c for c in chapters if rx.search(c.get("title") or "")), None)


@app.get("/api/file/{fid}")
async def file_info(fid: str, request: Request, p=Depends(current_profile)):
    f = file_or_404(fid)
    try:
        pr = await get_probe(f)
    except Exception as e:
        raise HTTPException(500, f"Couldn't read the file: {e}")
    v = pr.get("video") or {}
    a = next((x for x in pr["audio"] if x.get("default")), pr["audio"][0] if pr["audio"] else None)
    direct = ("mp4" in pr["container"] or "mov" in pr["container"]) and v.get("codec") in ("h264", "hevc") \
        and (a is None or a.get("codec") in ("aac", "mp3"))
    subs = [{"id": s["id"], "label": s["label"], "lang": s["label"], "kind": "file"} for s in f["ext_subs"]]
    for s in pr["subs"]:
        if s["codec"] in TEXT_SUB_CODECS:
            ln = lang_name(s["lang"]) if s.get("lang") else ""
            label = s.get("title") or ln or f"Track {s['n'] + 1}"
            subs.append({"id": f"e{s['index']}", "label": label, "lang": ln, "kind": "embedded", "forced": s.get("forced"),
                         "ready": (SUBS_DIR / f"{fid}_{s['index']}.vtt").exists()})
    # Two tracks called English look the same in the menu, so the separate file ones get marked
    seen = {}
    for s in subs:
        seen[s["label"]] = seen.get(s["label"], 0) + 1
    for s in subs:
        if seen[s["label"]] > 1 and s["kind"] == "file":
            s["label"] += " (separate file)"

    # Skip intro comes from chapters in the file, or from times the admin marked for that season
    chapters = pr.get("chapters") or []
    intro = None
    ic = chapter_like(chapters, r"\b(intro|opening|op)\b")
    if ic and ic["end"] - ic["start"] < 240:
        intro = {"start": ic["start"], "end": ic["end"], "source": "chapter"}
    elif f["season"] is not None:
        row = db().q("SELECT start, end FROM intros WHERE title_id = ? AND season = ?", (f["title_id"], f["season"]))
        if row:
            intro = {"start": row[0]["start"], "end": row[0]["end"], "source": "marked"}
    cc = chapter_like(chapters, r"\b(credits|ending|outro|ed)\b")
    credits = cc["start"] if cc and cc["start"] > pr["duration"] * 0.6 else None

    t = LIB["titles"].get(f["title_id"])
    nxt = None
    if t and f["season"] is not None:
        i = t["files"].index(fid)
        if i + 1 < len(t["files"]):
            nf = LIB["files"][t["files"][i + 1]]
            m = meta_for(t) or {}
            ep = next((x for x in m.get("videos", []) if x["season"] == nf["season"] and x["episode"] == nf["episode"]), {})
            nxt = {"id": nf["id"], "season": nf["season"], "episode": nf["episode"], "name": ep.get("name"),
                   "thumbnail": ep.get("thumbnail"), "overview": ep.get("overview")}

    exp = int(time.time()) + 6 * 3600
    owner = f"p{p['id']}"
    dl = f"/api/dl/{fid}?u={owner}&exp={exp}&sig={sign(fid, owner, exp)}"
    row = db().q("SELECT pos, watched FROM watch WHERE profile_id = ? AND file_id = ?", (p["id"], fid))
    return {"id": fid, "name": f["name"], "size": f["size"], "duration": pr["duration"], "video": v,
            "audio": [{"n": x["n"], "lang": lang_name(x["lang"]) if x.get("lang") else "",
                       "label": " ".join(str(y) for y in (x.get("title") or lang_name(x.get("lang")),
                                                          x.get("codec", "").upper(), f"{x.get('channels')}ch") if y)}
                      for x in pr["audio"]],
            "default_audio": a["n"] if a else 0, "direct": direct, "subs": subs, "badges": badges(pr),
            "download": dl, "resume": row[0]["pos"] if row and not row[0]["watched"] else 0,
            "season": f["season"], "episode": f["episode"], "title_id": f["title_id"],
            "intro": intro, "credits": credits, "next": nxt, "prefs": p["prefs"], "is_admin": bool(admin_user(request))}


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
async def stream_direct(fid: str, request: Request, p=Depends(current_profile)):
    return range_response(file_or_404(fid)["path"], request)


@app.get("/api/dl/{fid}")
async def download(fid: str, u: str, exp: int, sig: str, request: Request):
    # Signed link so it works in vlc or a download manager without cookies, runs out after 6 hours
    if exp < time.time() or not hmac.compare_digest(sig, sign(fid, u, exp)):
        raise HTTPException(403, "This link ran out, get a new one from Kino")
    if not ip_allowed(client_ip(request)):
        raise HTTPException(403, "This network isn't on the allow list")
    f = file_or_404(fid)
    return range_response(f["path"], request, download_name=f["name"] if request.query_params.get("save") else None)


@app.post("/api/play/{fid}")
async def play_start(fid: str, request: Request, p=Depends(current_profile)):
    f = file_or_404(fid)
    body = await request.json()
    t = max(0.0, float(body.get("t") or 0))
    a = int(body.get("audio") or 0)
    pr = await get_probe(f)
    v = pr.get("video")
    if not v:
        raise HTTPException(415, "This file has no video track")
    owner = f"p{p['id']}"

    # One player per profile, starting a new one stops there old one
    for sid, s in list(SESS.items()):
        if s["owner"] == owner:
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
        raise HTTPException(415, f"{codec} video above 1080p can't be converted on this server, use Download instead")

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
    SESS[sid] = {"proc": proc, "dir": out, "owner": owner, "fid": fid, "last": time.time(), "offset": t}

    # Waits for the first segment before telling the player to start
    pl = out / "index.m3u8"
    for _ in range(120):
        if pl.exists() and "#EXTINF" in pl.read_text(errors="ignore"):
            break
        if proc.returncode is not None:
            err = (out / "ffmpeg.log").read_text(errors="ignore")[-400:]
            kill_session(sid)
            raise HTTPException(500, f"The player couldn't start: {err or 'ffmpeg stopped'}")
        await asyncio.sleep(0.25)
    else:
        kill_session(sid)
        raise HTTPException(504, "The Storage Box took too long to respond, try again")
    return {"sid": sid, "url": f"/api/hls/{sid}/index.m3u8", "offset": t}


HLS_NAME = re.compile(r"^(index\.m3u8|init\.mp4|seg\d{5}\.m4s)$")


@app.get("/api/hls/{sid}/{name}")
async def hls_file(sid: str, name: str, p=Depends(current_profile)):
    s = SESS.get(sid)
    if not s or s["owner"] != f"p{p['id']}" or not HLS_NAME.match(name):
        raise HTTPException(404, "This player session ended")
    s["last"] = time.time()
    path = s["dir"] / name
    for _ in range(40):
        if path.exists():
            break
        await asyncio.sleep(0.25)
    if not path.exists():
        raise HTTPException(404, "Not ready yet")
    if name.endswith(".m3u8"):
        txt = path.read_text(errors="ignore")
        # Tells players to start at the beginning even tho the playlist is still growing, safari needs this
        txt = txt.replace("#EXTM3U\n", "#EXTM3U\n#EXT-X-START:TIME-OFFSET=0,PRECISE=YES\n", 1)
        return Response(txt, media_type="application/vnd.apple.mpegurl", headers={"Cache-Control": "no-store"})
    return FileResponse(path, media_type="video/mp4" if name.endswith(".mp4") else "video/iso.segment",
                        headers={"Cache-Control": "private, max-age=600"})


@app.post("/api/play/{sid}/stop")
async def play_stop(sid: str, p=Depends(current_profile)):
    s = SESS.get(sid)
    if s and s["owner"] == f"p{p['id']}":
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
async def subtitles(fid: str, sub_id: str, p=Depends(current_profile)):
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
async def progress(request: Request, p=Depends(current_profile)):
    b = await request.json()
    fid = str(b.get("file_id", ""))
    if fid not in LIB["files"]:
        raise HTTPException(404, "Unknown file")
    pos, dur = float(b.get("pos") or 0), float(b.get("dur") or 0)
    done = 1 if dur and pos / dur > 0.93 else 0
    db().q("INSERT OR REPLACE INTO watch VALUES (?,?,?,?,?,?)", (p["id"], fid, pos, dur, done, time.time()))
    return {"ok": True}


# ---- images

def trim_png(data):
    # Title logos often have empty space around them which pushes them off the left edge, this cuts it off
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data))
        if im.mode not in ("RGBA", "LA"):
            im = im.convert("RGBA")
        box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if not box:
            return data, None
        out = io.BytesIO()
        im.crop(box).save(out, "PNG", optimize=True)
        return out.getvalue(), "image/png"
    except Exception:
        return data, None


@app.get("/api/img")
async def img(u: str, trim: int = 0):
    host = urlparse(u).hostname or ""
    if urlparse(u).scheme != "https" or host not in IMG_HOSTS:
        raise HTTPException(400, "Image host not allowed")
    cache = DATA_DIR / "img" / (hashlib.sha1(u.encode()).hexdigest() + ("-t" if trim else ""))
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
        raise HTTPException(502, "Image host didn't answer")
    ctype = r.headers.get("content-type", "")
    if r.status_code != 200 or not ctype.startswith("image/") or len(r.content) > 10 * 1024**2:
        cache.write_bytes(b"")
        Path(str(cache) + ".json").write_text(json.dumps({"missing": True}))
        raise HTTPException(404, "No image")
    data = r.content
    if trim:
        data, t2 = await asyncio.to_thread(trim_png, data)
        ctype = t2 or ctype
    cache.write_bytes(data)
    Path(str(cache) + ".json").write_text(json.dumps({"type": ctype}))
    return Response(data, media_type=ctype, headers={"Cache-Control": "private, max-age=604800"})


# ---- admin: library tools

@app.get("/api/admin/match/search")
async def match_search(q: str, kind: str = "movie", admin=Depends(require_admin)):
    if kind not in ("movie", "series"):
        raise HTTPException(400, "Kind has to be movie or series")
    if OFFLINE_META:
        return {"results": []}
    async with httpx.AsyncClient(headers={"User-Agent": "kino-dashboard"}) as c:
        try:
            metas = await cinemeta_search(c, kind, q[:80])
        except Exception:
            raise HTTPException(502, "Cinemeta didn't answer, try again")
    return {"results": [{"id": m.get("id"), "name": unesc(m.get("name")), "releaseInfo": m.get("releaseInfo"),
                         "poster": poster_for(m), "kind": kind} for m in metas[:12] if str(m.get("id", "")).startswith("tt")]}


@app.post("/api/admin/match")
async def match_set(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    t = LIB["titles"].get(b.get("title_id"))
    kind, imdb = b.get("kind"), str(b.get("imdb_id") or "")
    if not t or kind not in ("movie", "series") or not re.fullmatch(r"tt\d{5,10}", imdb):
        raise HTTPException(400, "Pick a title from the search results")
    db().q("INSERT OR REPLACE INTO overrides VALUES (?,?,?,?)", (t["key"], kind, imdb, time.time()))
    await ensure_meta([(t["key"], t["kind"], t["guess_name"], t["year"])], force=True)
    log.info("kino match for %s set to %s by %s", t["key"], imdb, admin)
    return {"ok": True}


def remove_file(f):
    p = Path(f["path"]).resolve()
    root = MEDIA_DIR.resolve()
    # Never deletes anything outside the storage box library
    if root not in p.parents:
        raise HTTPException(400, "That file is outside the library")
    p.unlink(missing_ok=True)
    for s in f["ext_subs"]:
        sp = Path(s["path"]).resolve()
        if root in sp.parents:
            sp.unlink(missing_ok=True)
    # Cleans up empty folders it leaves behind, but stops at torrents/webdl/usenet
    d = p.parent
    while d != root and d.parent != root and root in d.parents:
        try:
            d.rmdir()
        except OSError:
            break
        d = d.parent
    db().q("DELETE FROM watch WHERE file_id = ?", (f["id"],))
    LIB["files"].pop(f["id"], None)
    t = LIB["titles"].get(f["title_id"])
    if t and f["id"] in t["files"]:
        t["files"].remove(f["id"])
        t["size"] -= f["size"]
        if not t["files"]:
            LIB["titles"].pop(t["id"], None)


@app.delete("/api/admin/file/{fid}")
async def delete_file(fid: str, admin=Depends(require_admin)):
    f = file_or_404(fid)
    await asyncio.to_thread(remove_file, f)
    log.info("kino deleted %s by %s", f["rel"], admin)
    return {"ok": True}


@app.delete("/api/admin/title/{tid}")
async def delete_title(tid: str, admin=Depends(require_admin)):
    t = LIB["titles"].get(tid)
    if not t:
        raise HTTPException(404, "That title isn't in the library anymore")
    freed = t["size"]
    for fid in list(t["files"]):
        f = LIB["files"].get(fid)
        if f:
            await asyncio.to_thread(remove_file, f)
            log.info("kino deleted %s by %s", f["rel"], admin)
    db().q("DELETE FROM ratings WHERE title_id = ?", (tid,))
    return {"ok": True, "freed": freed}


@app.post("/api/admin/intro")
async def intro_set(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    t = LIB["titles"].get(b.get("title_id"))
    start, end = float(b.get("start") or 0), float(b.get("end") or 0)
    if not t or b.get("season") is None or not 0 <= start < end or end - start > 300:
        raise HTTPException(400, "The intro has to be under 5 minutes and end after it starts")
    db().q("INSERT OR REPLACE INTO intros VALUES (?,?,?,?)", (t["id"], int(b["season"]), start, end))
    return {"ok": True}


@app.delete("/api/admin/intro/{tid}/{season}")
async def intro_clear(tid: str, season: int, admin=Depends(require_admin)):
    db().q("DELETE FROM intros WHERE title_id = ? AND season = ?", (tid, season))
    return {"ok": True}


@app.post("/api/admin/rescan")
async def library_rescan(admin=Depends(require_admin)):
    asyncio.create_task(rescan())
    return {"ok": True}


# ---- admin: ip allow list

def write_allowlist(entries):
    tmp = ALLOWLIST.with_suffix(".tmp")
    tmp.write_text(json.dumps({"entries": entries, "updated": time.time()}, indent=1))
    tmp.chmod(0o644)
    tmp.replace(ALLOWLIST)  # A root helper sees this change and rewrites the nginx list


@app.get("/api/admin/allowlist")
async def allowlist_get(request: Request, admin=Depends(require_admin)):
    return {"entries": allow_entries(), "your_ip": client_ip(request), "applied": read_json(ALLOWLIST_APPLIED)}


@app.post("/api/admin/allowlist")
async def allowlist_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    try:
        net = ipaddress.ip_network(str(b.get("cidr", "")).strip(), strict=False)
    except ValueError:
        raise HTTPException(400, "That's not a valid IP address or range")
    # Stops someone opening it up to half the internet by accident
    if (net.version == 4 and net.prefixlen < 8) or (net.version == 6 and net.prefixlen < 32):
        raise HTTPException(400, "That range is too big, use a single address or a smaller range")
    label = re.sub(r"[^\w .'-]", "", str(b.get("label") or ""))[:40].strip() or "Unnamed"
    # A single address is saved without the /32 so it reads normally on the settings page
    cidr = str(net.network_address) if net.prefixlen == net.max_prefixlen else str(net)
    entries = [e for e in allow_entries() if e.get("cidr") != cidr]
    entries.append({"cidr": cidr, "label": label, "added": time.time(), "by": admin})
    write_allowlist(entries)
    log.info("kino allowlist add %s (%s) by %s", cidr, label, admin)
    return {"ok": True}


@app.delete("/api/admin/allowlist")
async def allowlist_remove(cidr: str, request: Request, admin=Depends(require_admin)):
    entries = allow_entries()
    rest = [e for e in entries if e.get("cidr") != cidr]
    if len(rest) == len(entries):
        raise HTTPException(404, "That entry isn't on the list")
    if not rest:
        raise HTTPException(400, "Keep at least one entry, otherwise nobody can open Kino")
    # Dont let the admin lock themselves out from where they are right now
    try:
        me_ip = ipaddress.ip_address(client_ip(request))
        if not me_ip.is_loopback:
            still = any(me_ip in ipaddress.ip_network(e["cidr"], strict=False) for e in rest
                        if ipaddress.ip_network(e["cidr"], strict=False).version == me_ip.version)
            if not still:
                raise HTTPException(400, "Removing this would lock you out, add another entry for your network first")
    except ValueError:
        pass
    write_allowlist(rest)
    log.info("kino allowlist remove %s by %s", cidr, admin)
    return {"ok": True}


# ---- admin: sync

@app.get("/api/admin/sync")
async def sync_status(admin=Depends(require_admin)):
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
        "library": {"files": len(LIB["files"]), "scanned_at": LIB["scanned_at"]},
    }


@app.post("/api/admin/sync/{action}")
async def sync_action(action: str, request: Request, admin=Depends(require_admin)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    if action in ("start", "retry"):
        PAUSE_FILE.unlink(missing_ok=True)
        await asyncio.to_thread(systemctl, "start", "--no-block", SYNC_UNIT)
    elif action == "stop":
        await asyncio.to_thread(systemctl, "stop", "--no-block", SYNC_UNIT)
    elif action == "pause":
        hours = float(body.get("hours") or 24)
        until = time.time() + hours * 3600 if hours > 0 else 32503680000  # 0 means until i resume it
        PAUSE_FILE.write_text(json.dumps({"until": until, "by": admin, "set_at": time.time()}))
        PAUSE_FILE.chmod(0o644)
        await asyncio.to_thread(systemctl, "stop", "--no-block", SYNC_UNIT)
    elif action == "resume":
        PAUSE_FILE.unlink(missing_ok=True)
    else:
        raise HTTPException(404, "Unknown action")
    log.info("kino sync %s by %s", action, admin)
    return {"ok": True}


# ---- admin: server stats

@app.get("/api/admin/stats")
async def stats(admin=Depends(require_admin)):
    vm, sw = psutil.virtual_memory(), psutil.swap_memory()
    mounted = box_mounted()
    return {
        "hist": list(STATS["hist"]), "procs": STATS["procs"], "cores": psutil.cpu_count(),
        "load": os.getloadavg(), "uptime": time.time() - psutil.boot_time(),
        "mem": {"total": vm.total, "used": vm.total - vm.available, "percent": vm.percent},
        "swap": {"total": sw.total, "used": sw.used},
        "disks": {"vps": disk("/"), "box": disk(MEDIA_DIR) if mounted else None},
        "box_mounted": mounted, "players": len(SESS), "watchdog": read_json(WATCHDOG_STATUS),
    }


# ---- app shell, install files

@app.get("/healthz")
async def healthz():
    # The deploy checks this after every update, no login needed and it shows nothing private
    return {"ok": True, "files": len(LIB["files"]), "scanning": LIB["scanning"]}


@app.get("/")
async def index():
    page = (STATIC / "index.html").read_text().replace("__V__", STATIC_VERSION["v"])
    return Response(page, media_type="text/html", headers={"Cache-Control": "no-cache"})


@app.get("/sw.js")
async def service_worker():
    js = (STATIC / "sw.js").read_text().replace("__V__", STATIC_VERSION["v"])
    return Response(js, media_type="text/javascript", headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"})


@app.get("/manifest.webmanifest")
async def manifest():
    return FileResponse(STATIC / "manifest.webmanifest", media_type="application/manifest+json")


app.mount("/static", StaticFiles(directory=STATIC), name="static")


# ---------------------------------------------------------------- cli for admin accounts

def cli():
    ap = argparse.ArgumentParser(description="kino admin accounts")
    sp = ap.add_subparsers(dest="cmd", required=True)
    a = sp.add_parser("adduser")
    a.add_argument("name")
    a.add_argument("--role", choices=["admin"], default="admin")
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
                print("They didn't match, try again")
                continue
            return pw

    if args.cmd == "adduser":
        if d.q("SELECT 1 FROM users WHERE username = ?", (name,)):
            sys.exit("That user already exists, use passwd to change the password")
        d.q("INSERT INTO users VALUES (?,?,?,?)", (name, hash_pw(ask()), "admin", time.time()))
        print(f"Added {name} as admin")
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
