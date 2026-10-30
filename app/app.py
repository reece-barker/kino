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
import random
import secrets
import shutil
import socket
import struct
import gzip
import sqlite3
import subprocess
import sys
import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote, urlencode, urljoin, urlparse

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
ADDON_ALLOW_PRIVATE = env("ADDON_ALLOW_PRIVATE", "0") == "1"  # Only for testing addons running on this machine
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
DEFAULT_PREFS = {"audio_lang": "English", "still_watching": 0, "load_stats": True, "sub_lang": "", "sub_size": "m", "autoplay": True, "skip_intro": False, "share_events": False, "blur_watched": False}

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
         "hi": "Hindi", "hin": "Hindi", "uk": "Ukrainian", "ukr": "Ukrainian", "ro": "Romanian", "rum": "Romanian", "ron": "Romanian",
         "pob": "Portuguese (Brazil)", "pt-br": "Portuguese (Brazil)", "hr": "Croatian", "hrv": "Croatian", "scc": "Serbian",
         "srp": "Serbian", "sr": "Serbian", "bg": "Bulgarian", "bul": "Bulgarian", "vi": "Vietnamese", "vie": "Vietnamese",
         "id": "Indonesian", "ind": "Indonesian", "th": "Thai", "tha": "Thai", "ms": "Malay", "may": "Malay", "sk": "Slovak",
         "slo": "Slovak", "sl": "Slovenian", "slv": "Slovenian", "fa": "Persian", "per": "Persian", "et": "Estonian",
         "est": "Estonian", "lv": "Latvian", "lav": "Latvian", "lt": "Lithuanian", "lit": "Lithuanian"}


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
CREATE TABLE IF NOT EXISTS addons (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE NOT NULL, manifest TEXT NOT NULL,
    enabled INTEGER DEFAULT 1, hidden TEXT DEFAULT '[]', added REAL, updated REAL);
CREATE TABLE IF NOT EXISTS seen (id TEXT PRIMARY KEY, kind TEXT, first REAL);
CREATE TABLE IF NOT EXISTS mylist (profile_id INTEGER, key TEXT, kind TEXT, title_id TEXT, name TEXT, poster TEXT,
    added REAL, checked REAL, PRIMARY KEY (profile_id, key));
CREATE TABLE IF NOT EXISTS kids_rules (key TEXT PRIMARY KEY, allow INTEGER);
CREATE TABLE IF NOT EXISTS cont_hidden (profile_id INTEGER, key TEXT, at REAL, PRIMARY KEY (profile_id, key));
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, code TEXT, name TEXT, ua TEXT, ip TEXT, status TEXT,
    created REAL, last_seen REAL);
CREATE TABLE IF NOT EXISTS search_recent (profile_id INTEGER, key TEXT, kind TEXT, title_id TEXT, name TEXT, poster TEXT,
    at REAL, PRIMARY KEY (profile_id, key));
CREATE TABLE IF NOT EXISTS auto_intros (file_id TEXT PRIMARY KEY, start REAL, end REAL, tried REAL);
CREATE TABLE IF NOT EXISTS stream_health (id TEXT PRIMARY KEY, good REAL, bad REAL);
CREATE TABLE IF NOT EXISTS streams (id TEXT PRIMARY KEY, url TEXT NOT NULL, kind TEXT, video_id TEXT, name TEXT, label TEXT,
    addon TEXT, poster TEXT, year TEXT, added REAL);
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

    def many(self, sql, rows):
        with self.lock:
            self.c.executemany(sql, rows)
            self.c.commit()


_db = None


def db():
    global _db
    if _db is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _db = DB(DATA_DIR / "kino.db")
        migrate()
    return _db


def migrate():
    d = _db
    cols = [r["name"] for r in d.q("PRAGMA table_info(profiles)")]
    if "kids" not in cols:
        d.q("ALTER TABLE profiles ADD COLUMN kids INTEGER DEFAULT 0")
    if "pin" not in cols:
        d.q("ALTER TABLE profiles ADD COLUMN pin TEXT")        # scrypt hash of the 4 digit code, nobody can read it back
    if "pending" not in cols:
        d.q("ALTER TABLE profiles ADD COLUMN pending INTEGER DEFAULT 0")  # asked for by someone, waiting for the admin
    if "device" not in [r["name"] for r in d.q("PRAGMA table_info(sessions)")]:
        # Admin sign ins are tied to the device they were made on now, old ones without it get signed out
        d.q("ALTER TABLE sessions ADD COLUMN device TEXT")
        d.q("DELETE FROM sessions")
    if d.q("PRAGMA user_version")[0]["user_version"] < 2:
        # English audio is the default now, profiles that never picked one get it
        for r in d.q("SELECT id, prefs FROM profiles"):
            pr = json.loads(r["prefs"] or "{}")
            if not pr.get("audio_lang"):
                pr["audio_lang"] = "English"
                d.q("UPDATE profiles SET prefs = ? WHERE id = ?", (json.dumps(pr), r["id"]))
        d.q("PRAGMA user_version = 2")
    # First run with profiles: makes one profile per old login and moves there watch progress over
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


# ---- allowed devices
# Websites cant read real hardware ids (serial numbers, mac addresses) so every browser or installed app gets
# its own random id in a long lasting cookie instead. The admin approves that device once and it works from any network
DEVICE_COOKIE = "kino_device"


def device_token(request):
    t = request.cookies.get(DEVICE_COOKIE, "")
    return t if re.fullmatch(r"[A-Za-z0-9_-]{32,64}", t) else None


def device_key(token):
    return hashlib.sha256(token.encode()).hexdigest()


def device_code(token):
    # Short code people can read out, made from the id so it never changes for that device
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    n = int(device_key(token)[:12], 16)
    chars = "".join(alphabet[(n >> (5 * i)) & 31] for i in range(6))
    return f"{chars[:3]}-{chars[3:]}"


def device_allowed(request):
    t = device_token(request)
    if not t:
        return False
    row = db().q("SELECT status, last_seen FROM devices WHERE id = ?", (device_key(t),))
    if not row or row[0]["status"] != "allowed":
        return False
    if time.time() - (row[0]["last_seen"] or 0) > 300:
        db().q("UPDATE devices SET last_seen = ?, ip = ? WHERE id = ?", (time.time(), client_ip(request), device_key(t)))
    return True


def access_ok(request):
    return ip_allowed(client_ip(request)) or device_allowed(request)


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


def ua_family(ua):
    """Browser plus os, like chrome on windows. Stays the same through browser updates but not across browsers,
    so cookies copied into another browser (edge and brave copy chromes on first run) dont carry the admin over"""
    ua = str(ua or "")
    br = next((n for k, n in (("KinoAndroid", "kinoapp"), ("Silk", "silk"), ("Edg", "edge"), ("OPR", "opera"), ("Brave", "brave"),
                               ("SamsungBrowser", "samsung"), ("Firefox", "firefox"), ("Chrome", "chrome"), ("Safari", "safari")) if k in ua), "other")
    os_ = next((n for k, n in (("Android", "android"), ("iPhone", "ios"), ("iPad", "ios"), ("Windows", "windows"), ("Mac OS", "mac"),
                               ("CrOS", "chromeos"), ("Linux", "linux")) if k in ua), "other")
    return f"{br}/{os_}"


def browser_key(request):
    # The long lived device cookie plus the browser type, a session only counts on the device it was made on
    return f"{request.cookies.get(DEVICE_COOKIE, '')}|{ua_family(request.headers.get('user-agent'))}"


def admin_user(request):
    tok = request.cookies.get("kino_admin")
    if not tok:
        return None
    rows = db().q("SELECT s.username, s.expires, s.device FROM sessions s JOIN users u ON u.username = s.username "
                  "WHERE s.token_hash = ? AND u.role = 'admin'", (tok_hash(tok),))
    if not rows or rows[0]["expires"] < time.time():
        return None
    if rows[0]["device"] and not hmac.compare_digest(rows[0]["device"], tok_hash(browser_key(request))):
        return None
    return rows[0]["username"]


def require_admin(request: Request):
    u = admin_user(request)
    if not u:
        raise HTTPException(401, "Sign in as admin to do that")
    return u


def profile_row(pid):
    rows = db().q("SELECT id, name, icon, prefs, kids, pin, pending FROM profiles WHERE id = ?", (pid,))
    if not rows or rows[0]["pending"]:
        return None
    r = rows[0]
    prefs = {**DEFAULT_PREFS, **(json.loads(r["prefs"] or "{}"))}
    return {"id": r["id"], "name": r["name"], "icon": r["icon"], "prefs": prefs, "kids": bool(r["kids"]), "locked": bool(r["pin"])}


def profile_cookie(pid, request):
    return f"{pid}.{sign('profile', pid, browser_key(request))[:32]}"


def cookie_profile(request):
    # The cookie is signed and tied to this device, so nobody can switch into a locked profile by changing the number
    # in it, and a copied cookie on another device just lands on the profile picker
    raw = request.cookies.get("kino_profile", "")
    pid, _, sig = raw.partition(".")
    if not pid.isdigit() or not hmac.compare_digest(sig, sign("profile", int(pid), browser_key(request))[:32]):
        return None
    return profile_row(int(pid))


def current_profile(request: Request):
    p = cookie_profile(request)
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
        vids.append({"id": v.get("id"), "season": v.get("season"), "episode": v.get("episode") or v.get("number"),
                     "name": unesc(v.get("name") or v.get("title")), "overview": unesc(v.get("overview") or v.get("description")),
                     "thumbnail": v.get("thumbnail"), "released": v.get("released")})
    return {
        "id": i, "kind": kind, "name": m.get("name"), "description": m.get("description"),
        "genres": m.get("genres") or m.get("genre") or [], "releaseInfo": m.get("releaseInfo") or m.get("year"),
        "runtime": m.get("runtime"), "rating": m.get("imdbRating"), "cast": (m.get("cast") or [])[:10],
        "popularity": (m.get("popularities") or {}).get("moviedb") or m.get("popularity"),
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
                if ov and str(ov["imdb_id"]).startswith("tt"):
                    m = await cinemeta_meta(client, ov["kind"], ov["imdb_id"])
                elif ov:
                    m = await addon_meta(ov["kind"], ov["imdb_id"])
                else:
                    m = await cinemeta_lookup(client, kind, name, year)
                    if not m:
                        # Cinemeta only knows imdb titles, so anime and the like get a go through the installed addons
                        hits = [x for x in await addon_search(kind, name, limit_per=3) if x[2].get("id")]
                        if hits:
                            m = await addon_meta(kind, hits[0][2]["id"]) or slim_meta(hits[0][2], kind)
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


# ---------------------------------------------------------------- automatic intro detection

def intro_jobs():
    """Seasons with at least two episodes where some episode hasnt been looked at yet"""
    done = {r["file_id"] for r in db().q("SELECT file_id FROM auto_intros")}
    jobs = []
    for t in LIB["titles"].values():
        if t["kind"] != "series":
            continue
        seasons = {}
        for fid in t["files"]:
            f = LIB["files"][fid]
            if f["season"] is not None and f["episode"] is not None:
                seasons.setdefault(f["season"], []).append(f)
        for season, eps in seasons.items():
            if len(eps) >= 2 and any(f["id"] not in done for f in eps):
                if db().q("SELECT 1 FROM intros WHERE title_id = ? AND season = ?", (t["id"], season)):
                    continue  # the admin already marked this season, no need
                jobs.append(sorted(eps, key=lambda f: f["episode"]))
    return jobs


async def intro_worker():
    import introdetect
    await asyncio.sleep(float(env("INTRO_START_DELAY", "120")))  # Lets the first scan and probes go first
    while True:
        try:
            for eps in intro_jobs()[:5]:
                found = await asyncio.to_thread(introdetect.find_intros, [f["path"] for f in eps])
                now = time.time()
                for f in eps:
                    se = found.get(f["path"])
                    db().q("INSERT OR REPLACE INTO auto_intros VALUES (?,?,?,?)", (f["id"], se[0] if se else None, se[1] if se else None, now))
                log.info("intro detection: found %d of %d in %s", len(found), len(eps), Path(eps[0]["path"]).parent.name)
        except Exception as e:
            log.warning("intro detection failed: %s", e)
        await asyncio.sleep(600)


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

TS_KEYS = {"ExecMainStartTimestamp", "ExecMainExitTimestamp", "NextElapseUSecRealtime", "LastTriggerUSec"}


def to_unix(v):
    # Some systemd versions ignore --timestamp=unix for timer properties and print "Fri 2026-10-30 03:00:00 CET"
    # or plain microseconds, which showed up as Invalid Date on the sync page
    if v.isdigit():
        n = int(v)
        return n // 1_000_000 if n > 10**12 else n or None
    if v in ("n/a", "0", ""):
        return None
    try:
        out = subprocess.run(["date", "-d", v, "+%s"], capture_output=True, text=True, timeout=3).stdout.strip()
        return int(out) if out.isdigit() else None
    except Exception:
        return None


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
            elif k in TS_KEYS and v:
                v = to_unix(v)
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
        voice_unload()



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

    tasks = [asyncio.create_task(c()) for c in (scanner, stats_worker, session_reaper, probe_worker, catalog_worker, intro_worker, backup_worker)]
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
    if path.startswith("/api/") and not path.startswith(("/api/dl/", "/api/gate", "/api/x/")) and not access_ok(request):
        log.warning("kino blocked ip=%s path=%s", client_ip(request), path)
        return JSONResponse({"detail": "This network or device isn't on the allow list"}, status_code=403)
    resp = await call_next(request)
    if not device_token(request) and (path in ("/", "/gate") or path.startswith("/api/me")):
        set_cookie(resp, DEVICE_COOKIE, secrets.token_urlsafe(32), 10 * 365 * 86400)
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"  # Mic is only for voice search
    if path.startswith("/api/") and "cache-control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store"
    return resp


def set_cookie(resp, name, value, max_age):
    resp.set_cookie(name, value, max_age=max_age, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/")


# ---------------------------------------------------------------- database backups
# Every night a copy of kino.db (profiles, watch history, ratings, addons, devices) goes to the Storage Box. Restoring
# is done on the server with: sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py restore FILE, see the README
BACKUP_DIR = Path(env("BACKUP_DIR", str(MEDIA_DIR / "kino-backups")))
BACKUP_NAME = re.compile(r"^kino-(\d{4}-\d{2}-\d{2})-(\d{4})\.db\.gz$")
BACKUP_STATE = DATA_DIR / "backup.json"


def backup_now():
    """Copies the live database with sqlite's own backup (safe while kino is running), gzips it onto the storage box"""
    if not box_mounted():
        raise RuntimeError("The Storage Box isn't connected, so the backup was skipped")
    # Never makes the backup folder on the vps disk: if the box dropped since the check, writing into the empty mount
    # folder would leave files there and sshfs then refuses to mount over them
    if not BACKUP_DIR.exists():
        if not box_mounted():
            raise RuntimeError("The Storage Box disconnected, so the backup was skipped")
        BACKUP_DIR.mkdir(exist_ok=True)
    name = time.strftime("kino-%Y-%m-%d-%H%M.db.gz")
    tmp = DATA_DIR / "backup.tmp.db"
    tmp.unlink(missing_ok=True)
    src = sqlite3.connect(str(DATA_DIR / "kino.db"))
    dst = sqlite3.connect(str(tmp))
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    if not box_mounted():
        tmp.unlink(missing_ok=True)
        raise RuntimeError("The Storage Box disconnected during the backup, it was skipped")
    part = BACKUP_DIR / (name + ".part")
    with open(tmp, "rb") as fi, gzip.open(part, "wb", compresslevel=6) as fo:
        shutil.copyfileobj(fi, fo, 1 << 20)
    part.rename(BACKUP_DIR / name)
    tmp.unlink(missing_ok=True)
    prune_backups()
    return name


def backup_list():
    out = []
    try:
        for f in BACKUP_DIR.iterdir():
            m = BACKUP_NAME.match(f.name)
            if m:
                st = f.stat()
                out.append({"name": f.name, "size": st.st_size, "at": st.st_mtime, "day": m.group(1)})
    except OSError:
        pass
    return sorted(out, key=lambda x: x["name"], reverse=True)


def prune_backups():
    # Keeps the last 14 nights, and the newest one from each of the last 6 months
    keep, months = set(), []
    items = backup_list()
    for b in items[:14]:
        keep.add(b["name"])
    for b in items:
        mon = b["day"][:7]
        if mon not in months:
            months.append(mon)
            if len(months) <= 6:
                keep.add(b["name"])
    for b in items:
        if b["name"] not in keep:
            (BACKUP_DIR / b["name"]).unlink(missing_ok=True)


def backup_state(**kw):
    st = read_json(str(BACKUP_STATE)) or {}
    if kw:
        st.update(kw)
        BACKUP_STATE.write_text(json.dumps(st))
    return st


async def run_backup():
    try:
        name = await asyncio.to_thread(backup_now)
        backup_state(last=time.time(), last_name=name, error=None)
        log.info("kino backup saved %s", name)
        return name
    except Exception as e:
        backup_state(error=str(e), error_at=time.time())
        log.warning("kino backup failed: %s", e)
        raise


async def backup_worker():
    # Runs once a day, around 4 in the morning when nobody is watching, or straight away if the last one is over a day old
    await asyncio.sleep(120)
    while True:
        st = backup_state()
        age = time.time() - (st.get("last") or 0)
        if age > 26 * 3600 or (age > 20 * 3600 and time.localtime().tm_hour == 4):
            try:
                await run_backup()
            except Exception:
                pass
        await asyncio.sleep(1800)


@app.get("/api/admin/backups")
async def backups_get(admin=Depends(require_admin)):
    st = backup_state()
    return {"last": st.get("last"), "error": st.get("error"), "error_at": st.get("error_at"), "mounted": box_mounted(),
            "dir": str(BACKUP_DIR), "backups": await asyncio.to_thread(backup_list)}


@app.post("/api/admin/backups")
async def backups_run(admin=Depends(require_admin)):
    try:
        name = await run_backup()
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"ok": True, "name": name}


@app.get("/api/admin/backups/{name}")
async def backups_download(name: str, admin=Depends(require_admin)):
    if not BACKUP_NAME.match(name) or not (BACKUP_DIR / name).exists():
        raise HTTPException(404, "That backup isn't there")
    return FileResponse(BACKUP_DIR / name, media_type="application/gzip", filename=name)


def restore_backup(path):
    """Puts a backup back. The current database gets kept next to it first, so a restore can be undone"""
    src = Path(path)
    if not src.exists():
        sys.exit(f"{src} doesn't exist")
    live = DATA_DIR / "kino.db"
    tmp = DATA_DIR / "restore.tmp.db"
    opener = gzip.open if src.name.endswith(".gz") else open
    with opener(src, "rb") as fi, open(tmp, "wb") as fo:
        shutil.copyfileobj(fi, fo, 1 << 20)
    try:
        chk = sqlite3.connect(str(tmp))
        ok = chk.execute("PRAGMA integrity_check").fetchone()[0]
        chk.close()
    except sqlite3.DatabaseError:
        ok = "not a database"
    if ok != "ok":
        tmp.unlink()
        sys.exit("That backup is damaged, nothing was changed")
    keep = DATA_DIR / time.strftime("kino-before-restore-%Y%m%d-%H%M%S.db")
    had = live.exists()
    if had:
        b = sqlite3.connect(str(live)); k = sqlite3.connect(str(keep))
        b.backup(k); k.close(); b.close()
    for ext in ("-wal", "-shm"):
        Path(str(live) + ext).unlink(missing_ok=True)
    tmp.replace(live)
    print(f"Restored {src.name}." + (f" The old database was kept as {keep.name}." if had else "") + " Start kino again with: systemctl start kino")


# ---------------------------------------------------------------- watch history

def history_item(r):
    """One row of a profile's watch history, shaped for the History page"""
    fid = r["file_id"]
    base = {"file_id": fid, "updated": r["updated"], "pos": r["pos"], "dur": r["dur"], "watched": bool(r["watched"])}
    if fid.startswith("s"):
        st = db().q("SELECT * FROM streams WHERE id = ?", (fid,))
        if not st:
            return None
        st = st[0]
        parts = st["video_id"].split(":")
        se = (int(parts[-2]), int(parts[-1])) if st["kind"] == "series" and len(parts) >= 3 and parts[-1].isdigit() and parts[-2].isdigit() else (None, None)
        show = show_of(st["video_id"])
        prev = ext_preview({"id": show, "name": st["name"], "poster": st["poster"], "releaseInfo": st["year"]}, st["kind"])
        return {**base, "stream": True, "kind": st["kind"], "name": st["name"], "season": se[0], "episode": se[1], "ep_name": None,
                "poster": prev["poster"], "background": prev["background"], "thumbnail": None, "href": f"#/discover/{st['kind']}/{quote(show, safe='')}"}
    f = LIB["files"].get(fid)
    t = LIB["titles"].get(f["title_id"]) if f else None
    if not t:
        return None
    m = meta_for(t) or {}
    ep = next((v for v in m.get("videos", []) if v.get("season") == f["season"] and v.get("episode") == f["episode"]), {}) if f["season"] is not None else {}
    return {**base, "stream": False, "kind": m.get("kind") or t["kind"], "name": m.get("name") or t["guess_name"], "title_id": t["id"],
            "season": f["season"], "episode": f["episode"], "ep_name": ep.get("name"), "poster": m.get("poster"),
            "background": m.get("background"), "thumbnail": ep.get("thumbnail"), "href": f"#/title/{t['id']}",
            "genres": m.get("genres") or []}


@app.get("/api/history")
async def history(before: float = 0, p=Depends(current_profile)):
    rows = db().q("SELECT file_id, pos, dur, watched, updated FROM watch WHERE profile_id = ? AND (? = 0 OR updated < ?) "
                  "ORDER BY updated DESC LIMIT 80", (p["id"], before, before))
    items = []
    for r in rows:
        it = history_item(r)
        if not it:
            continue
        if p.get("kids") and not it["stream"] and not kids_ok(it.get("genres"), kid_key(None, it.get("title_id"))):
            continue
        items.append(it)
    return {"items": items, "next": rows[-1]["updated"] if len(rows) == 80 else None}


@app.delete("/api/history")
async def history_remove(file_id: str = "", p=Depends(current_profile)):
    # Taking something out of history also takes away its progress and watched tick
    if file_id:
        db().q("DELETE FROM watch WHERE profile_id = ? AND file_id = ?", (p["id"], file_id))
    else:
        db().q("DELETE FROM watch WHERE profile_id = ?", (p["id"],))
        db().q("DELETE FROM cont_hidden WHERE profile_id = ?", (p["id"],))
    return {"ok": True}

# ---- profiles and admin sign in

def pub_profile(p):
    return {"id": p["id"], "name": p["name"], "icon": p["icon"]}


@app.get("/api/me")
async def me(request: Request):
    return {"profile": cookie_profile(request), "admin": admin_user(request), "ip": client_ip(request)}


@app.get("/api/profiles")
async def profiles(request: Request):
    rows = db().q("SELECT id, name, icon, kids, pin, pending FROM profiles ORDER BY id")
    out = {"profiles": [{"id": r["id"], "name": r["name"], "icon": r["icon"], "kids": bool(r["kids"]), "locked": bool(r["pin"])}
                        for r in rows if not r["pending"]], "admin": admin_user(request)}
    if admin_user(request):
        out["pending"] = [{"id": r["id"], "name": r["name"], "icon": r["icon"]} for r in rows if r["pending"]]
    return out


@app.post("/api/profiles/{pid}/select")
async def profile_select(pid: int, request: Request):
    p = profile_row(pid)
    if not p:
        raise HTTPException(404, "That profile doesn't exist anymore")
    if p["locked"]:
        try:
            b = await request.json()
        except Exception:
            b = {}
        ip = client_ip(request)
        tries = [t for t in PIN_TRIES.get(ip, []) if time.time() - t < 300]
        if len(tries) >= 8:
            raise HTTPException(429, "Too many wrong codes, wait a few minutes and try again")
        row = db().q("SELECT pin FROM profiles WHERE id = ?", (pid,))
        code = str(b.get("pin") or "")
        if not code:
            raise HTTPException(401, "This profile is locked")
        if not re.fullmatch(r"\d{4}", code) or not check_pw(code, row[0]["pin"]):
            PIN_TRIES[ip] = tries + [time.time()]
            raise HTTPException(403, "That code isn't right")
        PIN_TRIES.pop(ip, None)
    resp = JSONResponse({"ok": True, "profile": p})
    set_cookie(resp, "kino_profile", profile_cookie(pid, request), 365 * 86400)
    return resp


PIN_TRIES = {}


@app.post("/api/profile/pin")
async def profile_pin(request: Request, p=Depends(current_profile)):
    """Sets, changes or removes this profile's 4 digit code. Changing or removing it needs the old one"""
    b = await request.json()
    new, old = str(b.get("pin") or ""), str(b.get("old") or "")
    row = db().q("SELECT pin FROM profiles WHERE id = ?", (p["id"],))
    if row[0]["pin"] and not (re.fullmatch(r"\d{4}", old) and check_pw(old, row[0]["pin"])):
        raise HTTPException(403, "The current code isn't right")
    if new and not re.fullmatch(r"\d{4}", new):
        raise HTTPException(400, "The code has to be 4 numbers")
    db().q("UPDATE profiles SET pin = ? WHERE id = ?", (hash_pw(new) if new else None, p["id"]))
    return {"ok": True, "profile": profile_row(p["id"])}


@app.post("/api/admin/profiles/{pid}/pin-reset")
async def profile_pin_reset(pid: int, admin=Depends(require_admin)):
    # The admin can take a lock off but never sees the code, its only stored as a hash
    db().q("UPDATE profiles SET pin = NULL WHERE id = ?", (pid,))
    log.info("kino profile %s lock removed by %s", pid, admin)
    return {"ok": True}


@app.post("/api/profiles/request")
async def profile_request(request: Request):
    """Someone asks for there own profile, it shows up for the admin to approve"""
    b = await request.json()
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE pending = 1")[0]["n"] >= 5:
        raise HTTPException(429, "There are already a few profiles waiting, ask the admin to look at them")
    if db().q("SELECT COUNT(*) AS n FROM profiles")[0]["n"] >= 12:
        raise HTTPException(400, "Kino already has the maximum of 12 profiles")
    db().q("INSERT INTO profiles (name, icon, prefs, created, kids, pending) VALUES (?,?,?,?,?,?)",
           (clean_name(b.get("name")), clean_icon(b.get("icon", 0)), json.dumps(DEFAULT_PREFS), time.time(), 0, 1))
    log.info("kino profile requested from %s", client_ip(request))
    return {"ok": True}


@app.post("/api/admin/profiles/{pid}/approve")
async def profile_approve(pid: int, admin=Depends(require_admin)):
    db().q("UPDATE profiles SET pending = 0 WHERE id = ?", (pid,))
    return {"ok": True}


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
        elif k in ("autoplay", "skip_intro", "share_events", "blur_watched", "load_stats"):
            prefs[k] = bool(v)
        elif k == "still_watching":
            # Minutes without touching anything before the player asks if anyones still there, 0 is off
            prefs[k] = int(v) if str(v).isdigit() and int(v) in (0, 30, 60, 90, 120, 180, 240) else 0
    db().q("UPDATE profiles SET name = ?, icon = ?, prefs = ? WHERE id = ?", (name, icon, json.dumps(prefs), p["id"]))
    return {"ok": True, "profile": profile_row(p["id"])}


@app.post("/api/admin/profiles")
async def profile_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if db().q("SELECT COUNT(*) AS n FROM profiles")[0]["n"] >= 12:
        raise HTTPException(400, "That's the maximum of 12 profiles")
    db().q("INSERT INTO profiles (name, icon, prefs, created, kids) VALUES (?,?,?,?,?)",
           (clean_name(b.get("name")), clean_icon(b.get("icon", 0)), json.dumps(DEFAULT_PREFS), time.time(), 1 if b.get("kids") else 0))
    log.info("kino profile added by %s", admin)
    return {"ok": True}


@app.put("/api/admin/profiles/{pid}")
async def profile_admin_edit(pid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if not profile_row(pid):
        raise HTTPException(404, "That profile doesn't exist")
    db().q("UPDATE profiles SET name = ?, icon = ? WHERE id = ?", (clean_name(b.get("name")), clean_icon(b.get("icon")), pid))
    if "kids" in b:
        db().q("UPDATE profiles SET kids = ? WHERE id = ?", (1 if b["kids"] else 0, pid))
    return {"ok": True}


@app.delete("/api/admin/profiles/{pid}")
async def profile_delete(pid: int, admin=Depends(require_admin)):
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE pending = 0")[0]["n"] <= 1 and not db().q("SELECT 1 FROM profiles WHERE id = ? AND pending = 1", (pid,)):
        raise HTTPException(400, "Keep at least one profile")
    for t in ("watch", "ratings", "mylist"):
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
    db().q("INSERT INTO sessions (token_hash, username, created, expires, ip, ua, device) VALUES (?,?,?,?,?,?,?)",
           (tok_hash(tok), user, time.time(), exp, ip, request.headers.get("user-agent", "")[:200], tok_hash(browser_key(request))))
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


# ---- kids profiles
# A title is fine for kids when its genres say family or animation and nothing scary, the admin can override any title
KID_GENRES = {"animation", "family", "kids", "children"}
KID_BLOCK = {"horror", "thriller", "crime", "war", "mystery", "adult", "erotic", "ecchi", "hentai", "psychological", "gore"}


def kid_key(meta_id, tid=None):
    return meta_id or f"lib:{tid}"


def kids_ok(genres, key):
    rule = db().q("SELECT allow FROM kids_rules WHERE key = ?", (key,)) if key else []
    if rule:
        return bool(rule[0]["allow"])
    g = {str(x).lower() for x in genres or []}
    return bool(g & KID_GENRES) and not (g & KID_BLOCK)


def title_allowed(p, t, meta):
    if p.get("kids") and not kids_ok((meta or {}).get("genres"), kid_key((meta or {}).get("id"), t["id"])):
        raise HTTPException(404, "That title isn't available on this profile")


def kids_profile(pid):
    r = db().q("SELECT kids FROM profiles WHERE id = ?", (pid,))
    return bool(r and r[0]["kids"])


def all_summaries(pid):
    wm, rm = watch_map(pid), rating_map(pid)
    out = [title_summary(t, meta_for(t), wm, rm) for t in LIB["titles"].values()]
    if kids_profile(pid):
        out = [s for s in out if kids_ok(s["genres"], kid_key(s.get("imdb"), s["id"]))]
    return out, wm, rm


def imdb_score(s):
    try:
        return float(s["rating"])
    except (TypeError, ValueError):
        return 6.0


def genre_weights(summ, since=0, rated_at=None):
    # What this profile likes, built from thumbs and what they actualy watched. After a reset only what happened
    # since then counts
    w = {}
    rated_at = rated_at or {}
    for s in summ:
        if since and (s["last_activity"] or 0) < since and (rated_at.get(s["id"], 0) or 0) < since:
            continue
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


def continue_list(summ, wm, pid=None):
    out, seen = [], set()
    rows = sorted(wm.values(), key=lambda r: r["updated"], reverse=True)
    by_id = {s["id"]: s for s in summ}
    # Things someone removed from Continue Watching stay gone until they watch them again
    hidden = {r["key"]: r["at"] for r in db().q("SELECT key, at FROM cont_hidden WHERE profile_id = ?", (pid,))} if pid else {}
    for r in rows:
        if r["file_id"].startswith("s"):
            st = db().q("SELECT * FROM streams WHERE id = ?", (r["file_id"],))
            show = show_of(st[0]["video_id"]) if st else None
            if show and hidden.get(show, 0) >= r["updated"]:
                seen.add(show)
                continue
            if st and not r["watched"] and r["dur"] and 0.02 < r["pos"] / r["dur"] < 0.93 and show not in seen:
                st = dict(st[0])
                seen.add(show)
                parts = st["video_id"].split(":")
                se = (int(parts[-2]), int(parts[-1])) if st["kind"] == "series" and len(parts) >= 3 and parts[-1].isdigit() and parts[-2].isdigit() else (None, None)
                out.append({**ext_preview({"id": show, "name": st["name"], "poster": st["poster"], "releaseInfo": st["year"]}, st["kind"]),
                            "file_id": st["id"], "stream": True, "pos": r["pos"], "dur": r["dur"], "season": se[0],
                            "episode": se[1], "next_episode": False})
            continue
        f = LIB["files"].get(r["file_id"])
        if not f or f["title_id"] in seen:
            continue
        if hidden.get(f["title_id"], 0) >= r["updated"]:
            seen.add(f["title_id"])
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


@app.post("/api/continue/hide")
async def continue_hide(request: Request, p=Depends(current_profile)):
    b = await request.json()
    fid = str(b.get("file_id") or "")
    if fid.startswith("s"):
        key = show_of(stream_row(fid)["video_id"])
    elif fid in LIB["files"]:
        key = LIB["files"][fid]["title_id"]
    else:
        raise HTTPException(404, "Unknown file")
    db().q("INSERT OR REPLACE INTO cont_hidden VALUES (?,?,?)", (p["id"], key, time.time()))
    return {"ok": True}


@app.get("/api/library")
async def library(p=Depends(current_profile)):
    summ, wm, rm = all_summaries(p["id"])
    pool = addon_pool(p["id"], lib_by_meta_id(summ))
    if p.get("kids"):
        pool = [s for s in pool if kids_ok(s["genres"], s["imdb"])]
    summ = summ + pool
    summ.sort(key=lambda x: x["added"], reverse=True)
    return {"titles": summ, "scanned_at": LIB["scanned_at"], "scanning": LIB["scanning"],
            "error": LIB["error"], "files": len(LIB["files"]), "mounted": box_mounted()}



# ---- interests: things a profile tells Kino it likes (a genre, an actor or director, any word), plus ones Kino picks
# up from what they've been watching lately. They push matching titles up in recommendations

def prof_prefs(pid):
    r = db().q("SELECT prefs FROM profiles WHERE id = ?", (pid,))
    return json.loads(r[0]["prefs"] or "{}") if r else {}


def save_prefs(pid, pr):
    db().q("UPDATE profiles SET prefs = ? WHERE id = ?", (json.dumps(pr), pid))


def lib_people():
    """How many library titles each actor and director is in, used for suggestions and to tell what kind of interest a word is"""
    count = {}
    for t in LIB["titles"].values():
        cast, directors = people_of(meta_for(t) or {})
        for n in set(cast[:6] + directors):
            count[n] = count.get(n, 0) + 1
    return count


def lib_genres(summ):
    g = {}
    for s in summ:
        for x in s["genres"]:
            g[x] = g.get(x, 0) + 1
    return g


def interest_kind(name, summ):
    n = norm(name)
    if any(norm(g) == n for g in lib_genres(summ)):
        return "genre"
    if any(norm(x) == n for x in lib_people()):
        return "person"
    return "word"


def pick_up_interests(p, summ):
    """Looks at the last two weeks: a director or actor in 2+ titles they watched, or a genre in 3+, becomes an interest
    on its own. Ones they removed before stay removed"""
    pr = prof_prefs(p["id"])
    have = {norm(i["name"]) for i in pr.get("interests", [])} | {norm(x) for x in pr.get("dismissed", [])}
    since = max(time.time() - 14 * 86400, pr.get("reset_at") or 0)
    recent = [s for s in summ if (s["last_activity"] or 0) >= since and (s["watched_count"] or s["my_rating"] > 0)]
    people, genres = {}, {}
    for s in recent:
        cast, directors = people_of(meta_for(LIB["titles"][s["id"]]) or {})
        for n in set(directors + cast[:4]):
            people[n] = people.get(n, 0) + 1
        for g in s["genres"]:
            genres[g] = genres.get(g, 0) + 1
    new = [(n, "person") for n, c in sorted(people.items(), key=lambda x: -x[1]) if c >= 2]
    new += [(g, "genre") for g, c in sorted(genres.items(), key=lambda x: -x[1]) if c >= 3 and c >= len(recent) * 0.4]
    added = []
    for name, kind in new[:4]:
        if norm(name) in have:
            continue
        pr.setdefault("interests", []).append({"name": name, "kind": kind, "auto": True, "at": time.time()})
        have.add(norm(name))
        added.append(name)
    if added:
        save_prefs(p["id"], pr)
    return added


def interest_boost(s, ints):
    """Extra score for a title that matches the profile's interests"""
    if not ints:
        return 0.0
    m = meta_for(LIB["titles"][s["id"]]) if s.get("id") and s["id"] in LIB["titles"] else None
    cast, directors = people_of(m or {})
    people = {norm(x) for x in cast[:8] + directors}
    genres = {norm(g) for g in s["genres"]}
    text = norm(f"{s.get('name', '')} {s.get('description') or ''}")
    b = 0.0
    for i in ints:
        n = norm(i["name"])
        if i["kind"] == "genre" and n in genres:
            b += 3
        elif i["kind"] == "person" and n in people:
            b += 5
        elif i["kind"] == "word" and (n in genres or f" {n} " in f" {text} " or n in people):
            b += 2.5
    return min(b, 9.0)


def interest_matches(s, i):
    return interest_boost(s, [i]) > 0


@app.get("/api/interests")
async def interests_get(p=Depends(current_profile)):
    summ, _, _ = all_summaries(p["id"])
    pick_up_interests(p, summ)
    pr = prof_prefs(p["id"])
    mine = pr.get("interests", [])
    have = {norm(i["name"]) for i in mine}
    gs = sorted(lib_genres(summ).items(), key=lambda x: -x[1])
    ppl = sorted(lib_people().items(), key=lambda x: -x[1])
    sugg = [{"name": g, "kind": "genre"} for g, _ in gs if norm(g) not in have][:10] + \
           [{"name": n, "kind": "person"} for n, c in ppl if c >= 2 and norm(n) not in have][:8]
    return {"interests": mine, "suggestions": sugg, "reset_at": pr.get("reset_at")}


@app.post("/api/interests")
async def interests_add(request: Request, p=Depends(current_profile)):
    b = await request.json()
    name = re.sub(r"\s+", " ", str(b.get("name") or "")).strip()[:40]
    if len(name) < 2:
        raise HTTPException(400, "Type what you're into, like Heist, Quentin Tarantino or Space")
    summ, _, _ = all_summaries(p["id"])
    pr = prof_prefs(p["id"])
    ints = pr.setdefault("interests", [])
    if any(norm(i["name"]) == norm(name) for i in ints):
        raise HTTPException(400, "That's already one of your interests")
    if len(ints) >= 30:
        raise HTTPException(400, "That's the most interests a profile can have, remove one first")
    ints.append({"name": name, "kind": b.get("kind") if b.get("kind") in ("genre", "person", "word") else interest_kind(name, summ), "auto": False, "at": time.time()})
    pr["dismissed"] = [x for x in pr.get("dismissed", []) if norm(x) != norm(name)]
    save_prefs(p["id"], pr)
    return {"ok": True}


@app.delete("/api/interests")
async def interests_remove(name: str, p=Depends(current_profile)):
    pr = prof_prefs(p["id"])
    gone = [i for i in pr.get("interests", []) if norm(i["name"]) == norm(name)]
    pr["interests"] = [i for i in pr.get("interests", []) if norm(i["name"]) != norm(name)]
    if any(i.get("auto") for i in gone):
        # Picked up on its own, so it isnt picked up again
        pr.setdefault("dismissed", []).append(name)
    save_prefs(p["id"], pr)
    return {"ok": True}


@app.post("/api/interests/reset")
async def interests_reset(p=Depends(current_profile)):
    # Starts recommendations fresh: interests go and what was watched or rated before now stops counting towards them
    pr = prof_prefs(p["id"])
    pr["interests"], pr["dismissed"], pr["reset_at"] = [], [], time.time()
    save_prefs(p["id"], pr)
    return {"ok": True}

@app.get("/api/home")
async def home(request: Request, p=Depends(current_profile)):
    summ, wm, rm = all_summaries(p["id"])
    now = time.time()
    pick_up_interests(p, summ)
    pr = prof_prefs(p["id"])
    ints = pr.get("interests", [])
    since = pr.get("reset_at") or 0
    rated_at = {r["title_id"]: r["updated"] for r in db().q("SELECT title_id, updated FROM ratings WHERE profile_id = ?", (p["id"],))} if since else {}
    weights = genre_weights(summ, since, rated_at)
    has_signal = any(v > 0 for v in weights.values()) or bool(ints)
    visible = [s for s in summ if s["my_rating"] != -1]
    for s in visible:
        s["score"] = rec_score(s, weights, now) + interest_boost(s, ints)
    by_score = sorted(visible, key=lambda s: s["score"], reverse=True)
    recent = sorted(summ, key=lambda s: s["added"], reverse=True)

    hero_pool = [s for s in (by_score if has_signal else recent) if s["background"] and s["matched"] and not s["watched"]]
    hero = (hero_pool or [s for s in recent if s["background"]] or recent)[:5]

    # Titles from addons that can actually play something get mixed into the main shelves with the library
    pool = addon_pool(p["id"], lib_by_meta_id(summ))
    if p.get("kids"):
        pool = [s for s in pool if kids_ok(s["genres"], s["imdb"])]
    for s in pool:
        s["score"] = rec_score(s, weights, now) + interest_boost(s, ints)
    by_score = sorted(visible + pool, key=lambda s: s["score"], reverse=True)
    recent = sorted(summ + pool, key=lambda s: s["added"], reverse=True)

    cont = continue_list(summ, wm, p["id"])
    first = next((c for c in cont if c.get("background")), None)
    if first:
        # The hero always starts with whatever was watched last, in its own continue style
        hero = [{**first, "cont": True}] + [h for h in hero if h["id"] != first.get("id") or first.get("stream")][:5]
    shelves = []
    mine, fresh = mylist_items(p, summ, wm)
    if fresh:
        shelves.append({"id": "fresh", "title": "New Episodes in My List", "style": "fresh", "items": fresh[:6]})
    if cont:
        shelves.append({"id": "continue", "title": f"Continue Watching for {p['name']}", "style": "continue", "items": cont})
    if has_signal:
        picks = [s for s in by_score if not s["watched"]][:13]
        # Every few picks is something well rated from outside what they usually watch, so there's always room for
        # something new to become an interest
        outside = [s for s in sorted(visible + pool, key=imdb_score, reverse=True)
                   if not s["watched"] and s not in picks and imdb_score(s) >= 7 and not interest_boost(s, ints)
                   and not set(s["genres"]) & {g for g, v in sorted(weights.items(), key=lambda x: -x[1])[:3]}]
        random.Random(int(now // 86400) + p["id"]).shuffle(outside)
        for k, s in enumerate(outside[:3]):
            picks.insert(3 + k * 4, s)
        if picks:
            shelves.append({"id": "picks", "title": f"Top Picks for {p['name']}", "style": "poster", "items": picks})
    if mine:
        shelves.append({"id": "mylist", "title": "My List", "style": "poster", "items": mine[:24]})
    # A row for each of the newest two interests that has enough titles to fill one
    rows = 0
    for i in sorted(ints, key=lambda x: -(x.get("at") or 0)):
        items = [s for s in by_score if interest_matches(s, i)] if rows < 2 else []
        if len(items) >= 3:
            rows += 1
            shelves.append({"id": "int-" + norm(i["name"]).replace(" ", "-"), "title": f"Because You Like {i['name']}", "style": "poster", "items": items[:16]})
    fam = family_liked(p, summ)
    if len(fam) >= 2:
        shelves.append({"id": "family", "title": "Loved by the Family", "style": "poster", "items": fam[:20]})
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

    rated = sorted([s for s in visible + pool if imdb_score(s) >= 7.5 and s["rating"]], key=imdb_score, reverse=True)
    if len(rated) >= 3:
        shelves.append({"id": "acclaimed", "title": "Critically Acclaimed", "style": "poster", "items": rated[:16]})

    shelves += addon_shelves(summ, kids=p.get("kids"))

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

    return {"hero": hero, "shelves": shelves, "empty": not summ, "storage": storage_state() if admin_user(request) else None, "scanning": LIB["scanning"], "error": LIB["error"],
            "mounted": box_mounted()}


def family_liked(p, summ):
    """What the other profiles liked or loved, loved ones first and then by how many people liked it"""
    by_id = {s["id"]: s for s in summ}
    votes = {}
    rows = db().q("SELECT r.title_id, r.value, r.updated, pr.name FROM ratings r JOIN profiles pr ON pr.id = r.profile_id "
                  "WHERE r.profile_id != ? AND r.value > 0 AND pr.pending = 0", (p["id"],))
    for r in rows:
        if r["title_id"] not in by_id or by_id[r["title_id"]]["my_rating"] == -1:
            continue
        v = votes.setdefault(r["title_id"], {"love": 0, "like": 0, "names": [], "at": 0})
        v["love" if r["value"] == 2 else "like"] += 1
        v["names"].append(r["name"])
        v["at"] = max(v["at"], r["updated"] or 0)
    out = []
    for tid, v in sorted(votes.items(), key=lambda kv: (kv[1]["love"], kv[1]["love"] + kv[1]["like"], kv[1]["at"]), reverse=True):
        s = dict(by_id[tid])
        who = v["names"][:2]
        s["family"] = ("Loved by " if v["love"] else "Liked by ") + " and ".join(who) + (f" +{len(v['names']) - 2}" if len(v["names"]) > 2 else "")
        s["loved"] = bool(v["love"])
        out.append(s)
    return out


def addon_pool(pid, have):
    """Catalog titles from addons that have streams, shaped like library titles. added is when Kino first saw them"""
    out, ids = {}, []
    for a, c in home_catalogs():
        if c.get("type") not in ("movie", "series"):
            continue
        for m in (cached_catalog(a, c) or [])[:60]:
            mid = isinstance(m, dict) and m.get("id")
            if not mid or mid in have or mid in out:
                continue
            out[mid] = ext_preview(m, c["type"])
            ids.append((mid, out[mid]["kind"]))
    if not out:
        return []
    now = time.time()
    db().many("INSERT OR IGNORE INTO seen VALUES (?,?,?)", [(i, k, now) for i, k in ids])
    first = {r["id"]: r["first"] for r in db().q("SELECT id, first FROM seen")}
    # Watched shows up the same as library titles, from the progress of whatever stream was played for it
    done = {}
    for r in db().q("SELECT s.video_id, w.watched FROM streams s JOIN watch w ON w.file_id = s.id WHERE w.profile_id = ?", (pid,)):
        sh = show_of(r["video_id"])
        done[sh] = done.get(sh, False) or bool(r["watched"])
    for mid, s in out.items():
        s["added"] = first.get(mid, now)
        s["watched"] = done.get(mid, False)
    return list(out.values())


def lib_by_meta_id(summ):
    out = {}
    for s in summ:
        if s.get("imdb"):
            out[s["imdb"]] = s
    return out


def shelf_title(c, a, several):
    n = str(c.get("name") or c.get("id") or "").strip()
    addon = str(a["m"].get("name") or "").strip()
    # Lots of addons name their catalogs like ids (top, publicdomainmovies), the addons own name reads much better then
    if not n or n == c.get("id") or (n == n.lower() and (" " not in n or len(n) > 18)):
        if not several or not n:
            return addon or n
        return f"{addon} {n.replace('-', ' ').replace('_', ' ').title()}" if len(n) <= 18 else addon
    if n == n.lower():
        n = n.title()
    if re.search(r"movie|film|show|series|tv|anime", n, re.I):
        return n
    word = {"movie": "Movies", "series": "Shows", "anime": "Anime", "tv": "Channels"}.get(c.get("type"), "")
    return f"{n} {word}".strip()


def addon_shelves(summ, kids=False):
    have = lib_by_meta_id(summ)
    per_addon = {}
    cats = home_catalogs()
    count = {}
    for a, c in cats:
        count[a["id"]] = count.get(a["id"], 0) + 1
    for a, c in cats:
        metas = cached_catalog(a, c)
        if not metas:
            continue
        items = [have.get(m.get("id")) or ext_preview(m, c["type"]) for m in metas[:24] if isinstance(m, dict) and m.get("id")]
        if kids:
            items = [i for i in items if not i.get("external") or kids_ok(i["genres"], i["imdb"])]
        if len(items) >= 3:
            per_addon.setdefault(a["id"], []).append({"id": f"addon-{a['id']}-{c['type']}-{c['id']}", "title": (title := shelf_title(c, a, count[a["id"]] > 1)),
                                                       "style": "poster", "items": items,
                                                       "source": None if (a["m"].get("name") or "") in title else a["m"].get("name")})
    # Takes turns between addons so one with loads of catalogs doesnt push the others off home
    out, lists = [], list(per_addon.values())
    while lists and len(out) < 8:
        for l in lists:
            if l and len(out) < 8:
                out.append(l.pop(0))
        lists = [l for l in lists if l]
    return out


def name_score(q, name):
    """How well a title name matches what was typed, exact beats starts with beats contains"""
    n, q = norm(name), norm(q)
    if not n or not q:
        return 0
    if n == q or n == "the " + q:
        return 100
    if n.startswith(q):
        return 70 - min(20, len(n) - len(q)) / 2
    if f" {q}" in f" {n}":
        return 50
    if q in n:
        return 35
    words = q.split()
    if all(w in n for w in words):
        return 25
    return 0


def people_of(m):
    d = m.get("director")
    return list(m.get("cast") or []), [d] if isinstance(d, str) else list(d or [])


@app.get("/api/search")
async def search(q: str, p=Depends(current_profile)):
    q = norm(q)[:60]
    if not q:
        return {"titles": [], "episodes": [], "people": []}
    summ, wm, rm = all_summaries(p["id"])
    scored, people = [], {}
    for s in summ:
        sc = name_score(q, s["name"])
        m = meta_for(LIB["titles"][s["id"]]) or {}
        cast, directors = people_of(m)
        for role, names in (("Actor", cast), ("Director", directors)):
            for nm in names:
                if q in norm(nm) and len(q) >= 3:
                    pe = people.setdefault(nm, {"name": nm, "role": role, "count": 0, "poster": None})
                    pe["count"] += 1
                    pe["poster"] = pe["poster"] or s["poster"]
                    sc = max(sc, 30)
        if any(q == norm(g) or q in norm(g) for g in s["genres"]):
            sc = max(sc, 20)
        if sc == 0 and len(q) > 3 and q in norm(s.get("description") or ""):
            sc = 5
        if sc:
            # Things in the library get a small push over the same match from an addon, ratings break ties
            scored.append((sc + 8 + imdb_score(s), s))
    scored.sort(key=lambda x: x[0], reverse=True)
    for sc, s in scored:
        s["score"] = round(sc, 2)

    eps = []
    ok_ids = {s["id"] for s in summ}
    for t in LIB["titles"].values():
        m = meta_for(t)
        if not m or t["kind"] != "series" or t["id"] not in ok_ids:
            continue
        vids = {(v["season"], v["episode"]): v for v in m.get("videos", [])}
        for fid in t["files"]:
            f = LIB["files"][fid]
            v = vids.get((f["season"], f["episode"]))
            if v and v.get("name") and q in norm(v["name"]):
                eps.append({"title_id": t["id"], "file_id": fid, "show": m.get("name"), "name": v["name"],
                            "season": f["season"], "episode": f["episode"], "thumbnail": v.get("thumbnail")})
    ppl = sorted(people.values(), key=lambda x: (norm(x["name"]).startswith(q), x["count"]), reverse=True)
    return {"titles": [s for _, s in scored[:60]], "episodes": eps[:20], "people": ppl[:12]}


# ---- voice search for browsers that cant do it themselves (firefox, brave, safari on some macs)
VOICE = {"model": None, "used": 0, "lock": threading.Lock()}


def voice_model():
    with VOICE["lock"]:
        if VOICE["model"] is None:
            from faster_whisper import WhisperModel
            # The tiny english model, about 75 MB, gets downloaded the first time someone uses voice search
            VOICE["model"] = WhisperModel("tiny.en", device="cpu", compute_type="int8", cpu_threads=2, download_root=str(DATA_DIR / "whisper"))
        VOICE["used"] = time.time()
        return VOICE["model"]


def voice_unload():
    # Gives the memory back after 10 minutes without voice searches
    if VOICE["model"] is not None and time.time() - VOICE["used"] > 600:
        with VOICE["lock"]:
            VOICE["model"] = None


def transcribe(raw, hint):
    import numpy as np
    pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-i", "pipe:0", "-t", "15", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
                         input=raw, capture_output=True, timeout=30).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    if len(audio) < 16000 * 0.3:
        return ""
    segs, _ = voice_model().transcribe(audio, language="en", beam_size=1, vad_filter=False, initial_prompt=hint or None)
    return " ".join(s.text for s in segs).strip()


@app.post("/api/voice")
async def voice(request: Request, p=Depends(current_profile)):
    raw = await request.body()
    if not raw or len(raw) > 3 * 1024 * 1024:
        raise HTTPException(400, "That recording was empty or too long")
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        raise HTTPException(501, "Voice search isn't installed on the server yet, it gets added on the next update")
    # Names from the library help it spell titles right, like Red Dwarf instead of red dwarf or read dwarf
    names = [s["name"] for s in sorted(all_summaries(p["id"])[0], key=lambda s: s["last_activity"] or s["added"], reverse=True)[:40]]
    try:
        text = await asyncio.to_thread(transcribe, raw, ", ".join(names))
    except Exception as e:
        log.warning("voice search failed: %s", e)
        raise HTTPException(500, "Voice search didn't work, try again")
    return {"text": re.sub(r"[.?!]+$", "", text)}


@app.get("/api/person")
async def person(name: str, p=Depends(current_profile)):
    """Everything in the library with this actor or director in it"""
    want = norm(name)
    summ, _, _ = all_summaries(p["id"])
    out = []
    for s in summ:
        cast, directors = people_of(meta_for(LIB["titles"][s["id"]]) or {})
        if any(norm(n) == want for n in cast + directors):
            out.append(s)
    out.sort(key=lambda s: str(s.get("releaseInfo") or ""), reverse=True)
    return {"name": name, "titles": out}


@app.get("/api/search/addons")
async def search_addons(q: str, p=Depends(current_profile)):
    # Kept separate from the library search so the library results show straight away and addons fill in after
    q = q.strip()[:60]
    external = []
    if q and addon_rows():
        summ, _, _ = all_summaries(p["id"])
        have = lib_by_meta_id(summ)
        try:
            hits = await asyncio.wait_for(addon_search(None, q), timeout=9)
        except asyncio.TimeoutError:
            hits = []
        seen, rank = {}, {}
        for a, c, m in hits:
            mid = m.get("id")
            if not mid or mid in have:
                continue
            # Each addon already lists its results most popular first, so the position counts too
            pos = rank[(a["id"], c.get("id"), c.get("type"))] = rank.get((a["id"], c.get("id"), c.get("type")), -1) + 1
            item = {**ext_preview(m, c["type"]), "source": a["m"].get("name")}
            if p.get("kids") and not kids_ok(item["genres"], mid):
                continue
            try:
                r = float(item["rating"] or 0)
            except (TypeError, ValueError):
                r = 0
            sc = name_score(q, item["name"]) + r * 2.5 - pos * 1.5 + (6 if item["poster"] else 0)
            if mid in seen:
                # Found by more than one addon, keeps the best score
                seen[mid]["score"] = max(seen[mid]["score"], sc)
                continue
            item["score"] = round(sc, 2)
            seen[mid] = item
        external = sorted(seen.values(), key=lambda x: x["score"], reverse=True)
        await rank_by_popularity(external[:12])
        external.sort(key=lambda x: x["score"], reverse=True)
    return {"external": external[:40]}


async def rank_by_popularity(items):
    """Search catalogs dont say how popular something is, so the best few get there full details looked up (cached for
    days) and the well known ones move up. Red Dwarf the show beats the unaired 1992 american pilot this way"""
    todo = [i for i in items if str(i.get("imdb") or "").startswith("tt")]
    if not todo:
        return
    async def one(i):
        try:
            return await asyncio.wait_for(meta_lookup(i["kind"], i["imdb"]), timeout=4)
        except Exception:
            return None
    metas = await asyncio.gather(*(one(i) for i in todo))
    for i, m in zip(todo, metas):
        if not m or not same_title(i["name"], m.get("name")):
            i["score"] = round(i["score"] - 6, 2)    # nothing known about it, usually something obscure
            continue
        try:
            r = float(m.get("rating") or 0)
        except (TypeError, ValueError):
            r = 0
        pop = m.get("popularity") or 0
        try:
            pop = float(pop)
        except (TypeError, ValueError):
            pop = 0
        i["score"] = round(i["score"] + (0 if i.get("rating") else r * 2.5) + 6 * math.log10(1 + max(0.0, pop)), 2)
        i["rating"] = i.get("rating") or m.get("rating")


@app.get("/api/title/{tid}")
async def title(tid: str, request: Request, p=Depends(current_profile)):
    t = LIB["titles"].get(tid)
    if not t:
        raise HTTPException(404, "That title isn't in the library anymore")
    meta = meta_for(t)
    title_allowed(p, t, meta)
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
    lk = list_key_for(t, meta)
    mylist_checked(p["id"], lk)
    out.update(in_list=in_list(p["id"], lk), list_key=lk, kids_key=kid_key((meta or {}).get("id"), t["id"]),
               kids_allowed=kids_ok((meta or {}).get("genres"), kid_key((meta or {}).get("id"), t["id"])), files=files, cast=(meta or {}).get("cast", []), director=(meta or {}).get("director"),
               guess_name=t["guess_name"], is_admin=bool(admin_user(request)),
               pd_streams=bool(meta and t["kind"] == "series" and any(supports(a["m"], "stream", "series", meta["id"] + ":1:1") for a in addon_rows())))
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
    if p["prefs"].get("share_events"):
        fire(library_events(fids, bool(b.get("watched"))))
    return {"ok": True}


async def library_events(fids, watched):
    for fid in fids[:60]:
        f = LIB["files"].get(fid)
        if not f:
            continue
        kind, vid = await video_id_for(f)
        if kind:
            await send_event("library", kind, vid.split(":")[0], {"action": "watched" if watched else "unwatched", "videoId": vid})


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
    if fid.startswith("s"):
        return await stream_file_info(fid, p, request)
    f = file_or_404(fid)
    t = LIB["titles"].get(f["title_id"])
    if t:
        title_allowed(p, t, meta_for(t))
    try:
        pr = await get_probe(f)
    except Exception as e:
        raise HTTPException(500, f"Couldn't read the file: {e}")
    v = pr.get("video") or {}
    a = next((x for x in pr["audio"] if x.get("default")), pr["audio"][0] if pr["audio"] else None)
    # Dolby Vision files always go through the server so the dolby layer can be taken off, see play_start
    direct = ("mp4" in pr["container"] or "mov" in pr["container"]) and v.get("codec") in ("h264", "hevc") \
        and (a is None or a.get("codec") in ("aac", "mp3")) and not v.get("dovi")
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
        else:
            # Found automatically by comparing the audio with other episodes of the season
            row = db().q("SELECT start, end FROM auto_intros WHERE file_id = ? AND start IS NOT NULL", (fid,))
            if row:
                intro = {"start": row[0]["start"], "end": row[0]["end"], "source": "auto"}
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
            "intro": intro, "credits": credits, "next": nxt, "prefs": p["prefs"], "is_admin": bool(admin_user(request)),
            "art": {k: (meta_for(t) or {}).get(k) for k in ("background", "logo", "poster")} if t else {}, "show": (meta_for(t) or {}).get("name") if t else None}


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
    body = await request.json()
    t = max(0.0, float(body.get("t") or 0))
    a = int(body.get("audio") or 0)
    if fid.startswith("s"):
        r = stream_row(fid)
        if not r["url"].startswith("torbox:"):
            raise HTTPException(400, "That stream plays directly")
        url, pr = await tb_probe(r)
        f = {"id": fid, "path": url}
    else:
        f = file_or_404(fid)
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
    # The player says if this screen can decode hevc, if it cant a 1080p or smaller file gets converted instead
    if codec == "hevc" and body.get("hevc") is False and (v.get("height") or 9999) <= 1080:
        codec = "convert"
    if codec == "hevc" and body.get("hevc") is False:
        raise HTTPException(415, "This screen can't play this 4K HEVC file and it's too big to convert here. Try another version, or the app on a newer device")
    if codec in ("h264", "hevc", "av1", "vp9"):
        vargs = ["-c:v", "copy"] + (["-tag:v", "hvc1"] if codec == "hevc" else [])
        if codec == "hevc" and v.get("dovi"):
            # Dolby Vision layers come off so screens without it get the normal HDR picture, not colour noise
            vargs += ["-bsf:v", "filter_units=remove_types=62|63"]
    elif (v.get("height") or 9999) <= 1080:
        # Old codecs like xvid get converted, only up to 1080p cause the vps has no gpu
        vargs = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p"]
    else:
        raise HTTPException(415, f"{codec} video above 1080p can't be converted on this server, use Download instead")

    if t > 0 and vargs[:2] == ["-c:v", "copy"]:
        # Copied video can only start on a keyframe but the audio starts exactly where you asked, so seeking used to put
        # the sound a few seconds out. Starting both on the keyframe keeps them together and the player gets the real start
        t = await keyframe_before(f["path"], t)

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


async def keyframe_before(path, t):
    """The keyframe at or just before t, ffprobe seeks there and reads one packet so its quick even over the network"""
    try:
        proc = await asyncio.create_subprocess_exec("ffprobe", "-v", "error", "-select_streams", "v:0", "-read_intervals", f"{t:.3f}%+#1",
                                                    "-show_entries", "packet=pts_time,flags", "-of", "csv=p=0", path,
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        for line in out.decode(errors="ignore").splitlines():
            pts, _, flags = line.partition(",")
            k = float(pts)
            if "K" in flags and t - 30 <= k <= t + 0.01:
                return max(0.0, k)
    except (asyncio.TimeoutError, ValueError, OSError):
        try:
            proc.kill()
        except Exception:
            pass
    return t


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
    f = file_or_404(fid) if not fid.startswith("s") else {"ext_subs": []}
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
    if sub_id.startswith("a"):
        target = SUBS_DIR / f"{fid}_{re.sub(r'[^a-z0-9]', '', sub_id)}.vtt"
        if target.exists():
            return Response(target.read_text(errors="ignore"), media_type="text/vtt")
        url = SUB_LINKS.get((fid, sub_id))
        if not url:
            raise HTTPException(404, "That subtitle has expired, reopen the subtitles menu")
        raw, _ = await safe_fetch(url, max_bytes=8 * 1024**2, timeout=20, allow_http=True)
        txt = decode_sub(raw).replace("\r\n", "\n")
        head = txt.lstrip()[:200]
        if head.startswith("WEBVTT"):
            vtt = txt
        elif "[Script Info]" in head or head.startswith("[V4"):
            vtt = await ass_to_vtt(txt)
        else:
            vtt = srt_to_vtt(txt)
        if "-->" not in vtt:
            raise HTTPException(502, "That subtitle file couldn't be read")
        target.write_text(vtt)
        return Response(vtt, media_type="text/vtt")
    raise HTTPException(404, "Subtitle not found")


@app.post("/api/streams/{sid}/bad")
async def stream_bad(sid: str, p=Depends(current_profile)):
    # A source that wouldn't play goes to the back of the list next time
    stream_row(sid)
    db().q("INSERT INTO stream_health (id, good, bad) VALUES (?, 0, ?) ON CONFLICT(id) DO UPDATE SET bad = excluded.bad", (sid, time.time()))
    return {"ok": True}


@app.post("/api/progress")
async def progress(request: Request, p=Depends(current_profile)):
    b = await request.json()
    fid = str(b.get("file_id", ""))
    if fid not in LIB["files"] and not (fid.startswith("s") and db().q("SELECT 1 FROM streams WHERE id = ?", (fid,))):
        raise HTTPException(404, "Unknown file")
    pos, dur = float(b.get("pos") or 0), float(b.get("dur") or 0)
    if fid.startswith("s") and pos > 60:
        # Played for a minute, so this source works and goes first next time
        db().q("INSERT INTO stream_health (id, good, bad) VALUES (?, ?, 0) ON CONFLICT(id) DO UPDATE SET good = excluded.good", (fid, time.time()))
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


IMG_WIDTHS = {240, 342, 480, 640, 960, 1280}


def shrink_image(data, w):
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        return data, "image/jpeg"
    if im.width <= w:
        return data, Image.MIME.get(im.format, "image/jpeg")
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    buf = io.BytesIO()
    # Logos keep there see through background, everything else becomes a jpeg
    if im.mode in ("RGBA", "LA", "P"):
        im.convert("RGBA").save(buf, "PNG", optimize=True)
        return buf.getvalue(), "image/png"
    im.convert("RGB").save(buf, "JPEG", quality=82, optimize=True, progressive=True)
    return buf.getvalue(), "image/jpeg"


@app.get("/api/img")
async def img(u: str, trim: int = 0, w: int = 0):
    host = urlparse(u).hostname or ""
    if urlparse(u).scheme != "https" or not host:
        raise HTTPException(400, "Image host not allowed")
    w = w if w in IMG_WIDTHS else 0
    if w:
        # A smaller copy for tiles and episode pictures. Episode stills come in at full hd, and a season of them made
        # fire tv sticks run out of memory and crash, at the size they're shown they use about a tenth of it
        key = hashlib.sha1(u.encode()).hexdigest() + ("-t" if trim else "") + f"-w{w}"
        small = DATA_DIR / "img" / key
        if small.exists():
            meta = read_json(str(small) + ".json") or {}
            return FileResponse(small, media_type=meta.get("type", "image/jpeg"), headers={"Cache-Control": "private, max-age=604800"})
        full = await img(u, trim)
        data = full.body if hasattr(full, "body") else Path(full.path).read_bytes()
        out, ctype = await asyncio.to_thread(shrink_image, data, w)
        small.write_bytes(out)
        Path(str(small) + ".json").write_text(json.dumps({"type": ctype}))
        return Response(out, media_type=ctype, headers={"Cache-Control": "private, max-age=604800"})
    cache = DATA_DIR / "img" / (hashlib.sha1(u.encode()).hexdigest() + ("-t" if trim else ""))
    if cache.exists():
        meta = read_json(str(cache) + ".json") or {}
        if meta.get("missing"):
            raise HTTPException(404, "No image")
        return FileResponse(cache, media_type=meta.get("type", "image/jpeg"),
                            headers={"Cache-Control": "private, max-age=604800"})
    if OFFLINE_META:
        raise HTTPException(404, "No image")
    status, body, ctype = 200, b"", ""
    try:
        if host in IMG_HOSTS:
            async with httpx.AsyncClient(follow_redirects=True, timeout=20, headers={"User-Agent": "kino-dashboard"}) as c:
                r = await c.get(u)
            status, body, ctype = r.status_code, r.content, r.headers.get("content-type", "")
        else:
            # Posters from addons can live anywhere, so these go through the same checks as addon requests
            body, ctype = await safe_fetch(u, max_bytes=10 * 1024**2, timeout=20)
    except HTTPException as e:
        if e.status_code == 400:
            raise
        status = 502
    except Exception:
        raise HTTPException(502, "Image host didn't answer")
    if status != 200 or not ctype.startswith("image/") or len(body) > 10 * 1024**2:
        cache.write_bytes(b"")
        Path(str(cache) + ".json").write_text(json.dumps({"missing": True}))
        raise HTTPException(404, "No image")
    data = body
    if trim:
        data, t2 = await asyncio.to_thread(trim_png, data)
        ctype = t2 or ctype
    cache.write_bytes(data)
    Path(str(cache) + ".json").write_text(json.dumps({"type": ctype}))
    return Response(data, media_type=ctype, headers={"Cache-Control": "private, max-age=604800"})



# ---------------------------------------------------------------- stremio addons
# Kino talks the stremio addon protocol (github.com/Stremio/stremio-addon-sdk/blob/master/docs/protocol.md)
# and uses addons for catalogs, metadata, subtitles and watch activity events. Stream resources are never used

ADDON_CACHE = {}  # url -> (time, data)
SUB_LINKS = {}    # (file id, sub id) -> subtitle url from an addon
OSHASH = {}       # file id -> opensubtitles hash
CAT_STATE = {"refreshing": False}


def ip_is_public(ip):
    try:
        a = ipaddress.ip_address(ip)
    except ValueError:
        return False
    if getattr(a, "ipv4_mapped", None):
        a = a.ipv4_mapped
    return a.is_global and not a.is_multicast


async def check_host(host):
    # Addons are outside servers, so Kino never lets one point it at the vps itself or the local network
    if ADDON_ALLOW_PRIVATE:
        return
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None)
    except socket.gaierror:
        raise HTTPException(502, f"Couldn't find {host}")
    if not infos or not all(ip_is_public(i[4][0]) for i in infos):
        raise HTTPException(400, "That address points to a private network, which isn't allowed")


async def safe_fetch(url, max_bytes=5 * 1024**2, timeout=12, allow_http=False):
    for _ in range(4):
        u = urlparse(url)
        if u.scheme != "https" and not (u.scheme == "http" and (allow_http or ADDON_ALLOW_PRIVATE)):
            raise HTTPException(400, "Only https addresses are supported")
        if not u.hostname:
            raise HTTPException(400, "That isn't a valid address")
        await check_host(u.hostname)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False,
                                     headers={"User-Agent": "Kino (Stremio addon client)"}) as c:
            async with c.stream("GET", url) as r:
                if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                    url = urljoin(url, r.headers["location"])  # Each redirect gets the same private network check
                    continue
                if r.status_code != 200:
                    raise HTTPException(502, f"The addon answered with an error ({r.status_code})")
                buf = bytearray()
                async for chunk in r.aiter_bytes():
                    buf += chunk
                    if len(buf) > max_bytes:
                        raise HTTPException(502, "The addon sent back too much data")
                return bytes(buf), r.headers.get("content-type", "")
    raise HTTPException(502, "Too many redirects")


async def fetch_json(url, ttl=3600, timeout=12):
    hit = ADDON_CACHE.get(url)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    data, _ = await safe_fetch(url, timeout=timeout)
    try:
        j = json.loads(data)
    except ValueError:
        raise HTTPException(502, "The addon didn't send valid JSON")
    if len(ADDON_CACHE) > 2000:
        ADDON_CACHE.clear()
    ADDON_CACHE[url] = (time.time(), j)
    return j


def addon_base(url):
    url = str(url or "").strip()
    if url.startswith("stremio://"):
        url = "https://" + url[len("stremio://"):]
    if not url.endswith("/manifest.json"):
        raise HTTPException(400, "Paste the full addon link, it ends with /manifest.json")
    return url, url[: -len("/manifest.json")]


def addon_rows(enabled_only=True):
    rows = db().q("SELECT id, url, manifest, enabled, hidden FROM addons " + ("WHERE enabled = 1 " if enabled_only else "") + "ORDER BY id")
    out = []
    for r in rows:
        try:
            m = json.loads(r["manifest"])
        except ValueError:
            continue
        out.append({"id": r["id"], "url": r["url"], "base": r["url"][: -len("/manifest.json")], "m": m,
                    "enabled": bool(r["enabled"]), "hidden": json.loads(r["hidden"] or "[]")})
    return out


def supports(m, resource, type_=None, id_=None):
    """Same rules as stremio: a resource can narrow the addons types and id prefixes"""
    for r in m.get("resources") or []:
        if isinstance(r, str):
            name, types, prefixes = r, m.get("types") or [], m.get("idPrefixes")
        elif isinstance(r, dict):
            name = r.get("name")
            types = r.get("types") or m.get("types") or []
            prefixes = r.get("idPrefixes", m.get("idPrefixes"))
        else:
            continue
        if name != resource:
            continue
        if type_ and types and type_ not in types:
            continue
        if id_ and prefixes and not any(str(id_).startswith(px) for px in prefixes):
            continue
        return True
    return False


def resource_path(resource, type_, id_, extra=None):
    path = f"/{resource}/{quote(type_, safe='')}/{quote(str(id_), safe=':')}"
    if extra:
        path += "/" + urlencode({k: v for k, v in extra.items() if v not in (None, "")}, quote_via=quote)
    return path + ".json"


async def addon_call(a, resource, type_, id_, extra=None, ttl=3600, timeout=12):
    return await fetch_json(a["base"] + resource_path(resource, type_, id_, extra), ttl=ttl, timeout=timeout)


def manifest_summary(a):
    m = a["m"]
    res = set()
    for r in m.get("resources") or []:
        res.add(r if isinstance(r, str) else (r or {}).get("name"))
    cats = []
    for c in m.get("catalogs") or []:
        needs = list(c.get("extraRequired") or []) + [e.get("name") for e in c.get("extra") or [] if e.get("isRequired")]
        cats.append({"key": f"{c.get('type')}/{c.get('id')}", "name": c.get("name") or c.get("id"), "type": c.get("type"),
                     "search": any(e.get("name") == "search" for e in c.get("extra") or []) or "search" in (c.get("extraSupported") or []),
                     "home": not needs, "shown": f"{c.get('type')}/{c.get('id')}" not in a["hidden"]})
    return {"id": a["id"], "url": a["url"], "enabled": a["enabled"], "name": m.get("name") or m.get("id"),
            "version": m.get("version"), "description": m.get("description"), "logo": https_url(m.get("logo")),
            "uses": {"catalogs": bool(cats), "meta": "meta" in res, "subtitles": "subtitles" in res,
                     "events": bool(res & {"player", "library"}), "streams": "stream" in res},
            "configurable": bool((m.get("behaviorHints") or {}).get("configurable")),
            "config_required": bool((m.get("behaviorHints") or {}).get("configurationRequired")), "catalogs": cats}


def ext_poster(m):
    i = str(m.get("id", ""))
    if m.get("poster"):
        return https_url(m["poster"])
    return f"https://images.metahub.space/poster/medium/{i}/img" if i.startswith("tt") else None


def https_url(u):
    # Lots of addons still list their images as http, the same image is nearly always there on https
    u = str(u or "")
    return "https://" + u[7:] if u.startswith("http://") else u or None


def ext_preview(m, kind):
    """A catalog item from an addon, shaped like a library tile but marked as not in the library"""
    i = str(m.get("id", ""))
    # Catalogs can have their own types like anime, the items inside still say if theyre a movie or a show
    kind = m.get("type") if m.get("type") in ("movie", "series") else kind if kind in ("movie", "series") else "series"
    return {"id": None, "ext": f"{kind}/{i}", "external": True, "kind": "series" if kind == "series" else "movie",
            "name": unesc(m.get("name") or ""), "poster": ext_poster(m),
            "background": https_url(m.get("background")) or (f"https://images.metahub.space/background/medium/{i}/img" if i.startswith("tt") else None),
            "logo": https_url(m.get("logo")) or (f"https://images.metahub.space/logo/medium/{i}/img" if i.startswith("tt") else None), "releaseInfo": m.get("releaseInfo") or m.get("year"), "genres": unesc(m.get("genres") or m.get("genre") or []),
            "rating": m.get("imdbRating"), "description": unesc(m.get("description")), "imdb": i, "count": 0, "added": 0,
            "watched": False, "watched_count": 0, "my_rating": 0, "last_activity": 0, "matched": True}


def catalog_url(a, c, extra=None):
    return a["base"] + resource_path("catalog", c["type"], c["id"], extra)


def home_catalogs():
    out = []
    for a in addon_rows():
        for c in a["m"].get("catalogs") or []:
            needs = list(c.get("extraRequired") or []) + [e.get("name") for e in c.get("extra") or [] if e.get("isRequired")]
            if needs or f"{c.get('type')}/{c.get('id')}" in a["hidden"] or c.get("type") not in ("movie", "series", "anime"):
                continue
            # Your own torbox list already plays through TorBox first, so its addon catalog dosent get a shelf too
            if "torbox" in f"{a['m'].get('id', '')} {a['m'].get('name', '')} {c.get('name', '')}".lower():
                continue
            out.append((a, c))
    return out


async def refresh_catalogs():
    if CAT_STATE["refreshing"]:
        return
    CAT_STATE["refreshing"] = True
    try:
        for a, c in home_catalogs():
            try:
                await fetch_json(catalog_url(a, c), ttl=3600)
            except Exception as e:
                log.info("catalog %s/%s failed: %s", a["m"].get("name"), c.get("id"), e)
    finally:
        CAT_STATE["refreshing"] = False


async def catalog_worker():
    while True:
        await refresh_catalogs()
        await asyncio.sleep(1800)


def cached_catalog(a, c):
    hit = ADDON_CACHE.get(catalog_url(a, c))
    return hit[1].get("metas") or [] if hit and isinstance(hit[1], dict) else None


async def meta_lookup(kind, mid):
    """Full details for any id, cinemeta for imdb ids and the installed meta addons for the rest"""
    key = f"ext:{kind}:{mid}"
    m, fetched = cached_meta(key)
    if m is not None and time.time() - fetched < 3 * 86400:
        return m if m.get("id") else None
    got = None
    if str(mid).startswith("tt") and not OFFLINE_META:
        async with httpx.AsyncClient(headers={"User-Agent": "kino-dashboard"}) as client:
            try:
                got = await cinemeta_meta(client, kind, mid)
            except Exception:
                got = None
    if not got:
        got = await addon_meta(kind, mid)
    db().q("INSERT OR REPLACE INTO meta VALUES (?,?,?)", (key, json.dumps(got or {"none": True}), time.time()))
    return got


def same_title(a, b):
    wa, wb = set(norm(a).split()) - {"the", "a", "of", "and"}, set(norm(b).split()) - {"the", "a", "of", "and"}
    return bool(wa & wb) or not wa or not wb


def listed_meta(mid, name, kind):
    """The details an addon catalog or search gave for this id, from whatever is cached"""
    for _, hit in list(ADDON_CACHE.items()):
        j = hit[1] if isinstance(hit, tuple) and len(hit) > 1 else None
        for m in (j.get("metas") or []) if isinstance(j, dict) else []:
            if isinstance(m, dict) and m.get("id") == mid and same_title(name, m.get("name")):
                got = slim_meta(m, kind)
                got["id"] = mid
                # The image links made from the id would show the wrong title too, so only the addons own ones are used
                own = lambda u: None if not u or "metahub" in str(u) else https_url(u)
                got["poster"], got["background"], got["logo"] = own(m.get("poster")), own(m.get("background")), own(m.get("logo"))
                return got
    return None


async def addon_meta(kind, mid, skip_cinemeta=False):
    for a in addon_rows():
        if skip_cinemeta and "cinemeta" in str(a["url"]).lower():
            continue
        if supports(a["m"], "meta", kind, mid):
            try:
                j = await addon_call(a, "meta", kind, mid, ttl=86400)
                if isinstance(j, dict) and j.get("meta"):
                    got = slim_meta(j["meta"], kind)
                    got["id"] = got.get("id") or mid
                    if not got.get("poster"):
                        got["poster"] = j["meta"].get("poster")
                    return got
            except Exception as e:
                log.info("meta from %s failed: %s", a["m"].get("name"), e)
    return None


async def addon_search(kind, q, limit_per=12):
    """Searches every installed catalog that supports search, used by search and fix match"""
    tasks = []
    for a in addon_rows():
        for c in a["m"].get("catalogs") or []:
            has_search = any(e.get("name") == "search" for e in c.get("extra") or []) or "search" in (c.get("extraSupported") or [])
            if has_search and (not kind or c.get("type") == kind or c.get("type") not in ("movie", "series")):
                tasks.append((a, c))
    async def one(a, c):
        try:
            j = await fetch_json(catalog_url(a, c, {"search": q}), ttl=600, timeout=8)
            return [(a, c, m) for m in (j.get("metas") or [])[:limit_per]]
        except Exception:
            return []
    res = await asyncio.gather(*(one(a, c) for a, c in tasks[:6]))
    return [x for r in res for x in r]


def oshash_file(path, size):
    # OpenSubtitles hash: file size plus the first and last 64 KB added up as 64 bit numbers, cheap even over sshfs
    if size < 131072:
        return None
    h = size
    with open(path, "rb") as fh:
        for off in (0, size - 65536):
            fh.seek(off)
            for (x,) in struct.iter_unpack("<Q", fh.read(65536)):
                h = (h + x) & 0xFFFFFFFFFFFFFFFF
    return f"{h:016x}"


async def video_id_for(f):
    if f.get("stream"):
        return f["kind"], f["video_id"]
    t = LIB["titles"].get(f["title_id"])
    m = meta_for(t) if t else None
    if not m or not m.get("id"):
        return None, None
    kind = m.get("kind") or t["kind"]
    if kind == "series":
        if f["season"] is None or f["episode"] is None:
            return None, None
        return kind, f"{m['id']}:{f['season']}:{f['episode']}"
    return kind, m["id"]


def decode_sub(raw):
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            txt = raw.decode(enc)
            if enc != "utf-8-sig" or "�" not in txt:
                return txt
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", errors="ignore")


async def ass_to_vtt(text):
    proc = await asyncio.create_subprocess_exec("ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "ass", "-i", "pipe:0",
                                                "-f", "webvtt", "pipe:1", stdin=asyncio.subprocess.PIPE,
                                                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await asyncio.wait_for(proc.communicate(text.encode("utf-8")), timeout=30)
    return out.decode("utf-8", errors="ignore")


def fire(coro):
    # Watch activity goes out in the background, a slow addon never holds up the player
    async def run():
        try:
            await coro
        except Exception as e:
            log.info("addon event failed: %s", e)
    asyncio.create_task(run())


async def send_event(resource, kind, vid, extra):
    for a in addon_rows():
        if supports(a["m"], resource, kind, vid):
            await safe_fetch(a["base"] + resource_path(resource, kind, vid, extra), max_bytes=256 * 1024, timeout=8)


@app.get("/api/admin/addons")
async def addons_list(admin=Depends(require_admin)):
    return {"addons": [manifest_summary(a) for a in addon_rows(enabled_only=False)]}


@app.post("/api/admin/addons")
async def addons_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    url, base = addon_base(b.get("url"))
    j = await fetch_json(url, ttl=0)
    if not isinstance(j, dict) or not j.get("id") or not isinstance(j.get("resources"), list):
        raise HTTPException(400, "That link didn't return a Stremio addon manifest")
    if db().q("SELECT 1 FROM addons WHERE url = ?", (url,)):
        raise HTTPException(400, "That addon is already installed")
    db().q("INSERT INTO addons (url, manifest, enabled, hidden, added, updated) VALUES (?,?,?,?,?,?)",
           (url, json.dumps(j), 1, "[]", time.time(), time.time()))
    log.info("kino addon installed %s by %s", j.get("id"), admin)
    asyncio.create_task(refresh_catalogs())
    return {"ok": True, "name": j.get("name")}


@app.put("/api/admin/addons/{aid}")
async def addons_edit(aid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    row = db().q("SELECT url, hidden FROM addons WHERE id = ?", (aid,))
    if not row:
        raise HTTPException(404, "That addon isn't installed")
    if "enabled" in b:
        db().q("UPDATE addons SET enabled = ? WHERE id = ?", (1 if b["enabled"] else 0, aid))
    if "hidden" in b and isinstance(b["hidden"], list):
        db().q("UPDATE addons SET hidden = ? WHERE id = ?", (json.dumps([str(x)[:120] for x in b["hidden"]][:100]), aid))
    if b.get("refresh"):
        j = await fetch_json(row[0]["url"], ttl=0)
        db().q("UPDATE addons SET manifest = ?, updated = ? WHERE id = ?", (json.dumps(j), time.time(), aid))
    asyncio.create_task(refresh_catalogs())
    return {"ok": True}


@app.delete("/api/admin/addons/{aid}")
async def addons_remove(aid: int, admin=Depends(require_admin)):
    db().q("DELETE FROM addons WHERE id = ?", (aid,))
    return {"ok": True}


@app.get("/api/external/{kind}/{mid:path}")
async def external_title(kind: str, mid: str, stay: int = 0, name: str = "", p=Depends(current_profile)):
    if kind not in ("movie", "series"):
        raise HTTPException(404, "Unknown type")
    for t in ([] if stay else LIB["titles"].values()):
        m = meta_for(t)
        if m and m.get("id") == mid:
            return {"library_id": t["id"]}
    m = await meta_lookup(kind, mid)
    if m and name and not same_title(name, m.get("name")):
        # Some addons list a title under the wrong imdb id (red dwarf usa came up as a twisted sister concert), so
        # when cinemeta's name has nothing in common with the tile that was clicked the addons own details win
        log.info("meta for %s is %r but the tile said %r, using the addon's details", mid, m.get("name"), name)
        m = await addon_meta(kind, mid, skip_cinemeta=True) or listed_meta(mid, name, kind) or m
    if not m:
        raise HTTPException(404, "Couldn't find details for that title")
    if p.get("kids") and not kids_ok(m.get("genres"), mid):
        raise HTTPException(404, "That title isn't available on this profile")
    seasons = sorted({v["season"] for v in m.get("videos") or [] if v.get("season")})
    videos = []
    if kind == "series":
        # Episode progress for public domain streams, matched by the episode id the stream was found for
        prog = {r["video_id"]: dict(r) for r in db().q(
            "SELECT s.video_id, w.pos, w.dur, w.watched, w.updated FROM streams s JOIN watch w ON w.file_id = s.id "
            "WHERE w.profile_id = ? AND s.video_id LIKE ? ORDER BY w.updated", (p["id"], f"{mid}:%"))}
        for v in m.get("videos") or []:
            if not v.get("season"):
                continue
            vid = ep_video_id(mid, v)
            videos.append({**v, "id": vid, "progress": prog.get(vid)})
        videos.sort(key=lambda v: (v["season"], v["episode"] or 0))
    return {"in_list": in_list(p["id"], mid), "list_key": mid, "videos": videos, "season_list": seasons,**ext_preview({**m, "id": mid, "imdbRating": m.get("rating")}, kind), "poster": m.get("poster") or ext_poster({"id": mid}),
            "background": m.get("background"), "logo": m.get("logo"), "runtime": m.get("runtime"), "cast": m.get("cast") or [],
            "director": m.get("director"), "seasons": len(seasons), "episodes": len(m.get("videos") or [])}


@app.get("/api/addon-subs/{fid}")
async def addon_subs(fid: str, p=Depends(current_profile)):
    if fid.startswith("s"):
        r = stream_row(fid)
        # No local file to hash for a stream, the addons still find subtitles by the title id
        f = {"stream": True, "kind": r["kind"], "video_id": r["video_id"], "path": None, "size": 0,
             "name": Path(urlparse(r["url"]).path).name}
        OSHASH.setdefault(fid, None)
    else:
        f = file_or_404(fid)
    kind, vid = await video_id_for(f)
    rows = [a for a in addon_rows() if kind and supports(a["m"], "subtitles", kind, vid)]
    if not rows:
        return {"subs": []}
    if fid not in OSHASH:
        try:
            OSHASH[fid] = await asyncio.to_thread(oshash_file, f["path"], f["size"])
        except OSError:
            OSHASH[fid] = None
    extra = {"videoHash": OSHASH[fid], "videoSize": f["size"] or None, "filename": f["name"]}

    async def one(a):
        try:
            j = await addon_call(a, "subtitles", kind, vid, extra, ttl=6 * 3600, timeout=10)
            return a, j.get("subtitles") or []
        except Exception as e:
            log.info("subtitles from %s failed: %s", a["m"].get("name"), e)
            return a, []

    out = []
    if len(SUB_LINKS) > 5000:
        SUB_LINKS.clear()
    for a, subs in await asyncio.gather(*(one(a) for a in rows)):
        name = a["m"].get("name") or "Addon"
        counts = {}
        for s in subs[:60]:
            if not isinstance(s, dict) or not s.get("url"):
                continue
            ln = lang_name(s.get("lang"))
            counts[ln] = counts.get(ln, 0) + 1
            if counts[ln] > 3:
                continue  # A few per language is plenty, otherwise the menu goes on forever
            sid = "a" + short_id(f"{a['id']}:{s.get('id')}:{s['url']}")[:12]
            SUB_LINKS[(fid, sid)] = s["url"]
            label = s.get("label") or (ln if counts[ln] == 1 else f"{ln} {counts[ln]}")
            out.append({"id": sid, "label": label, "lang": ln, "kind": "addon", "source": name, "ready": True})
    out.sort(key=lambda x: x["lang"])
    return {"subs": out}


@app.post("/api/event")
async def player_event(request: Request, p=Depends(current_profile)):
    if not p["prefs"].get("share_events"):
        return {"ok": True, "sent": False}
    b = await request.json()
    fid = str(b.get("file_id", ""))
    f = LIB["files"].get(fid)
    if not f and fid.startswith("s"):
        r = stream_row(fid)
        f = {"stream": True, "kind": r["kind"], "video_id": r["video_id"]}
    action = b.get("action")
    if not f or action not in ("start", "pause", "stop"):
        raise HTTPException(400, "Unknown file or action")
    kind, vid = await video_id_for(f)
    if kind:
        fire(send_event("player", kind, vid, {"action": action, "currentTime": int(float(b.get("pos") or 0) * 1000),
                                               "duration": int(float(b.get("dur") or 0) * 1000)}))
    return {"ok": True, "sent": bool(kind)}



# ---------------------------------------------------------------- public domain streams
# Streams from addons only ever play when the video itself is on one of these hosts, everything else gets dropped.
# This is on purpose a fixed list in the code and not a setting, Kino isnt a player for any stream an addon hands out
PD_HOSTS = ("archive.org",)
SAVES = {}  # stream id -> download progress for save to library


def pd_url_ok(url):
    u = urlparse(str(url or ""))
    host = (u.hostname or "").lower()
    #return u.scheme == "https" and any(host == h or host.endswith("." + h) for h in PD_HOSTS)
    return True

def stream_row(sid):
    rows = db().q("SELECT * FROM streams WHERE id = ?", (sid,))
    if not rows:
        raise HTTPException(404, "That stream isn't known anymore, open the title again")
    return dict(rows[0])


@app.get("/api/streams/{kind}/{vid:path}")
async def streams_for(kind: str, vid: str, request: Request, p=Depends(current_profile)):
    if kind not in ("movie", "series"):
        raise HTTPException(404, "Unknown type")
    rows = [a for a in addon_rows() if supports(a["m"], "stream", kind, vid)]
    meta = await meta_lookup(kind, show_of(vid)) or {}
    if p.get("kids") and not kids_ok(meta.get("genres"), show_of(vid)):
        raise HTTPException(404, "That title isn't available on this profile")

    async def one(a):
        try:
            # archive.org is slow so these get a bit longer than other addon calls
            j = await addon_call(a, "stream", kind, vid, ttl=3 * 3600, timeout=45)
            return a, j.get("streams") or [], None
        except httpx.TimeoutException:
            return a, [], "took too long to answer"
        except Exception as e:
            log.info("streams from %s failed: %s", a["m"].get("name"), e)
            return a, [], "couldn't be reached" if isinstance(e, (httpx.ConnectError, socket.gaierror)) else "gave an error"

    out, dropped, report = [], 0, []
    # Your own torbox copy goes first, it's nearly always better than a public domain one
    try:
        tb = await tb_matches(kind, vid, meta)
    except Exception as e:
        log.info("torbox lookup failed: %s", e)
        tb = []
    for f in sorted(tb, key=lambda f: -f["size"])[:6]:
        url = f"torbox:{f['kind']}:{f['item']}:{f['file']}"
        sid = "s" + short_id(f"{kind}:{vid}:{url}")[:15]
        db().q("INSERT OR REPLACE INTO streams VALUES (?,?,?,?,?,?,?,?,?,?)",
               (sid, url, kind, vid, meta.get("name") or vid, f["name"][:200], "TorBox", meta.get("poster"),
                str(meta.get("releaseInfo") or "")[:4], time.time()))
        w = db().q("SELECT pos, dur, watched FROM watch WHERE profile_id = ? AND file_id = ?", (p["id"], sid))
        facts = stream_facts({"behaviorHints": {"videoSize": f["size"]}}, "https://x/" + quote(f["name"]), f["name"])
        out.append({"id": sid, **facts, "plays": True, "torbox": True, "addon": "TorBox",
                    "progress": dict(w[0]) if w else None, "_url": url})
    for a, streams, err in await asyncio.gather(*(one(a) for a in rows)):
        rep_ = {"addon": a["m"].get("name"), "found": len(streams), "kept": 0, "other": [], "error": err}
        report.append(rep_)
        for st in streams[:40]:
            if not isinstance(st, dict):
                continue
            url = st.get("url")
            # archive.org works on https too, so old http links get upgraded instead of dropped
            if isinstance(url, str) and url.startswith("http://") and pd_url_ok("https://" + url[7:]):
                url = "https://" + url[7:]
            # Torrents, youtube ids, outside links and anything not on a public domain host are left out
            if st.get("infoHash") or st.get("ytId") or st.get("externalUrl") or not pd_url_ok(url):
                dropped += 1
                what = "torrent" if st.get("infoHash") else "youtube" if st.get("ytId") else urlparse(str(url or st.get("externalUrl") or "")).hostname or "unknown"
                if what not in rep_["other"]:
                    rep_["other"].append(what)
                continue
            if any(x.get("_url") == url for x in out):
                continue  # Same file listed twice, like an http and https link to it
            rep_["kept"] += 1
            sid = "s" + short_id(f"{kind}:{vid}:{url}")[:15]
            label = " ".join(str(x).strip() for x in (st.get("name"), st.get("title") or st.get("description")) if x)
            db().q("INSERT OR REPLACE INTO streams VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (sid, url, kind, vid, meta.get("name") or vid, label[:200], a["m"].get("name"), meta.get("poster"),
                    str(meta.get("releaseInfo") or "")[:4], time.time()))
            w = db().q("SELECT pos, dur, watched FROM watch WHERE profile_id = ? AND file_id = ?", (p["id"], sid))
            out.append({"id": sid, **stream_facts(st, url, label), "addon": a["m"].get("name"),
                        "progress": dict(w[0]) if w else None, "_url": url})
    # TorBox copies first, then a source that played fine before, then ones not tried yet, and ones that failed last.
    # After that the ones that play in a browser, then the best quality
    health = {r["id"]: r for r in db().q("SELECT id, good, bad FROM stream_health WHERE id IN (%s)" % ",".join("?" * len(out)), [x["id"] for x in out])} if out else {}

    def rank(x):
        h = health.get(x["id"])
        if not h:
            return 1
        if (h["bad"] or 0) > (h["good"] or 0):
            return 2
        return 0
    for x in out:
        x["health"] = ("good", "untried", "failed")[rank(x)]
    out.sort(key=lambda x: (not x.get("torbox"), rank(x), not x["plays"], -x["height"], -(x["bytes"] or 0)))
    for x in out:
        x.pop("_url", None)
    res = {"streams": out, "dropped": dropped, "checked": len(rows)}
    if admin_user(request):
        res["report"] = report
        res["stream_addons"] = [a["m"].get("name") for a in addon_rows() if supports(a["m"], "stream")]
    return res


FORMATS = {".mp4": ("MP4", True), ".m4v": ("MP4", True), ".webm": ("WebM", True), ".mkv": ("MKV", False),
           ".ogv": ("Ogg", False), ".ogg": ("Ogg", False), ".mpeg": ("MPEG", False), ".mpg": ("MPEG", False),
           ".avi": ("AVI", False), ".mov": ("MOV", True), ".wmv": ("WMV", False)}


def stream_facts(st, url, label):
    """Pulls quality, format and size out of what the addon sends so the sources list can show them neatly"""
    text = f"{label} {Path(urlparse(url).path).name}"
    height = 0
    m = re.search(r"\b(2160|1440|1080|720|576|480|360|240)p\b", text, re.I)
    if m:
        height = int(m.group(1))
    elif re.search(r"\b4k\b", text, re.I):
        height = 2160
    elif re.search(r"512kb", text, re.I):
        height = 360  # archive.orgs small derivative copies
    fmt, plays = FORMATS.get(Path(urlparse(url).path).suffix.lower(), ("Video", True))
    size = (st.get("behaviorHints") or {}).get("videoSize")
    if not size:
        sm = re.search(r"(\d+(?:[.,]\d+)?)\s*(GB|MB)", label, re.I)
        if sm:
            size = float(sm.group(1).replace(",", ".")) * (1024**3 if sm.group(2).upper() == "GB" else 1024**2)
    lines = [x.strip() for x in re.split(r"[\n|]", str(st.get("title") or st.get("description") or "")) if x.strip()]
    name = lines[0] if lines else (str(st.get("name") or "").strip() or Path(urlparse(url).path).stem)
    q = "4K" if height >= 2160 else f"{height}p" if height else "SD"
    return {"label": name[:120], "quality": q, "height": height, "format": fmt, "plays": plays,
            "bytes": int(size) if isinstance(size, (int, float)) else None, "file": Path(urlparse(url).path).name[:120]}


def show_of(vid):
    """The title id part of an episode id, tt123:1:2 -> tt123 and kitsu:1376:5 -> kitsu:1376"""
    parts = str(vid).split(":")
    return parts[0] if parts[0].startswith("tt") or len(parts) < 2 else ":".join(parts[:2])


def ep_video_id(mid, v):
    # Cinemeta episodes are tt123:1:2, other addons (kitsu) give each episode its own id
    return v.get("id") if v.get("id") and str(v["id"]).startswith(str(mid)) else f"{mid}:{v['season']}:{v['episode']}"


async def ep_context(kind, vid):
    """For a show: which episode a video id is, and the one after it"""
    if kind != "series":
        return None, None, None
    show = show_of(vid)
    m = await meta_lookup("series", show) or {}
    eps = sorted([v for v in m.get("videos") or [] if v.get("season")], key=lambda v: (v["season"], v["episode"] or 0))
    ids = [ep_video_id(show, v) for v in eps]
    if vid not in ids:
        return m, None, None
    i = ids.index(vid)
    cur = {**eps[i], "id": vid}
    nxt = {**eps[i + 1], "id": ids[i + 1], "video_id": ids[i + 1], "kind": "series"} if i + 1 < len(eps) else None
    return m, cur, nxt


async def stream_file_info(sid, p, request):
    r = stream_row(sid)
    show, cur, nxt = await ep_context(r["kind"], r["video_id"])
    if p.get("kids"):
        m = show if cur else await meta_lookup(r["kind"], show_of(r["video_id"]))
        if not kids_ok((m or {}).get("genres"), show_of(r["video_id"])):
            raise HTTPException(404, "That title isn't available on this profile")
    w = db().q("SELECT pos, watched FROM watch WHERE profile_id = ? AND file_id = ?", (p["id"], sid))
    common = {"resume": w[0]["pos"] if w and not w[0]["watched"] else 0,
              "season": cur["season"] if cur else None, "episode": cur["episode"] if cur else None,
              "ep_name": cur.get("name") if cur else None, "show_id": show_of(r["video_id"]) if cur else None,
              "title_id": None, "intro": None, "credits": None, "next": nxt, "kind": r["kind"], "video_id": r["video_id"],
              "prefs": p["prefs"], "is_admin": bool(admin_user(request)), "art": art_for_id(show_of(r["video_id"]), r["poster"])}
    if r["url"].startswith("torbox:"):
        _, pr = await tb_probe(r)
        a = next((x for x in pr["audio"] if x.get("default")), pr["audio"][0] if pr["audio"] else None)
        return {"id": sid, "stream": True, "name": r["name"], "src": None, "direct": False, "video": pr.get("video") or {},
                "audio": [{"n": x["n"], "lang": lang_name(x["lang"]) if x.get("lang") else "",
                           "label": " ".join(str(y) for y in (x.get("title") or lang_name(x.get("lang")), x.get("codec", "").upper(), f"{x.get('channels')}ch") if y)}
                          for x in pr["audio"]],
                "default_audio": a["n"] if a else 0, "subs": [], "badges": badges(pr), "duration": pr.get("duration"),
                "download": f"/api/rstream/{sid}?dl=1", **common}
    ext = Path(urlparse(r["url"]).path).suffix.lower()
    return {"id": sid, "stream": True, "name": r["name"], "src": f"/api/rstream/{sid}", "direct": True,
            "video": {"codec": None}, "audio": [], "default_audio": 0, "subs": [], "badges": [],
            "download": f"/api/rstream/{sid}?dl=1", "resume": w[0]["pos"] if w and not w[0]["watched"] else 0,
            "season": cur["season"] if cur else None, "episode": cur["episode"] if cur else None,
            "ep_name": cur.get("name") if cur else None, "show_id": show_of(r["video_id"]) if cur else None,
            "title_id": None, "intro": None, "credits": None, "next": nxt, "kind": r["kind"], "video_id": r["video_id"], "ext": ext, "prefs": p["prefs"], "is_admin": bool(admin_user(request)),
            "art": common["art"]}


def art_for_id(mid, poster=None):
    # Pictures for the loading screen
    mid = str(mid or "")
    if mid.startswith("tt"):
        return {"background": f"https://images.metahub.space/background/medium/{mid}/img", "logo": f"https://images.metahub.space/logo/medium/{mid}/img", "poster": poster}
    return {"background": None, "logo": None, "poster": poster}


async def tb_open(url, headers):
    """Opens a file from your torbox account, the link came from torbox itself so it can go to there download servers"""
    client = httpx.AsyncClient(timeout=httpx.Timeout(30, read=60), follow_redirects=False)
    try:
        for _ in range(5):
            if urlparse(url).scheme != "https" and not ADDON_ALLOW_PRIVATE:
                raise HTTPException(502, "TorBox sent an unexpected link")
            await check_host(urlparse(url).hostname)
            r = await client.send(client.build_request("GET", url, headers=headers), stream=True)
            if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                await r.aclose()
                url = urljoin(url, r.headers["location"])
                continue
            return client, r
        raise HTTPException(502, "Too many redirects")
    except BaseException:
        await client.aclose()
        raise


async def pd_open(url, headers):
    """Opens a public domain video, following redirects but only ever to public domain hosts"""
    client = httpx.AsyncClient(timeout=httpx.Timeout(30, read=60), follow_redirects=False,
                               headers={"User-Agent": "Kino (Stremio addon client)"})
    try:
        for _ in range(5):
            # Some hosts redirect to plain http, if the https version is on the list that gets used instead
            if url.startswith("http://") and pd_url_ok("https://" + url[7:]):
                url = "https://" + url[7:]
            if not pd_url_ok(url):
                host = urlparse(url).hostname or "an unknown address"
                log.info("stream blocked, it went to %s which isn't in PD_HOSTS", url)
                raise HTTPException(400, f"That stream sent Kino on to {host}, which isn't on the public domain list (PD_HOSTS)")
            await check_host(urlparse(url).hostname)
            r = await client.send(client.build_request("GET", url, headers=headers), stream=True)
            if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                await r.aclose()
                url = urljoin(url, r.headers["location"])
                continue
            return client, r
        raise HTTPException(502, "Too many redirects")
    except BaseException:
        await client.aclose()
        raise


@app.get("/api/rstream/{sid}")
async def rstream(sid: str, request: Request, dl: int = 0, p=Depends(current_profile)):
    return await stream_proxy(stream_row(sid), request, dl)


async def stream_proxy(r, request, dl=0):
    hdr = {"Range": request.headers["range"]} if request.headers.get("range") else {}
    if r["url"].startswith("torbox:"):
        client, up = await tb_open(await tb_link(*tb_parts(r["url"])), hdr)
    else:
        client, up = await pd_open(r["url"], hdr)
    ctype = up.headers.get("content-type", "")
    if up.status_code not in (200, 206) or not (ctype.startswith("video/") or ctype in ("application/octet-stream", "application/ogg")):
        await up.aclose(); await client.aclose()
        raise HTTPException(502, "archive.org didn't send a video, try another source")
    out = {k: up.headers[k] for k in ("content-length", "content-range", "accept-ranges", "last-modified") if k in up.headers}
    out["Cache-Control"] = "private, no-store"
    if dl:
        name = re.sub(r"[^\w .()-]", "", r["name"])[:80] or "video"
        out["Content-Disposition"] = f'attachment; filename="{name}{Path(urlparse(r["url"]).path).suffix}"'

    async def body():
        try:
            async for chunk in up.aiter_bytes(256 * 1024):
                yield chunk
        finally:
            await up.aclose()
            await client.aclose()
    return StreamingResponse(body(), status_code=up.status_code, headers=out, media_type=ctype or "video/mp4")


async def save_stream(sid, r, admin):
    st = SAVES[sid]
    safe = re.sub(r"[^\w .()'-]", "", r["name"]).strip()[:90] or sid
    year = r["year"] if (r["year"] or "").isdigit() else ""
    ext = Path(urlparse(r["url"]).path).suffix.lower()
    ext = ext if ext in VIDEO_EXT else ".mp4"
    folder = MEDIA_DIR / "archive" / (f"{safe} ({year})" if year else safe)
    target = folder / (f"{safe}.{year}{ext}" if year else f"{safe}{ext}")
    _, cur, _ = await ep_context(r["kind"], r["video_id"])
    if cur:
        # Named the usual way so the scanner groups the episodes into the show
        dots = re.sub(r"\s+", ".", safe)
        folder = MEDIA_DIR / "archive" / safe / f"Season {int(cur['season']):02d}"
        target = folder / f"{dots}.S{int(cur['season']):02d}E{int(cur['episode'] or 0):02d}{ext}"
    tmp = target.with_name(target.name + ".part")
    try:
        folder.mkdir(parents=True, exist_ok=True)
        client, up = await pd_open(r["url"], {})
        try:
            if up.status_code != 200:
                raise RuntimeError(f"archive.org answered {up.status_code}")
            st["total"] = int(up.headers.get("content-length") or 0)
            if st["total"] > 40 * 1024**3:
                raise RuntimeError("That file is bigger than 40 GB")
            with open(tmp, "wb") as fh:
                async for chunk in up.aiter_bytes(1024 * 1024):
                    await asyncio.to_thread(fh.write, chunk)
                    st["bytes"] += len(chunk)
        finally:
            await up.aclose()
            await client.aclose()
        tmp.rename(target)
        await rescan()
        # The file name might not match cinemeta on its own, so it gets pinned to the title it was saved from
        f = next((x for x in LIB["files"].values() if Path(x["path"]) == target), None)
        if f and r["kind"] in ("movie", "series"):
            t = LIB["titles"][f["title_id"]]
            show_id = show_of(r["video_id"])
            db().q("INSERT OR REPLACE INTO overrides VALUES (?,?,?,?)", (t["key"], r["kind"], show_id, time.time()))
            await ensure_meta([(t["key"], t["kind"], t["guess_name"], t["year"])], force=True)
            st["title_id"] = t["id"]
        st["state"] = "done"
        log.info("kino saved %s from archive.org for %s", target, admin)
    except Exception as e:
        tmp.unlink(missing_ok=True)
        st.update(state="failed", error=str(e) if not isinstance(e, HTTPException) else e.detail)
        log.warning("saving %s failed: %s", sid, e)


@app.post("/api/admin/streams/{sid}/save")
async def stream_save(sid: str, admin=Depends(require_admin)):
    r = stream_row(sid)
    cur = SAVES.get(sid)
    if cur and cur["state"] == "saving":
        return cur
    SAVES[sid] = {"state": "saving", "bytes": 0, "total": 0, "error": None, "title_id": None}
    asyncio.create_task(save_stream(sid, r, admin))
    return SAVES[sid]


@app.get("/api/admin/streams/{sid}/save")
async def stream_save_status(sid: str, admin=Depends(require_admin)):
    return SAVES.get(sid) or {"state": "none"}



# ---------------------------------------------------------------- my list
def list_key_for(t, meta):
    return (meta or {}).get("id") or f"lib:{t['id']}"


def in_list(pid, key):
    return bool(db().q("SELECT 1 FROM mylist WHERE profile_id = ? AND key = ?", (pid, key)))


@app.post("/api/mylist")
async def mylist_add(request: Request, p=Depends(current_profile)):
    b = await request.json()
    if b.get("title_id"):
        t = LIB["titles"].get(b["title_id"])
        if not t:
            raise HTTPException(404, "Unknown title")
        m = meta_for(t) or {}
        key, kind, tid, name, poster = list_key_for(t, m), t["kind"], t["id"], m.get("name") or t["guess_name"], m.get("poster")
    else:
        kind, mid = b.get("kind"), str(b.get("id") or "")[:80]
        if kind not in ("movie", "series") or not mid:
            raise HTTPException(400, "Unknown title")
        m = await meta_lookup(kind, mid) or {}
        key, tid, name, poster = mid, None, m.get("name") or mid, m.get("poster")
    now = time.time()
    db().q("INSERT OR IGNORE INTO mylist VALUES (?,?,?,?,?,?,?,?)", (p["id"], key, kind, tid, name, poster, now, now))
    return {"ok": True, "key": key}


@app.get("/api/mylist")
async def mylist_get(p=Depends(current_profile)):
    summ, wm, _ = all_summaries(p["id"])
    items, fresh = mylist_items(p, summ, wm)
    new = {f["id"]: f["new_count"] for f in fresh}
    return {"items": [{**i, "new_count": new.get(i.get("id"), 0)} for i in items]}


@app.delete("/api/mylist")
async def mylist_remove(key: str, p=Depends(current_profile)):
    db().q("DELETE FROM mylist WHERE profile_id = ? AND key = ?", (p["id"], key))
    return {"ok": True}


def mylist_items(p, summ, wm):
    """My List resolved against the library, plus shows in the list that got new episodes since they were last looked at"""
    by_meta, by_id = lib_by_meta_id(summ), {s["id"]: s for s in summ}
    items, fresh = [], []
    for r in db().q("SELECT * FROM mylist WHERE profile_id = ? ORDER BY added DESC", (p["id"],)):
        s = by_meta.get(r["key"]) or by_id.get(r["title_id"] or (r["key"][4:] if r["key"].startswith("lib:") else ""))
        if s:
            items.append(s)
            t = LIB["titles"].get(s["id"])
            if t and t["kind"] == "series":
                since = max(r["added"], r["checked"] or 0)
                new = [LIB["files"][f] for f in t["files"] if LIB["files"][f]["mtime"] > since and not (wm.get(f) or {}).get("watched")]
                if new:
                    first = min(new, key=lambda f: (f["season"] or 0, f["episode"] or 0))
                    m = meta_for(t) or {}
                    ep = next((v for v in m.get("videos", []) if v["season"] == first["season"] and v["episode"] == first["episode"]), {})
                    fresh.append({**s, "new_count": len(new), "file_id": first["id"], "season": first["season"],
                                  "episode": first["episode"], "ep_name": ep.get("name"), "thumbnail": ep.get("thumbnail"),
                                  "newest": max(f["mtime"] for f in new)})
        elif not r["key"].startswith("lib:") and not r["title_id"]:
            item = ext_preview({"id": r["key"], "name": r["name"], "poster": r["poster"]}, r["kind"])
            if not p.get("kids") or kids_ok(item["genres"], r["key"]):
                items.append(item)
    fresh.sort(key=lambda x: x["newest"], reverse=True)
    return items, fresh


def mylist_checked(pid, key):
    db().q("UPDATE mylist SET checked = ? WHERE profile_id = ? AND key = ?", (time.time(), pid, key))


# ---------------------------------------------------------------- admin: kids rules and storage review
@app.post("/api/admin/kids")
async def kids_rule(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    key = str(b.get("key") or "")[:100]
    if not key:
        raise HTTPException(400, "Unknown title")
    if b.get("allow") is None:
        db().q("DELETE FROM kids_rules WHERE key = ?", (key,))
    else:
        db().q("INSERT OR REPLACE INTO kids_rules VALUES (?,?)", (key, 1 if b["allow"] else 0))
    return {"ok": True}


STORAGE_WARN_PCT = float(env("STORAGE_WARN_PCT", "90"))


def storage_state():
    d = disk(MEDIA_DIR) if box_mounted() else None
    if not d or not d["total"]:
        return None
    pct = d["used"] / d["total"] * 100
    return {**d, "pct": round(pct, 1), "warn": pct >= STORAGE_WARN_PCT}


@app.get("/api/admin/storage")
async def storage_review(admin=Depends(require_admin)):
    st = storage_state()
    profiles = [r["id"] for r in db().q("SELECT id FROM profiles")]
    watched = {}
    for r in db().q("SELECT profile_id, file_id, updated FROM watch WHERE watched = 1"):
        watched.setdefault(r["file_id"], {})[r["profile_id"]] = r["updated"]
    activity = {}
    for r in db().q("SELECT file_id, MAX(updated) AS u FROM watch GROUP BY file_id"):
        activity[r["file_id"]] = r["u"]
    everyone, idle = [], []
    now = time.time()
    for t in LIB["titles"].values():
        m = meta_for(t) or {}
        row = {"id": t["id"], "name": m.get("name") or t["guess_name"], "poster": m.get("poster"), "kind": t["kind"],
               "size": t["size"], "count": len(t["files"])}
        done = all(len(watched.get(f, {})) >= len(profiles) for f in t["files"])
        last = max([activity.get(f) or 0 for f in t["files"]] or [0])
        if done and t["files"]:
            everyone.append({**row, "last": last})
        elif not last and now - t["added"] > 90 * 86400:
            idle.append({**row, "added": t["added"]})
    everyone.sort(key=lambda x: x["size"], reverse=True)
    idle.sort(key=lambda x: x["size"], reverse=True)
    return {"storage": st, "watched_by_everyone": everyone[:30], "never_watched": idle[:30]}



# ---------------------------------------------------------------- gate for devices
# nginx asks /api/gate on every request from an address thats not on the ip list (satisfy any + auth_request),
# a device the admin approved gets through, everything else lands on /gate where it can ask for access
@app.get("/api/gate")
async def gate(request: Request):
    # nginx asks this before every request. Links made for an outside player (vlc) carry there own signature instead of
    # a cookie, nginx passes the address that was asked for so they can be let through too
    orig = request.headers.get("x-original-uri", "")
    if orig.startswith("/api/x/") and ext_link_ok(orig, client_ip(request)):
        return Response(status_code=204)
    return Response(status_code=204 if access_ok(request) else 403)


# ---- problems the apps report (the tv app's page crashing or being killed for memory), shown on the Server page
CLIENT_LOG = deque(maxlen=60)


@app.post("/api/clientlog")
async def clientlog(request: Request):
    try:
        b = await request.json()
    except Exception:
        b = {}
    me = cookie_profile(request)
    entry = {"at": time.time(), "kind": str(b.get("kind", ""))[:40], "page": str(b.get("page", ""))[:200],
             "detail": str(b.get("detail", ""))[:400], "device": str(b.get("device", ""))[:80], "profile": me["name"] if me else None,
             "ua": request.headers.get("user-agent", "")[:160]}
    CLIENT_LOG.append(entry)
    log.warning("kino app %s page=%s device=%s %s", entry["kind"], entry["page"], entry["device"], entry["detail"])
    return {"ok": True}


@app.get("/api/admin/clientlog")
async def clientlog_get(admin=Depends(require_admin)):
    return {"items": list(reversed(CLIENT_LOG))}


# ---- links for outside players (vlc, mx player and so on)
# They cant send kino's cookies, so they get a link that's signed, runs out after 6 hours and only works from the
# address that asked for it

def ext_link(fid, ip, name):
    exp = int(time.time()) + 6 * 3600
    safe = re.sub(r"[^\w .()-]", "", name or "video").strip()[:80] or "video"
    return f"/api/x/{fid}/{quote(safe)}?exp={exp}&ip={quote(ip)}&sig={sign('ext', fid, exp, ip)}"


def ext_link_ok(url, ip):
    u = urlparse(url)
    parts = u.path.split("/")
    if len(parts) < 4:
        return False
    q = dict(x.split("=", 1) for x in u.query.split("&") if "=" in x)
    from urllib.parse import unquote
    fid, exp, lip, sig = parts[3], q.get("exp", "0"), unquote(q.get("ip", "")), q.get("sig", "")
    if not exp.isdigit() or int(exp) < time.time() or lip != ip:
        return False
    return hmac.compare_digest(sig, sign("ext", fid, int(exp), lip))


@app.post("/api/extlink/{fid}")
async def extlink(fid: str, request: Request, p=Depends(current_profile)):
    if fid.startswith("s"):
        r = stream_row(fid)
        name = r["name"] + (Path(urlparse(r["url"]).path).suffix if not r["url"].startswith("torbox:") else ".mkv")
    else:
        f = file_or_404(fid)
        name = f["name"]
    return {"url": ext_link(fid, client_ip(request), name)}


@app.get("/api/x/{fid}/{name}")
async def ext_play(fid: str, name: str, request: Request):
    if not ext_link_ok(str(request.url.path) + "?" + request.url.query, client_ip(request)):
        raise HTTPException(403, "This link ran out or was made for another device, open it from Kino again")
    if fid.startswith("s"):
        return await stream_proxy(stream_row(fid), request)
    return range_response(file_or_404(fid)["path"], request)


GATE_HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="robots" content="noindex, nofollow"><title>Kino</title>
<link rel="stylesheet" href="/static/app.css?v=__V__"></head><body class="gate-body"><main class="gate" id="gate">
<div class="gate-card glass-card"><div class="gate-ic"></div><h1>This Device Isn't Allowed Yet</h1>
<p class="secondary">Kino only opens on your family's networks or on devices the admin has approved. Ask for access and give the admin this code.</p>
<div class="gate-code" id="gateCode">···-···</div>
<form id="gateForm" class="gate-form"><input id="gateName" maxlength="40" placeholder="Name this device, like Mum's iPad" required>
<button class="btn primary" type="submit">Ask for Access</button></form>
<p class="note" id="gateMsg"></p></div></main><script src="/static/gate.js?v=__V__"></script></body></html>"""


@app.get("/gate")
async def gate_page():
    return Response(GATE_HTML.replace("__V__", STATIC_VERSION["v"]), media_type="text/html", headers={"Cache-Control": "no-store"})


@app.get("/api/gate/status")
async def gate_status(request: Request):
    t = device_token(request)
    if not t:
        return {"code": None, "status": "none", "allowed": access_ok(request)}
    row = db().q("SELECT status, name FROM devices WHERE id = ?", (device_key(t),))
    return {"code": device_code(t), "status": row[0]["status"] if row else "none", "name": row[0]["name"] if row else None,
            "allowed": access_ok(request)}


@app.post("/api/gate/request")
async def gate_request(request: Request):
    t = device_token(request)
    if not t:
        raise HTTPException(400, "Reload the page and try again")
    b = await request.json()
    name = re.sub(r"\s+", " ", str(b.get("name") or "")).strip()[:40] or "Unnamed device"
    db().q("DELETE FROM devices WHERE status = 'pending' AND created < ?", (time.time() - 7 * 86400,))
    if db().q("SELECT COUNT(*) AS n FROM devices WHERE status = 'pending'")[0]["n"] >= 30:
        raise HTTPException(429, "Too many devices are waiting, ask the admin to clear them")
    row = db().q("SELECT status FROM devices WHERE id = ?", (device_key(t),))
    if row and row[0]["status"] in ("allowed", "denied"):
        return {"ok": True, "status": row[0]["status"]}
    db().q("INSERT OR REPLACE INTO devices VALUES (?,?,?,?,?,?,?,?)", (device_key(t), device_code(t), name,
           request.headers.get("user-agent", "")[:200], client_ip(request), "pending", time.time(), time.time()))
    log.info("kino device %s asked for access as %s from %s", device_code(t), name, client_ip(request))
    return {"ok": True, "status": "pending"}


def device_out(r, mine):
    return {"id": r["id"], "code": r["code"], "name": r["name"], "ua": r["ua"], "ip": r["ip"], "status": r["status"],
            "created": r["created"], "last_seen": r["last_seen"], "this": r["id"] == mine}


@app.get("/api/admin/devices")
async def devices_list(request: Request, admin=Depends(require_admin)):
    t = device_token(request)
    mine = device_key(t) if t else None
    rows = db().q("SELECT * FROM devices ORDER BY status = 'pending' DESC, created DESC")
    return {"devices": [device_out(r, mine) for r in rows], "this_code": device_code(t) if t else None,
            "this_allowed": bool(mine and any(r["id"] == mine and r["status"] == "allowed" for r in rows))}


@app.post("/api/admin/devices")
async def devices_approve(request: Request, admin=Depends(require_admin)):
    """Approves a device by the code it shows, or this device when this is set"""
    b = await request.json()
    name = str(b.get("name") or "").strip()[:40]
    if b.get("this"):
        t = device_token(request)
        if not t:
            raise HTTPException(400, "Reload the page first so this device gets an id")
        db().q("INSERT OR REPLACE INTO devices VALUES (?,?,?,?,?,?,?,?)", (device_key(t), device_code(t), name or "This device",
               request.headers.get("user-agent", "")[:200], client_ip(request), "allowed", time.time(), time.time()))
        return {"ok": True}
    code = re.sub(r"[^A-Z0-9]", "", str(b.get("code") or "").upper())
    code = f"{code[:3]}-{code[3:6]}"
    row = db().q("SELECT id FROM devices WHERE code = ?", (code,))
    if not row:
        raise HTTPException(404, "No device with that code has asked for access yet. Open Kino on it and tap Ask for Access first")
    db().q("UPDATE devices SET status = 'allowed', name = COALESCE(NULLIF(?, ''), name) WHERE id = ?", (name, row[0]["id"]))
    log.info("kino device %s allowed by %s", code, admin)
    return {"ok": True}


@app.put("/api/admin/devices/{did}")
async def devices_edit(did: str, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if b.get("status") in ("allowed", "denied"):
        db().q("UPDATE devices SET status = ? WHERE id = ?", (b["status"], did))
    if b.get("name"):
        db().q("UPDATE devices SET name = ? WHERE id = ?", (str(b["name"]).strip()[:40], did))
    return {"ok": True}


@app.delete("/api/admin/devices/{did}")
async def devices_remove(did: str, request: Request, admin=Depends(require_admin)):
    t = device_token(request)
    if t and device_key(t) == did and not ip_allowed(client_ip(request)):
        raise HTTPException(400, "That's the device you're using and this network isn't allowed, you'd lock yourself out")
    db().q("DELETE FROM devices WHERE id = ?", (did,))
    return {"ok": True}


# ---------------------------------------------------------------- search start page
def resolve_saved(p, rows, summ):
    by_meta, by_id = lib_by_meta_id(summ), {s["id"]: s for s in summ}
    out = []
    for r in rows:
        s = by_meta.get(r["key"]) or by_id.get(r["title_id"] or (r["key"][4:] if r["key"].startswith("lib:") else ""))
        if s:
            out.append(s)
        elif not r["key"].startswith("lib:") and not r["title_id"]:
            item = ext_preview({"id": r["key"], "name": r["name"], "poster": r["poster"]}, r["kind"])
            if not p.get("kids") or kids_ok(item["genres"], r["key"]):
                out.append(item)
    return out


@app.post("/api/search/recent")
async def search_recent_add(request: Request, p=Depends(current_profile)):
    b = await request.json()
    if b.get("title_id"):
        t = LIB["titles"].get(b["title_id"])
        if not t:
            raise HTTPException(404, "Unknown title")
        m = meta_for(t) or {}
        row = (list_key_for(t, m), t["kind"], t["id"], m.get("name") or t["guess_name"], m.get("poster"))
    else:
        kind, mid = b.get("kind"), str(b.get("id") or "")[:80]
        if kind not in ("movie", "series") or not mid:
            raise HTTPException(400, "Unknown title")
        row = (mid, kind, None, str(b.get("name") or mid)[:120], b.get("poster"))
    db().q("INSERT OR REPLACE INTO search_recent VALUES (?,?,?,?,?,?,?)", (p["id"], *row, time.time()))
    db().q("DELETE FROM search_recent WHERE profile_id = ? AND key NOT IN (SELECT key FROM search_recent WHERE profile_id = ? "
           "ORDER BY at DESC LIMIT 18)", (p["id"], p["id"]))
    return {"ok": True}


@app.delete("/api/search/recent")
async def search_recent_clear(p=Depends(current_profile)):
    db().q("DELETE FROM search_recent WHERE profile_id = ?", (p["id"],))
    return {"ok": True}


@app.get("/api/search/start")
async def search_start(p=Depends(current_profile)):
    summ, wm, _ = all_summaries(p["id"])
    rows = db().q("SELECT * FROM search_recent WHERE profile_id = ? ORDER BY at DESC", (p["id"],))
    recent = resolve_saved(p, rows, summ)
    pool = addon_pool(p["id"], lib_by_meta_id(summ))
    if p.get("kids"):
        pool = [s for s in pool if kids_ok(s["genres"], s["imdb"])]
    explore = [s for s in summ if s["my_rating"] != -1] + pool
    # Changes a few times a day so it feels fresh without jumping around while someone is looking
    rng = random.Random(f"{p['id']}:{int(time.time() // 21600)}")
    rng.shuffle(explore)
    return {"recent": recent, "explore": explore[:18]}



# ---------------------------------------------------------------- torbox first
# If something isnt on the storage box yet but its already in your torbox account, Kino plays it from there
# before it looks at public domain copies. Only files from your own account, found through the torbox api
TORBOX_KEY = env("TORBOX_API_KEY", "")
TORBOX_API = env("TORBOX_API", "https://api.torbox.app/v1/api")
TB_KINDS = [("torrents", "torrent_id"), ("webdl", "web_id"), ("usenet", "usenet_id")]
TB_CACHE = {"at": 0, "files": [], "lock": None}
TB_LINKS = {}   # (kind, item, file) -> (time, url)


def tb_guess(name):
    from guessit import guessit
    try:
        g = dict(guessit(name))
    except Exception:
        g = {}
    return g


async def tb_files():
    """Every finished video in the torbox account, parsed once and kept for 5 minutes"""
    if not TORBOX_KEY:
        return []
    if TB_CACHE["lock"] is None:
        TB_CACHE["lock"] = asyncio.Lock()
    async with TB_CACHE["lock"]:
        if time.time() - TB_CACHE["at"] < 300:
            return TB_CACHE["files"]
        out = []
        async with httpx.AsyncClient(timeout=30, headers={"Authorization": f"Bearer {TORBOX_KEY}"}) as c:
            for kind, _ in TB_KINDS:
                try:
                    r = await c.get(f"{TORBOX_API}/{kind}/mylist", params={"limit": 1000, "bypass_cache": "true"})
                    if r.status_code != 200:
                        continue
                    items = r.json().get("data") or []
                except Exception as e:
                    log.info("torbox %s list failed: %s", kind, e)
                    continue
                for it in items:
                    if not (it.get("download_finished") or it.get("download_present")):
                        continue
                    for f in it.get("files") or []:
                        name = str(f.get("short_name") or f.get("name") or "")
                        if Path(name).suffix.lower() not in VIDEO_EXT or ("sample" in name.lower() and (f.get("size") or 0) < 400 * 1024**2):
                            continue
                        g = await asyncio.to_thread(tb_guess, f"{it.get('name', '')}/{Path(str(f.get('name') or name)).name}")
                        out.append({"kind": kind, "item": it.get("id"), "file": f.get("id"), "name": Path(name).name,
                                    "size": f.get("size") or 0, "title": norm(g.get("title") or ""), "year": g.get("year"),
                                    "season": first(g.get("season")), "episode": first(g.get("episode"))})
        TB_CACHE.update(at=time.time(), files=out)
        return out


async def tb_matches(kind, vid, meta):
    if not TORBOX_KEY or not meta:
        return []
    want = norm(meta.get("name") or "")
    try:
        year = int(str(meta.get("releaseInfo") or "")[:4])
    except ValueError:
        year = None
    se = None
    if kind == "series":
        _, cur, _ = await ep_context(kind, vid)
        if not cur:
            return []
        se = (cur["season"], cur["episode"])
    hits = []
    for f in await tb_files():
        if not want or f["title"] != want:
            continue
        if kind == "movie":
            if f["episode"] is not None or (year and f["year"] and abs(int(f["year"]) - year) > 1):
                continue
        elif (f["season"], f["episode"]) != se:
            continue
        hits.append(f)
    return hits


async def tb_link(kind, item, file):
    key = (kind, item, file)
    hit = TB_LINKS.get(key)
    if hit and time.time() - hit[0] < 2 * 3600:   # torbox links last about 3 hours
        return hit[1]
    id_param = dict(TB_KINDS)[kind]
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{TORBOX_API}/{kind}/requestdl", params={"token": TORBOX_KEY, id_param: item, "file_id": file})
    if r.status_code != 200 or not r.json().get("data"):
        raise HTTPException(502, "TorBox didn't give a link for that file, it might have been removed")
    url = r.json()["data"]
    if urlparse(url).scheme != "https" and not ADDON_ALLOW_PRIVATE:
        raise HTTPException(502, "TorBox sent an unexpected link")
    TB_LINKS[key] = (time.time(), url)
    return url


def tb_parts(url):
    _, kind, item, file = url.split(":", 3)
    return kind, item, file


async def tb_probe(r):
    url = await tb_link(*tb_parts(r["url"]))
    rows = db().q("SELECT data FROM probe WHERE path = ?", (r["url"],))
    if rows:
        return url, json.loads(rows[0]["data"])
    data = await asyncio.to_thread(run_probe, url)
    db().q("INSERT OR REPLACE INTO probe VALUES (?,?,?,?)", (r["url"], 0, 0, json.dumps(data)))
    return url, data


# ---- admin: library tools

@app.get("/api/admin/match/search")
async def match_search(q: str, kind: str = "movie", admin=Depends(require_admin)):
    if kind not in ("movie", "series"):
        raise HTTPException(400, "Kind has to be movie or series")
    if OFFLINE_META:
        return {"results": []}
    metas = []
    async with httpx.AsyncClient(headers={"User-Agent": "kino-dashboard"}) as c:
        try:
            metas = await cinemeta_search(c, kind, q[:80])
        except Exception:
            if not addon_rows():
                raise HTTPException(502, "Cinemeta didn't answer, try again")
    out = [{"id": m.get("id"), "name": unesc(m.get("name")), "releaseInfo": m.get("releaseInfo"),
            "poster": poster_for(m), "kind": kind, "source": "Cinemeta"} for m in metas[:12] if str(m.get("id", "")).startswith("tt")]
    seen = {r["id"] for r in out}
    for a, cat, m in await addon_search(kind, q[:80], limit_per=8):
        if m.get("id") and m["id"] not in seen:
            seen.add(m["id"])
            out.append({"id": m["id"], "name": unesc(m.get("name")), "releaseInfo": m.get("releaseInfo"),
                        "poster": ext_poster(m), "kind": kind, "source": a["m"].get("name")})
    return {"results": out[:30]}


@app.post("/api/admin/match")
async def match_set(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    t = LIB["titles"].get(b.get("title_id"))
    kind, imdb = b.get("kind"), str(b.get("imdb_id") or "")
    if not t or kind not in ("movie", "series") or not re.fullmatch(r"[A-Za-z0-9:_.-]{2,80}", imdb):
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


@app.get("/app")
async def android_app():
    # The android app (phones, tablets, android tv and fire tv). Short address so its easy to type into Downloader on a fire tv
    apk = STATIC / "kino.apk"
    if not apk.exists():
        raise HTTPException(404, "The Android app isn't on this server yet")
    return FileResponse(apk, media_type="application/vnd.android.package-archive", filename="Kino.apk",
                        headers={"Cache-Control": "no-cache"})


@app.get("/app/version")
async def android_app_version():
    # The app asks this when it opens and offers to update when theres a newer one. kino-version.json is written
    # whenever kino.apk is rebuilt, ci checks they match the version in android/app/build.gradle
    v = read_json(str(STATIC / "kino-version.json")) or {}
    return JSONResponse({"code": int(v.get("code") or 0), "name": v.get("name") or "", "url": "/app"}, headers={"Cache-Control": "no-cache"})


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
    sp.add_parser("backup")
    sp.add_parser("restore").add_argument("file")
    args = ap.parse_args()
    if args.cmd == "restore":
        # Kino has to be stopped first, otherwise it would keep writing to the old database
        if subprocess.run(["systemctl", "is-active", "--quiet", "kino"], stderr=subprocess.DEVNULL).returncode == 0:
            sys.exit("Stop kino first: systemctl stop kino")
        return restore_backup(args.file)
    if args.cmd == "backup":
        return print("Saved", backup_now())
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
