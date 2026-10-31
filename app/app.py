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
import collections
import itertools
import json
import logging
import math
import os
import zlib
import re
import random
import secrets
import shutil
import signal
import socket
import struct
import tempfile
import base64
import datetime
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
from channel_popularity import popularity
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles


def env(name, default):
    return os.environ.get(name, default)


MEDIA_DIR = Path(env("MEDIA_DIR", "/srv/torbox"))
DATA_DIR = Path(env("DATA_DIR", "/var/lib/kino"))
SYNC_STATUS = Path(env("SYNC_STATUS", "/var/lib/torbox-sync/status.json"))
PAUSE_FILE = Path(env("PAUSE_FILE", str(DATA_DIR / "pause.json")))
DELETED_FILE = Path(env("DELETED_FILE", str(DATA_DIR / "deleted.json")))  # what the admin deleted, the sync reads it so it doesnt fetch it again
ALLOWLIST = Path(env("ALLOWLIST_FILE", str(DATA_DIR / "allowlist.json")))
ALLOWLIST_APPLIED = Path(env("ALLOWLIST_APPLIED", str(DATA_DIR / "allowlist-applied.json")))
WATCHDOG_STATUS = Path(env("WATCHDOG_STATUS", "/var/lib/kino-watchdog/status.json"))
SYNC_UNIT = env("SYNC_UNIT", "torbox-sync.service")
TIMER_UNIT = env("TIMER_UNIT", "torbox-sync.timer")
def load_secret():
    """An empty secret would mean anyone can forge profile cookies and signed links, so if its not set one gets made and kept"""
    given = env("KINO_SECRET", "").strip()
    if len(given) >= 16:
        return given.encode()
    f = DATA_DIR / "secret.key"
    try:
        if f.exists() and len(f.read_text().strip()) >= 32:
            return f.read_text().strip().encode()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        key = secrets.token_hex(32)
        fd = os.open(str(f), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as fh:
            fh.write(key)
        return key.encode()
    except OSError:
        # Cant write it anywhere so use one that only lives till restart, still far better than empty
        return secrets.token_hex(32).encode()


SECRET = load_secret()
COOKIE_SECURE = env("COOKIE_SECURE", "1") == "1"
CINEMETA = env("CINEMETA_URL", "https://v3-cinemeta.strem.io")
OFFLINE_META = env("OFFLINE_META", "0") == "1"  # Only for testing without internet
ALLOW_ALL = env("ALLOW_ALL", "0") == "1"  # Only for testing, skips the ip check in the app
ADDON_ALLOW_PRIVATE = env("ADDON_ALLOW_PRIVATE", "0") == "1"  # Only for testing addons running on this machine
MAX_FFMPEG = int(env("MAX_FFMPEG", "20"))
PROFILE_DEVICES = int(env("PROFILE_DEVICES", "3"))  # converted streams one profile can have going at once, one per device
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
AVATAR_COUNT = 36  # Has to match the AVATARS list in app.js
DEFAULT_PREFS = {"audio_lang": "English", "still_watching": 0, "load_stats": True, "sub_lang": "", "sub_size": "m", "autoplay": True, "skip_intro": False, "share_events": False, "blur_watched": False, "auto_next_source": False, "live_all_countries": False}

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
CREATE TABLE IF NOT EXISTS deleted_media (id INTEGER PRIMARY KEY AUTOINCREMENT, rel TEXT, origin TEXT, name TEXT, title TEXT, ntitle TEXT,
    year TEXT, season INTEGER, episode INTEGER, size INTEGER, at REAL, by TEXT);
CREATE TABLE IF NOT EXISTS media_allow (key TEXT PRIMARY KEY, name TEXT, at REAL);
CREATE TABLE IF NOT EXISTS media_origin (rel TEXT PRIMARY KEY, source TEXT, label TEXT, at REAL);
CREATE TABLE IF NOT EXISTS play_sources (ntitle TEXT, year TEXT, season INTEGER, episode INTEGER, addon TEXT, label TEXT, at REAL,
    PRIMARY KEY (ntitle, year, season, episode));
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
CREATE TABLE IF NOT EXISTS online_intros (key TEXT PRIMARY KEY, intro_s REAL, intro_e REAL, outro_s REAL, fetched REAL);
CREATE TABLE IF NOT EXISTS stream_health (id TEXT PRIMARY KEY, good REAL, bad REAL);
CREATE TABLE IF NOT EXISTS sources_seen (id TEXT PRIMARY KEY, kind TEXT, has INTEGER, checked REAL);
CREATE TABLE IF NOT EXISTS iptv_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, epg TEXT, local INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1, added REAL, refreshed REAL, count INTEGER DEFAULT 0, error TEXT);
CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, list_id INTEGER, name TEXT, logo TEXT, grp TEXT, country TEXT, tvg TEXT,
  url TEXT, headers TEXT, rank INTEGER, ok INTEGER, checked REAL, junk TEXT, pop INTEGER);
CREATE TABLE IF NOT EXISTS live_usage (name TEXT PRIMARY KEY, plays INTEGER, last REAL);
CREATE TABLE IF NOT EXISTS live_filter (kind TEXT, value TEXT, PRIMARY KEY (kind, value));
CREATE INDEX IF NOT EXISTS channels_rank ON channels(rank, name);
CREATE TABLE IF NOT EXISTS epg (tvg TEXT, start REAL, stop REAL, title TEXT, sub TEXT, descr TEXT);
CREATE INDEX IF NOT EXISTS epg_ch ON epg(tvg, start);
CREATE TABLE IF NOT EXISTS live_fav (profile_id INTEGER, cid TEXT, added REAL, name TEXT, PRIMARY KEY (profile_id, cid));
CREATE TABLE IF NOT EXISTS recordings (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, cid TEXT, channel TEXT, title TEXT,
  start REAL, stop REAL, state TEXT, path TEXT, size INTEGER, error TEXT, created REAL);
CREATE TABLE IF NOT EXISTS embed_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, player TEXT, enabled INTEGER DEFAULT 1, added REAL, error TEXT);
CREATE TABLE IF NOT EXISTS streams (id TEXT PRIMARY KEY, url TEXT NOT NULL, kind TEXT, video_id TEXT, name TEXT, label TEXT,
    addon TEXT, poster TEXT, year TEXT, added REAL);
"""


class DB:
    def __init__(self, path):
        self.lock = threading.Lock()
        self.c = sqlite3.connect(str(path), check_same_thread=False)
        self.c.row_factory = sqlite3.Row
        self.c.execute("PRAGMA journal_mode=WAL")
        # WAL with normal sync is safe from corruption, a power cut can only lose the last commit. Full sync was an fsync on every write
        for p in ("synchronous=NORMAL", "busy_timeout=5000", "cache_size=-65536", "temp_store=MEMORY", "mmap_size=268435456", "journal_size_limit=67108864"):
            self.c.execute("PRAGMA " + p)
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
    for c in ("folder", "members", "image"):
        # folder groups profiles on the picker, members makes it a joint profile ([a, b]), image is a picture icon
        if c not in cols:
            d.q(f"ALTER TABLE profiles ADD COLUMN {c} TEXT")
    ecols = [r["name"] for r in d.q("PRAGMA table_info(embed_sources)")]
    for c in ("items", "title_key", "image_key"):
        if c not in ecols:
            d.q(f"ALTER TABLE embed_sources ADD COLUMN {c} TEXT")  # where the list is in the JSON and which fields to use
    if "src_prio" not in [r["name"] for r in d.q("PRAGMA table_info(addons)")]:
        d.q("ALTER TABLE addons ADD COLUMN src_prio INTEGER DEFAULT 0")  # 1 = its sources are tried first, 2 next, and so on, 0 = normal
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
    if "name" not in [r["name"] for r in d.q("PRAGMA table_info(live_fav)")]:
        d.q("ALTER TABLE live_fav ADD COLUMN name TEXT")
    if d.q("PRAGMA user_version")[0]["user_version"] < 3:
        # Favourites are kept by channel name from now on (the same channel can be in a list more than once, and its id changes when the
        # playlist link does), so each one gets its name, and a channel faved twice is one favourite again
        d.q("UPDATE live_fav SET name = (SELECT lower(c.name) FROM channels c WHERE c.id = live_fav.cid) WHERE name IS NULL")
        d.q("DELETE FROM live_fav WHERE name IS NOT NULL AND rowid NOT IN (SELECT MIN(rowid) FROM live_fav WHERE name IS NOT NULL GROUP BY profile_id, name)")
        # Channels switched off by a single failed attempt or a busy provider get another look (the check runs again on its own)
        d.q("UPDATE channels SET ok = NULL, checked = NULL WHERE ok = 0")
        d.q("PRAGMA user_version = 3")
    if "junk" not in [r["name"] for r in d.q("PRAGMA table_info(channels)")]:
        d.q("ALTER TABLE channels ADD COLUMN junk TEXT")
    if d.q("PRAGMA user_version")[0]["user_version"] < 4:
        # Every channel gets the kind of channel it is (religious, shopping...), which the admin can choose to hide in Settings
        d.many("UPDATE channels SET junk = ? WHERE id = ?", [(classify_junk(r["name"], r["grp"]), r["id"]) for r in d.q("SELECT id, name, grp FROM channels")])
        d.q("PRAGMA user_version = 4")
    if "pop" not in [r["name"] for r in d.q("PRAGMA table_info(channels)")]:
        d.q("ALTER TABLE channels ADD COLUMN pop INTEGER")
    if d.q("PRAGMA user_version")[0]["user_version"] < 5:
        # How popular each channel is (channel_popularity.py), which the list is sorted by
        d.many("UPDATE channels SET pop = ? WHERE id = ?", [(popularity(r["name"]), r["id"]) for r in d.q("SELECT id, name FROM channels")])
        d.q("PRAGMA user_version = 5")
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


def members_of(r):
    try:
        m = json.loads(r["members"] or "[]")
    except Exception:
        m = []
    return [int(x) for x in m if str(x).isdigit()] if isinstance(m, list) else []


def prof_public(r, rows=None):
    """What anyone can see about a profile, joint ones get there members icons so they can be drawn overlapping"""
    ms = members_of(r)
    out = {"id": r["id"], "name": r["name"], "icon": r["icon"], "image": r["image"] or "", "folder": r["folder"] or "",
           "kids": bool(r["kids"]), "locked": bool(r["pin"])}
    if ms:
        by = {x["id"]: x for x in (rows or db().q("SELECT * FROM profiles WHERE id IN (%s)" % ",".join("?" * len(ms)), ms))}
        mem = [by[m] for m in ms if m in by]
        out["members"] = [{"id": m["id"], "name": m["name"], "icon": m["icon"], "image": m["image"] or ""} for m in mem]
        # A joint profile is locked when either person locked theirs, and either of there codes opens it
        out["locked"] = any(m["pin"] for m in mem)
    return out


def profile_row(pid):
    rows = db().q("SELECT * FROM profiles WHERE id = ?", (pid,))
    if not rows or rows[0]["pending"]:
        return None
    r = rows[0]
    prefs = {**DEFAULT_PREFS, **(json.loads(r["prefs"] or "{}"))}
    return {**prof_public(r), "prefs": prefs}


def group_ids(pid):
    """The profile plus, for a joint one, the two people in it. Reads merge all of them"""
    r = db().q("SELECT members FROM profiles WHERE id = ?", (pid,))
    return [pid] + [m for m in (members_of(r[0]) if r else []) if m != pid]


def ids_sql(ids):
    return ",".join("?" * len(ids))


def pin_epoch(pid):
    """A locked profile's cookie is tied to the current code, so changing or removing the code logs every other device out of it.
    No code set means nothing extra, so cookies for open profiles carry on working"""
    r = db().q("SELECT pin FROM profiles WHERE id = ?", (pid,))
    return hashlib.sha1(r[0]["pin"].encode()).hexdigest()[:10] if r and r[0]["pin"] else ""


def profile_cookie(pid, request):
    e = pin_epoch(pid)
    return f"{pid}.{sign('profile', f'{pid}:{e}' if e else pid, browser_key(request))[:32]}"


def cookie_profile(request):
    # The cookie is signed and tied to this device, so nobody can switch into a locked profile by changing the number
    # in it, and a copied cookie on another device just lands on the profile picker
    raw = request.cookies.get("kino_profile", "")
    pid, _, sig = raw.partition(".")
    if not pid.isdigit():
        return None
    e = pin_epoch(int(pid))
    if not hmac.compare_digest(sig, sign("profile", f"{pid}:{e}" if e else int(pid), browser_key(request))[:32]):
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


GUESS_CACHE = {}


def guess(rel):
    # guessit is slow (lots of regex) and the library gets rescanned every few minutes, the same names give the same answer
    g = GUESS_CACHE.get(rel)
    if g is None:
        if len(GUESS_CACHE) > 50000:
            GUESS_CACHE.clear()
        g = GUESS_CACHE[rel] = guess_uncached(rel)
    return dict(g)


def guess_uncached(rel):
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
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("kino-recordings", "kino-backups")]
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
    by_dir = {}
    for v in vids:
        by_dir.setdefault(v.parent, []).append(v)
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
        same_dir_videos = by_dir[p.parent]
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
        "runtime": m.get("runtime"), "released": m.get("released"), "rating": m.get("imdbRating"), "cast": (m.get("cast") or [])[:10],
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


# Meta used to be a select plus a json parse for every title on every home, search or browse, with the whole episode list in it.
# Now the list pages use META_LITE (no episode list, kept in memory), single title pages use a small LRU of full ones and
# the episode search uses EP_INDEX. All three get dropped whenever a meta row is written, see meta_put
META_LITE = {}
META_FULL = collections.OrderedDict()
EP_INDEX = {}
META_FULL_MAX = 200


def meta_drop(key):
    META_LITE.pop(key, None)
    META_FULL.pop(key, None)
    EP_INDEX.pop(key, None)


def meta_put(key, m):
    db().q("INSERT OR REPLACE INTO meta VALUES (?,?,?)", (key, json.dumps(m or {"none": True}), time.time()))
    meta_drop(key)


def cached_meta(key):
    hit = META_FULL.get(key)
    if hit is not None:
        META_FULL.move_to_end(key)
        return hit
    rows = db().q("SELECT data, fetched FROM meta WHERE key = ?", (key,))
    out = (json.loads(rows[0]["data"]), rows[0]["fetched"]) if rows else (None, 0)
    if rows:
        META_FULL[key] = out
        while len(META_FULL) > META_FULL_MAX:
            META_FULL.popitem(last=False)
    return out


def lite_of(data):
    return {k: v for k, v in data.items() if k != "videos"} if isinstance(data, dict) else None


def meta_lite(key):
    hit = META_LITE.get(key)
    if hit is not None:
        return hit[0]
    rows = db().q("SELECT data, fetched FROM meta WHERE key = ?", (key,))
    lite = lite_of(json.loads(rows[0]["data"])) if rows else None
    META_LITE[key] = (lite, rows[0]["fetched"] if rows else 0)
    return lite


def warm_meta():
    """Fills META_LITE in one go at startup (in a thread) so the first home page isnt the one that pays for it"""
    n = 0
    for r in db().q("SELECT key, data, fetched FROM meta WHERE key NOT LIKE 'ext:%'"):
        try:
            META_LITE[r["key"]] = (lite_of(json.loads(r["data"])), r["fetched"])
            n += 1
        except ValueError:
            continue
    log.info("kino meta warmed, %s titles", n)


def episode_index(key):
    """Episode names of a series as a small list, so searching episodes doesnt load every episode list in the library"""
    hit = EP_INDEX.get(key)
    if hit is None:
        m, _ = cached_meta(key)
        hit = [(v.get("season"), v.get("episode"), v.get("name"), norm(v.get("name") or ""), v.get("thumbnail"))
               for v in (m or {}).get("videos", []) if v.get("name")]
        EP_INDEX[key] = hit
    return hit


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
            meta_put(key, m)
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
    net = ["-protocol_whitelist", "http,https,tcp,tls,crypto"] if str(path).startswith(("http://", "https://")) else []
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams",
                          "-show_chapters", *net, path], capture_output=True, timeout=120)
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
            have = {r["path"]: r["size"] for r in db().q("SELECT path, size FROM probe")}
            for f in list(LIB["files"].values()):
                if have.get(f["path"]) != f["size"]:
                    try:
                        await get_probe(f)
                    except Exception as e:
                        log.info("probe failed for %s: %s", f["name"], e)
                    await asyncio.sleep(1)
        except Exception as e:
            log.warning("probe worker: %s", e)
        await asyncio.sleep(60)


# ---------------------------------------------------------------- intro times from the internet

# IntroDB is a free community database of intro and credits times, looked up by the imdb id plus season and episode, its
# the fallback when the file has no chapters and nobody marked the season and the audio matching found nothing, and its the
# only thing streams from addons get cause theres no file to compare. Set INTRODB_URL to nothing to turn it off
INTRODB_URL = env("INTRODB_URL", "https://api.introdb.app").rstrip("/")


async def online_segments(imdb, season, episode):
    """{"intro": (start, end) or None, "outro": start or None} for an episode, or None when we couldn't ask"""
    if not INTRODB_URL or not str(imdb or "").startswith("tt") or season is None or episode is None:
        return None
    key = f"{imdb}:{season}:{episode}"
    row = db().q("SELECT * FROM online_intros WHERE key = ?", (key,))
    now = time.time()

    def out(r):
        return {"intro": (r["intro_s"], r["intro_e"]) if r["intro_s"] is not None else None, "outro": r["outro_s"]}
    if row:
        found = row[0]["intro_s"] is not None or row[0]["outro_s"] is not None
        if now - row[0]["fetched"] < (30 if found else 3) * 86400:
            return out(row[0])
    try:
        async with httpx.AsyncClient(timeout=4) as c:
            r = await c.get(f"{INTRODB_URL}/segments", params={"imdb_id": imdb, "season": int(season), "episode": int(episode)})
    except Exception:
        return out(row[0]) if row else None  # cant reach it right now an old answer is better then none
    if r.status_code == 429 or r.status_code >= 500:
        return out(row[0]) if row else None
    j = {}
    if r.status_code == 200:
        try:
            j = r.json()
        except ValueError:
            j = {}
    intro = outro = None
    seg = j.get("intro") if isinstance(j, dict) else None
    if isinstance(seg, dict) and not j.get("no_intro"):
        try:
            a, b = float(seg["start_sec"]), float(seg["end_sec"])
            if 0 <= a and 5 <= b - a <= 180:
                intro = (a, b)
        except (KeyError, TypeError, ValueError):
            pass
    seg = j.get("outro") if isinstance(j, dict) else None
    if isinstance(seg, dict) and not j.get("no_outro"):
        try:
            outro = float(seg["start_sec"])
        except (KeyError, TypeError, ValueError):
            pass
    db().q("INSERT OR REPLACE INTO online_intros VALUES (?,?,?,?,?)", (key, intro[0] if intro else None, intro[1] if intro else None, outro, now))
    return {"intro": intro, "outro": outro}


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
    """Reads the mount table instead of touching the mount. ismount does a stat on it and that hangs forever when the
    sshfs connection froze, and since this runs on every home page that took the whole app down with it"""
    if env("ASSUME_MOUNTED", "0") == "1":
        return True
    try:
        want = os.path.normpath(str(MEDIA_DIR))
        with open("/proc/self/mountinfo") as f:
            for line in f:
                parts = line.split()
                if len(parts) > 4 and re.sub(r"\\([0-7]{3})", lambda m: chr(int(m.group(1), 8)), parts[4]) == want:
                    return True
        return False
    except OSError:
        return os.path.ismount(MEDIA_DIR)  # No /proc (not linux), only happens when developing


BOX_DISK = {"v": None, "t": 0.0, "busy": False}


def disk_box():
    """Free space on the storage box. Asking is a network call that can hang, so it happens in a thread and the answer is kept
    for 30 seconds, a frozen mount just means the old number (or none) instead of a stuck page"""
    def refresh():
        try:
            BOX_DISK["v"] = disk(MEDIA_DIR)
            BOX_DISK["t"] = time.time()
        finally:
            BOX_DISK["busy"] = False
    if time.time() - BOX_DISK["t"] > 30 and not BOX_DISK["busy"]:
        BOX_DISK["busy"] = True
        th = threading.Thread(target=refresh, daemon=True)
        th.start()
        th.join(1.0)
    return BOX_DISK["v"]


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
                continue
            if s.get("live") or s["proc"].returncode is not None:
                continue
            # ffmpeg runs faster than playback and keeps every segment, so a long film would fill the disk. Once its about 15
            # minutes ahead of what the player fetched it gets paused, and carries on when the player has caught up
            try:
                ahead = len(list(s["dir"].glob("seg*.m4s"))) - s.get("maxseg", 0)
                if ahead > 150 and not s.get("stopped"):
                    os.kill(s["proc"].pid, signal.SIGSTOP)
                    s["stopped"] = True
                elif ahead < 80 and s.get("stopped"):
                    os.kill(s["proc"].pid, signal.SIGCONT)
                    s["stopped"] = False
            except (ProcessLookupError, OSError):
                pass
        # Disk nearly full (sqlite needs room too), the session thats been quiet the longest goes
        try:
            if shutil.disk_usage(HLS_DIR).free < 3 * 1024**3 and SESS:
                kill_session(min(SESS, key=lambda k: SESS[k]["last"]))
        except OSError:
            pass
        voice_unload()



# ---------------------------------------------------------------- app

STATIC_VERSION = {"v": "1"}


@asynccontextmanager
async def lifespan(app):
    db()
    await asyncio.to_thread(write_deleted_json)  # Keeps the sync's copy of what was deleted in step with the database
    if len(env("KINO_SECRET", "").strip()) < 16:
        log.warning("KINO_SECRET is missing or under 16 chars, using the generated one in %s, set a proper one in /etc/kino/kino.env", DATA_DIR / "secret.key")
    shutil.rmtree(HLS_DIR, ignore_errors=True)
    HLS_DIR.mkdir(parents=True, exist_ok=True)
    SUBS_DIR.mkdir(parents=True, exist_ok=True)
    asyncio.create_task(asyncio.to_thread(warm_meta))  # Fills the meta cache in the background so the first home page isnt slow
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

    tasks = [asyncio.create_task(c()) for c in (scanner, stats_worker, session_reaper, probe_worker, catalog_worker, intro_worker, backup_worker, live_worker, rec_worker)]
    yield
    for t in tasks:
        t.cancel()
    for sid in list(SESS):
        kill_session(sid)


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
SERVER_ERRORS = collections.deque(maxlen=40)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    # Anything that wasnt handled used to come back as a bare "Internal Server Error", so the app could only say
    # "Request failed (500)". Now it says what went wrong, and the admin sees it on the Server page
    log.exception("error on %s", request.url.path)
    SERVER_ERRORS.appendleft({"at": time.time(), "path": request.url.path, "error": f"{type(exc).__name__}: {str(exc)[:300]}"})
    # The message part can have paths or sql in it, so only the admin gets that, everyone else just gets the type
    more = f"{type(exc).__name__}: {str(exc)[:160]}" if admin_user(request) else type(exc).__name__
    return JSONResponse({"detail": f"Something went wrong on the server ({more})"}, status_code=500)

CSP = ("default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; "
       "script-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-src https:; frame-ancestors 'none'; "
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
    # Static files revalidate every time (the etag keeps that cheap) so an edited file shows up without waiting on the browser cache
    if path.startswith("/static/") and "cache-control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-cache"
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
    ids = group_ids(p["id"])
    rows = db().q(f"SELECT file_id, pos, dur, watched, MAX(updated) AS updated FROM watch WHERE profile_id IN ({ids_sql(ids)}) "
                  "AND (? = 0 OR updated < ?) GROUP BY file_id ORDER BY updated DESC LIMIT 80", (*ids, before, before))
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
    ids = group_ids(p["id"])
    if file_id:
        db().q(f"DELETE FROM watch WHERE profile_id IN ({ids_sql(ids)}) AND file_id = ?", (*ids, file_id))
    else:
        # Clearing all of it on a joint profile only clears what was watched together, not each persons own history
        db().q("DELETE FROM watch WHERE profile_id = ?", (p["id"],))
        db().q("DELETE FROM cont_hidden WHERE profile_id = ?", (p["id"],))
    return {"ok": True}

# ---- profiles and admin sign in

def pub_profile(p):
    return {"id": p["id"], "name": p["name"], "icon": p["icon"]}


@app.get("/api/features")
async def features(p=Depends(current_profile)):
    """Which sidebar sections have anything in them"""
    live = bool(db().q("SELECT 1 FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE l.enabled = 1 LIMIT 1")) or bool(live_catalogs()) \
        or (not p.get("kids") and bool(db().q("SELECT 1 FROM embed_sources WHERE enabled = 1 LIMIT 1")))
    return {"live": live and (not p.get("kids") or bool(db().q("SELECT 1 FROM channels WHERE grp = 'Kids' LIMIT 1"))),
            "videos": any(video_type(c.get("type")) for _, c in home_catalogs())}


@app.get("/api/me")
async def me(request: Request):
    return {"profile": cookie_profile(request), "admin": admin_user(request), "ip": client_ip(request)}


@app.get("/api/profiles")
async def profiles(request: Request):
    rows = db().q("SELECT * FROM profiles ORDER BY id")
    live = [r for r in rows if not r["pending"]]
    out = {"profiles": [prof_public(r, live) for r in live], "admin": admin_user(request)}
    out["folders"] = sorted({r["folder"] for r in live if r["folder"]}, key=str.lower)
    if admin_user(request):
        out["pending"] = [prof_public(r, live) for r in rows if r["pending"]]
    return out


def pin_ok(pid, code):
    """Checks a code against a profile, for a joint one either persons code works"""
    r = db().q("SELECT pin, members FROM profiles WHERE id = ?", (pid,))
    if not r:
        return False
    ids = members_of(r[0])
    hashes = [x["pin"] for x in db().q(f"SELECT pin FROM profiles WHERE id IN ({ids_sql(ids)})", ids)] if ids else [r[0]["pin"]]
    return any(h and check_pw(code, h) for h in hashes)


def logsafe(v):
    """Client text goes in the log, so no new lines and no fake login lines that fail2ban could pick up"""
    return re.sub(r"[\x00-\x1f\x7f]", " ", str(v)).replace("kino login", "kino_login")


def pin_guard(request, *pids):
    """Wrong code limiter. Counted per ip and profile, plus a looser global count per profile so rotating ips doesnt help"""
    now = time.time()
    ip = client_ip(request)
    mine = [f"{ip}|{p}" for p in pids]
    allk = mine + [f"*|{p}" for p in pids]
    for k in allk:
        recent = [t for t in PIN_TRIES.get(k, []) if now - t < 300]
        PIN_TRIES[k] = recent
        if len(recent) >= (6 if not k.startswith("*") else 20):
            raise HTTPException(429, "Too many wrong codes, wait a few minutes and try again")
    if len(PIN_TRIES) > 4000:
        for k in [k for k, v in PIN_TRIES.items() if not v or now - v[-1] > 300]:
            PIN_TRIES.pop(k, None)
    return mine, allk


def pin_fail(keys):
    for k in keys[1]:
        PIN_TRIES.setdefault(k, []).append(time.time())


def pin_pass(keys):
    # Only forgets this ip on this profile, a good code on one profile must never wipe the count for another
    for k in keys[0]:
        PIN_TRIES.pop(k, None)


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
        keys = pin_guard(request, pid)
        code = str(b.get("pin") or "")
        if not code:
            raise HTTPException(401, "This profile is locked")
        if not re.fullmatch(r"\d{4}", code) or not await asyncio.to_thread(pin_ok, pid, code):
            pin_fail(keys)
            raise HTTPException(403, "That code isn't right")
        pin_pass(keys)
    resp = JSONResponse({"ok": True, "profile": p})
    set_cookie(resp, "kino_profile", profile_cookie(pid, request), 365 * 86400)
    return resp


PIN_TRIES = {}


@app.post("/api/profile/pin")
async def profile_pin(request: Request, p=Depends(current_profile)):
    """Sets, changes or removes this profile's 4 digit code. Changing or removing it needs the old one"""
    b = await request.json()
    if p.get("members"):
        raise HTTPException(400, "A joint profile uses the codes of the people in it, change those instead")
    new, old = str(b.get("pin") or ""), str(b.get("old") or "")
    row = db().q("SELECT pin FROM profiles WHERE id = ?", (p["id"],))
    if row[0]["pin"]:
        keys = pin_guard(request, p["id"])
        if not (re.fullmatch(r"\d{4}", old) and await asyncio.to_thread(check_pw, old, row[0]["pin"])):
            pin_fail(keys)
            raise HTTPException(403, "The current code isn't right")
        pin_pass(keys)
    if new and not re.fullmatch(r"\d{4}", new):
        raise HTTPException(400, "The code has to be 4 numbers")
    db().q("UPDATE profiles SET pin = ? WHERE id = ?", (hash_pw(new) if new else None, p["id"]))
    resp = JSONResponse({"ok": True, "profile": profile_row(p["id"])})
    # The code is part of the cookie, so this device gets a fresh one and the others have to pick the profile again
    set_cookie(resp, "kino_profile", profile_cookie(p["id"], request), 365 * 86400)
    return resp


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
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE members IS NULL OR members = ''")[0]["n"] >= 12:
        raise HTTPException(400, "Kino already has the maximum of 12 profiles")
    db().q("INSERT INTO profiles (name, icon, prefs, created, kids, pending, image, folder) VALUES (?,?,?,?,?,?,?,?)",
           (clean_name(b.get("name")), clean_icon(b.get("icon", 0)), json.dumps(DEFAULT_PREFS), time.time(), 0, 1,
            clean_image(b.get("image")), clean_folder(b.get("folder"))))
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


def clean_folder(f):
    return re.sub(r"\s+", " ", str(f or "")).strip()[:24]


# Picture icons can only come from the places the icon search uses, so a profile cant be pointed at some random url
AV_IMG_HOSTS = {"m.media-amazon.com", "images.metahub.space", "i.imgflip.com"}
SI_VER = "16.36.0"  # simple-icons, the brand logos. Pinned so the list and the icons always match


def clean_image(v):
    v = str(v or "").strip()
    if not v:
        return ""
    kind, _, rest = v.partition("|")
    if kind == "img":
        u = urlparse(rest)
        if u.scheme == "https" and u.hostname in AV_IMG_HOSTS and len(rest) < 500:
            return v
    elif kind == "logo":
        slug, _, hx = rest.partition("|")
        if re.fullmatch(r"[a-z0-9_-]{1,60}", slug) and re.fullmatch(r"[0-9A-Fa-f]{6}", hx):
            return f"logo|{slug}|{hx.upper()}"
    raise HTTPException(400, "That picture can't be used as an icon")


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
    icon = clean_icon(b.get("icon", p["icon"])) if not p.get("members") else p["icon"]
    image = clean_image(b.get("image", p.get("image"))) if not p.get("members") else ""
    folder = clean_folder(b.get("folder", p.get("folder")))
    prefs = dict(p["prefs"])
    for k, v in (b.get("prefs") or {}).items():
        if k in ("audio_lang", "sub_lang"):
            prefs[k] = str(v or "")[:30]
        elif k == "sub_size" and v in ("s", "m", "l"):
            prefs[k] = v
        elif k in ("autoplay", "skip_intro", "share_events", "blur_watched", "load_stats", "auto_next_source", "live_all_countries"):
            prefs[k] = bool(v)
        elif k == "still_watching":
            # Minutes without touching anything before the player asks if anyones still there, 0 is off
            prefs[k] = int(v) if str(v).isdigit() and int(v) in (0, 30, 60, 90, 120, 180, 240) else 0
    db().q("UPDATE profiles SET name = ?, icon = ?, prefs = ?, image = ?, folder = ? WHERE id = ?", (name, icon, json.dumps(prefs), image, folder, p["id"]))
    return {"ok": True, "profile": profile_row(p["id"])}


@app.post("/api/admin/profiles")
async def profile_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE members IS NULL OR members = ''")[0]["n"] >= 12:
        raise HTTPException(400, "That's the maximum of 12 profiles")
    db().q("INSERT INTO profiles (name, icon, prefs, created, kids, image, folder) VALUES (?,?,?,?,?,?,?)",
           (clean_name(b.get("name")), clean_icon(b.get("icon", 0)), json.dumps(DEFAULT_PREFS), time.time(), 1 if b.get("kids") else 0,
            clean_image(b.get("image")), clean_folder(b.get("folder"))))
    log.info("kino profile added by %s", admin)
    return {"ok": True}


@app.put("/api/admin/profiles/{pid}")
async def profile_admin_edit(pid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if not profile_row(pid):
        raise HTTPException(404, "That profile doesn't exist")
    cur = db().q("SELECT icon, members FROM profiles WHERE id = ?", (pid,))[0]
    joint = bool(members_of(cur))
    # A joint profile's icon is made from its two people's icons, so it only takes a name, folder and kids
    db().q("UPDATE profiles SET name = ?, icon = ? WHERE id = ?", (clean_name(b.get("name")), cur["icon"] if joint else clean_icon(b.get("icon")), pid))
    if "image" in b and not joint:
        db().q("UPDATE profiles SET image = ? WHERE id = ?", (clean_image(b["image"]), pid))
    if "folder" in b:
        db().q("UPDATE profiles SET folder = ? WHERE id = ?", (clean_folder(b["folder"]), pid))
    if "kids" in b:
        kids = 1 if b["kids"] else 0
        if joint:
            # Stays a kids profile while either person in it is one, nothing gets past the kids rules by joining
            ms = members_of(cur)
            if db().q(f"SELECT 1 FROM profiles WHERE id IN ({ids_sql(ms)}) AND kids = 1", ms):
                kids = 1
        db().q("UPDATE profiles SET kids = ? WHERE id = ?", (kids, pid))
        if kids and not joint:
            for r in db().q("SELECT id, members FROM profiles WHERE members IS NOT NULL AND members != ''"):
                if pid in members_of(r):
                    db().q("UPDATE profiles SET kids = 1 WHERE id = ?", (r["id"],))
    return {"ok": True}


@app.delete("/api/admin/profiles/{pid}")
async def profile_delete(pid: int, admin=Depends(require_admin)):
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE pending = 0 AND (members IS NULL OR members = '')")[0]["n"] <= 1 and not db().q("SELECT 1 FROM profiles WHERE id = ? AND (pending = 1 OR members LIKE '[%')", (pid,)):
        raise HTTPException(400, "Keep at least one profile")
    # Joint profiles with this person in them go too, the other person keeps everything they watched
    gone = [pid] + [r["id"] for r in db().q("SELECT id, members FROM profiles") if pid in members_of(r)]
    for g in gone:
        drop_profile(g)
    log.info("kino profile %s deleted by %s", pid, admin)
    return {"ok": True}


def drop_profile(pid):
    for t in ("watch", "ratings", "mylist", "cont_hidden", "search_recent", "live_fav"):
        db().q(f"DELETE FROM {t} WHERE profile_id = ?", (pid,))
    db().q("DELETE FROM profiles WHERE id = ?", (pid,))


@app.put("/api/admin/folders")
async def folder_rename(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    old, new = clean_folder(b.get("old")), clean_folder(b.get("new"))
    if not old:
        raise HTTPException(400, "Pick a folder to rename")
    db().q("UPDATE profiles SET folder = ? WHERE folder = ?", (new or None, old))
    return {"ok": True}


# ---- joint profiles
# Two people watching together get there own profile that sees both there histories, ratings, lists and interests.
# What they watch on it gets saved to both of them as well, so it shows up on there own profiles too

@app.post("/api/profiles/joint")
async def joint_create(request: Request):
    b = await request.json()
    try:
        a, c = int(b.get("a")), int(b.get("b"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Pick the two profiles to join")
    if a == c:
        raise HTTPException(400, "Pick two different profiles")
    rows = {r["id"]: r for r in db().q("SELECT * FROM profiles WHERE id IN (?, ?) AND pending = 0", (a, c))}
    if len(rows) < 2:
        raise HTTPException(404, "One of those profiles doesn't exist anymore")
    if any(members_of(r) for r in rows.values()):
        raise HTTPException(400, "A joint profile can't be joined again, pick the people themselves")
    for r in db().q("SELECT members FROM profiles"):
        if sorted(members_of(r)) == sorted([a, c]):
            raise HTTPException(400, f"{rows[a]['name']} and {rows[c]['name']} already have a joint profile")
    if db().q("SELECT COUNT(*) AS n FROM profiles WHERE members IS NOT NULL AND members != ''")[0]["n"] >= 12:
        raise HTTPException(400, "That's the most joint profiles Kino can have, split one first")
    # Both people have to agree, so a locked profile needs its own code. The admin can skip that
    if not admin_user(request):
        keys = pin_guard(request, a, c)
        pins = b.get("pins") or {}
        for pid in (a, c):
            if rows[pid]["pin"]:
                code = str(pins.get(str(pid)) or "")
                if not re.fullmatch(r"\d{4}", code) or not await asyncio.to_thread(check_pw, code, rows[pid]["pin"]):
                    pin_fail(keys)
                    raise HTTPException(403, f"{rows[pid]['name']}'s code isn't right")
        pin_pass(keys)
    name = clean_name(b.get("name") or f"{rows[a]['name']} & {rows[c]['name']}")
    folder = clean_folder(b.get("folder") if "folder" in b else (rows[a]["folder"] or rows[c]["folder"]))
    # If either of them is a kids profile the joint one is too, so nothing gets past the kids rules by joining
    kids = 1 if rows[a]["kids"] or rows[c]["kids"] else 0
    prefs = {**DEFAULT_PREFS, **json.loads(rows[a]["prefs"] or "{}")}
    prefs.pop("interests", None), prefs.pop("dismissed", None), prefs.pop("reset_at", None)
    mem = json.dumps([a, c])
    db().q("INSERT INTO profiles (name, icon, prefs, created, kids, folder, members) VALUES (?,?,?,?,?,?,?)",
           (name, rows[a]["icon"], json.dumps(prefs), time.time(), kids, folder or None, mem))
    jid = db().q("SELECT id FROM profiles WHERE members = ? ORDER BY id DESC LIMIT 1", (mem,))[0]["id"]
    log.info("kino joint profile %s made from %s and %s", jid, a, c)
    resp = JSONResponse({"ok": True, "profile": profile_row(jid)})
    set_cookie(resp, "kino_profile", profile_cookie(jid, request), 365 * 86400)
    return resp


@app.post("/api/profiles/{pid}/check-pin")
async def profile_check_pin(pid: int, request: Request):
    """Checks someones code without switching to there profile, used when two people join there profiles"""
    b = await request.json()
    keys = pin_guard(request, pid)
    code = str(b.get("pin") or "")
    if not re.fullmatch(r"\d{4}", code) or not await asyncio.to_thread(pin_ok, pid, code):
        pin_fail(keys)
        raise HTTPException(403, "That code isn't right")
    pin_pass(keys)
    return {"ok": True}


@app.post("/api/profiles/{jid}/split")
async def joint_split(jid: int, request: Request):
    """Ends a joint profile. Each persons own history stays as it is, the joint ones list and ratings go"""
    r = db().q("SELECT * FROM profiles WHERE id = ?", (jid,))
    if not r or not members_of(r[0]):
        raise HTTPException(404, "That isn't a joint profile")
    try:
        b = await request.json()
    except Exception:
        b = {}
    if not admin_user(request) and prof_public(r[0])["locked"]:
        keys = pin_guard(request, jid)
        code = str(b.get("pin") or "")
        if not re.fullmatch(r"\d{4}", code) or not await asyncio.to_thread(pin_ok, jid, code):
            pin_fail(keys)
            raise HTTPException(403, "That code isn't right")
        pin_pass(keys)
    drop_profile(jid)
    log.info("kino joint profile %s split", jid)
    return {"ok": True}


# ---- picture icons: posters, memes and brand logos, searched here so the browser never talks to those sites itself

AV_SRC = {}  # name -> (time, data)


async def av_json(name, url, ttl=86400):
    hit = AV_SRC.get(name)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    f = DATA_DIR / f"av-{name}.json"
    if f.exists() and time.time() - f.stat().st_mtime < ttl:
        data = read_json(str(f))
    else:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15, headers={"User-Agent": "kino-dashboard"}) as c:
                r = await c.get(url)
            r.raise_for_status()
            data = r.json()
            f.write_text(json.dumps(data))
        except Exception as e:
            log.warning("kino icon source %s failed: %s", name, e)
            data = read_json(str(f)) if f.exists() else None
    AV_SRC[name] = (time.time(), data)
    return data


POPULAR_LOGOS = ["netflix", "spotify", "apple", "google", "youtube", "playstation", "xbox", "nintendo", "steam", "twitch",
                 "discord", "tesla", "nike", "adidas", "lego", "starbucks", "mcdonalds", "bmw", "ferrari", "porsche", "f1",
                 "premierleague", "github", "reddit", "tiktok", "instagram", "snapchat", "whatsapp", "android", "linux",
                 "firefox", "airbnb", "uber", "dropbox", "bbciplayer", "hbo", "paramountplus", "crunchyroll", "plex", "kodi"]


def light_hex(hx):
    r, g, b = (int(hx[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 165


@app.get("/api/avatars/search")
async def avatar_search(src: str, q: str = ""):
    q = re.sub(r"\s+", " ", q).strip()[:60]
    nq = norm(q)
    out = []
    if OFFLINE_META:
        return {"items": []}
    if src == "movies":
        async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers={"User-Agent": "kino-dashboard"}) as c:
            urls = [f"{CINEMETA}/catalog/{k}/top/search={quote(q)}.json" for k in ("movie", "series")] if q \
                else [f"{CINEMETA}/catalog/{k}/top.json" for k in ("movie", "series")]
            res = await asyncio.gather(*[c.get(u) for u in urls], return_exceptions=True)
        lists = [(r.json().get("metas") or []) if not isinstance(r, Exception) and r.status_code == 200 else [] for r in res]
        # Movies and shows mixed together, best matches of each first
        for pair in itertools.zip_longest(*lists):
            for m in pair:
                if m and m.get("poster") and urlparse(m["poster"]).hostname in AV_IMG_HOSTS:
                    out.append({"name": m.get("name") or "", "image": "img|" + m["poster"]})
    elif src == "memes":
        d = await av_json("memes", "https://api.imgflip.com/get_memes") or {}
        for m in (d.get("data") or {}).get("memes") or []:
            if (not nq or nq in norm(m.get("name", ""))) and str(m.get("url", "")).startswith("https://i.imgflip.com/"):
                out.append({"name": m["name"], "image": "img|" + m["url"]})
    elif src == "logos":
        d = await av_json("logos", f"https://cdn.jsdelivr.net/npm/simple-icons@{SI_VER}/data/simple-icons.json", ttl=30 * 86400) or []
        icons = d if isinstance(d, list) else d.get("icons") or []
        by_slug = {i.get("slug"): i for i in icons if i.get("slug")}
        if not nq:
            pick = [by_slug[s] for s in POPULAR_LOGOS if s in by_slug]
        else:
            def score(i):
                t, names = norm(i.get("title", "")), [norm(a) for a in ((i.get("aliases") or {}).get("aka") or [])]
                return 0 if t == nq or nq in names else 1 if t.startswith(nq) else 2 if nq in t or any(nq in a for a in names) else 9
            pick = sorted((i for i in icons if score(i) < 9), key=lambda i: (score(i), len(i.get("title", ""))))
        for i in pick:
            if re.fullmatch(r"[0-9A-Fa-f]{6}", i.get("hex") or "") and re.fullmatch(r"[a-z0-9_-]{1,60}", i["slug"]):
                out.append({"name": i.get("title") or i["slug"], "image": f"logo|{i['slug']}|{i['hex'].upper()}"})
    else:
        raise HTTPException(400, "Unknown icon source")
    return {"items": out[:48], "logo_base": f"https://cdn.jsdelivr.net/npm/simple-icons@{SI_VER}/icons/"}


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
        log.warning("kino login failed user=%s ip=%s", re.sub(r"\s", "_", logsafe(user))[:64], ip)
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


def meta_light(t):
    """Same as meta_for but without the episode list, for loops over the whole library"""
    m = meta_lite(t["key"])
    return m if m and m.get("id") else None


def watch_map(pid):
    ids = group_ids(pid)
    out = {}
    # For a joint profile the newest progress of any of them wins, and something counts as watched if anyone watched it
    for r in db().q(f"SELECT file_id, pos, dur, watched, updated FROM watch WHERE profile_id IN ({ids_sql(ids)}) ORDER BY updated", ids):
        old = out.get(r["file_id"])
        out[r["file_id"]] = {**dict(r), "watched": max(r["watched"] or 0, (old or {}).get("watched") or 0)}
    return out


def rating_map(pid):
    ids = group_ids(pid)
    out = {}
    # The joint profiles own rating goes first, then the members ones
    for r in db().q(f"SELECT profile_id, title_id, value FROM ratings WHERE profile_id IN ({ids_sql(ids)})", ids):
        if r["profile_id"] == pid or r["title_id"] not in out:
            out[r["title_id"]] = r["value"]
    return out


def watch_row(pid, fid, cols="pos, dur, watched"):
    ids = group_ids(pid)
    return db().q(f"SELECT {cols} FROM watch WHERE profile_id IN ({ids_sql(ids)}) AND file_id = ? ORDER BY updated DESC LIMIT 1", (*ids, fid))


def put_watch(pid, fid, pos, dur, done, now=None):
    # Watching on a joint profile counts for both people in it
    for i in group_ids(pid):
        db().q("INSERT OR REPLACE INTO watch VALUES (?,?,?,?,?,?)", (i, fid, pos, dur, done, now or time.time()))


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


KIDS_RULES = {"rules": None}


def kids_rules():
    # Loaded once, a select per title made every kids home page a few thousand queries. Cleared where the rules are changed
    if KIDS_RULES["rules"] is None:
        KIDS_RULES["rules"] = {r["key"]: bool(r["allow"]) for r in db().q("SELECT key, allow FROM kids_rules")}
    return KIDS_RULES["rules"]


def kids_ok(genres, key):
    rule = kids_rules().get(key) if key else None
    if rule is not None:
        return rule
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
    out = [title_summary(t, meta_light(t), wm, rm) for t in LIB["titles"].values()]
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


def group_interests(pid, pr=None):
    """Interests of the profile, and for a joint one the members ones too"""
    own = pr or prof_prefs(pid)
    out, have = [], {norm(x) for x in own.get("dismissed", [])}
    for i, gid in enumerate(group_ids(pid)):
        for x in (own if i == 0 else prof_prefs(gid)).get("interests", []):
            if i == 0:
                have.discard(norm(x["name"]))
            if norm(x["name"]) not in have:
                have.add(norm(x["name"]))
                out.append(x)
    return out


def save_prefs(pid, pr):
    db().q("UPDATE profiles SET prefs = ? WHERE id = ?", (json.dumps(pr), pid))


def lib_people():
    """How many library titles each actor and director is in, used for suggestions and to tell what kind of interest a word is"""
    count = {}
    for t in LIB["titles"].values():
        cast, directors = people_of(meta_light(t) or {})
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
        cast, directors = people_of(meta_light(LIB["titles"][s["id"]]) or {})
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
    m = meta_light(LIB["titles"][s["id"]]) if s.get("id") and s["id"] in LIB["titles"] else None
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
    mine = group_interests(p["id"], pr)
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
    if any(i.get("auto") for i in gone) or not gone:
        # not gone means it came from someone in a joint profile, so it only stops counting here
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
    ints = group_interests(p["id"], pr)
    since = pr.get("reset_at") or 0
    gid = group_ids(p["id"])
    rated_at = {r["title_id"]: r["updated"] for r in db().q(f"SELECT title_id, MAX(updated) AS updated FROM ratings WHERE profile_id IN ({ids_sql(gid)}) GROUP BY title_id", gid)} if since else {}
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
        shelves.append({"id": "fresh", "title": "New Episodes in My List", "style": "fresh", "items": fresh})
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
        shelves.append({"id": "mylist", "title": "My List", "style": "poster", "items": mine})
    # A row for each of the newest two interests that has enough titles to fill one
    rows = 0
    for i in sorted(ints, key=lambda x: -(x.get("at") or 0)):
        items = [s for s in by_score if interest_matches(s, i)] if rows < 2 else []
        if len(items) >= 3:
            rows += 1
            shelves.append({"id": "int-" + norm(i["name"]).replace(" ", "-"), "title": f"Because You Like {i['name']}", "style": "poster", "items": items})
    fam = family_liked(p, summ)
    if len(fam) >= 2:
        shelves.append({"id": "family", "title": "Loved by the Family", "style": "poster", "items": fam})
    shelves.append({"id": "recent", "title": "Recently Added", "style": "wide", "items": recent})

    # Because you watched, based on the last thing they finished or loved
    anchors = sorted([s for s in summ if (s["watched_count"] or s["my_rating"] > 0) and s["genres"]],
                     key=lambda s: (s["my_rating"] == 2, s["last_activity"]), reverse=True)
    if anchors:
        a = anchors[0]
        similar = [s for s in visible if s["id"] != a["id"] and not s["watched"] and set(s["genres"]) & set(a["genres"])]
        similar.sort(key=lambda s: (len(set(s["genres"]) & set(a["genres"])), s["score"]), reverse=True)
        if len(similar) >= 2:
            shelves.append({"id": "because", "title": f"Because You Watched {a['name']}", "style": "poster", "items": similar})

    movies = [s for s in recent if s["kind"] == "movie"]
    shows = [s for s in recent if s["kind"] == "series"]
    if movies:
        shelves.append({"id": "movies", "title": "Movies", "style": "poster", "items": movies, "more": "#/movies"})
    if shows:
        shelves.append({"id": "shows", "title": "TV Shows", "style": "poster", "items": shows, "more": "#/shows"})

    rated = sorted([s for s in visible + pool if imdb_score(s) >= 7.5 and s["rating"]], key=imdb_score, reverse=True)
    if len(rated) >= 3:
        shelves.append({"id": "acclaimed", "title": "Critically Acclaimed", "style": "poster", "items": rated})

    shelves += addon_shelves(summ, kids=p.get("kids"))

    counts = {}
    for s in visible:
        for g in s["genres"]:
            counts[g] = counts.get(g, 0) + 1
    genres = sorted([g for g, n in counts.items() if n >= 3], key=lambda g: (weights.get(g, 0), counts[g]), reverse=True)
    for g in genres[:8]:
        # Library first, then whatever the addon catalogs already have for that genre, the rest loads as you scroll
        items = sorted([s for s in visible if g in s["genres"]], key=lambda s: s["score"], reverse=True)
        ids = {s.get("imdb") for s in items}
        items += [s for s in pool if g in (s.get("genres") or []) and s.get("imdb") not in ids]
        GENRE_ROWS["g-" + norm(g)] = (g, len([s for s in visible if g in s["genres"]]))
        shelves.append({"id": "g-" + norm(g), "title": g, "style": "poster", "items": items})

    unwatched = [s for s in by_score if not s["watched_count"] and not s["last_activity"]]
    if summ and len(unwatched) >= 3 and len(unwatched) < len(summ):
        shelves.append({"id": "new-to-you", "title": "Not Watched Yet", "style": "poster", "items": unwatched})

    # Each row starts with a first batch, the rest comes from /api/shelf as you move along it. Movies and TV Shows use
    # the same order as there own pages so loading more carries on without repeats
    for sh in shelves:
        if sh["id"] in ("movies", "shows"):
            sh["items"] = (await browse_list(p, "movie" if sh["id"] == "movies" else "series", 0, SHELF_FIRST))["items"]
    full = {}
    for sh in shelves:
        if sh["style"] not in ("poster", "wide") or sh["id"] == "continue":
            continue
        full[sh["id"]] = sh["items"]
        more = len(sh["items"]) > SHELF_FIRST or sh["id"] in ("movies", "shows") or sh["id"].startswith("addon-") or sh["id"].startswith("g-")
        sh["items"] = sh["items"][:SHELF_FIRST]
        sh["next"] = len(sh["items"]) if more else None
    HOME_FULL[p["id"]] = (time.time(), full)
    return {"hero": hero, "shelves": shelves, "empty": not summ, "storage": storage_state() if admin_user(request) else None, "scanning": LIB["scanning"], "error": LIB["error"],
            "mounted": box_mounted()}


SHELF_FIRST = 24
GENRE_ROWS = {}  # home genre row id -> (genre, how many library titles start it)
HOME_FULL = {}


async def catalog_page(a, c, skip=0, genre=None):
    """One page of an addon catalog, with the genre and how far in when the addon supports them"""
    extra = {}
    names = {e.get("name") for e in c.get("extra") or []} | set(c.get("extraSupported") or [])
    if genre and "genre" in names:
        extra["genre"] = genre
    if skip and "skip" in names:
        extra["skip"] = skip
    if skip and "skip" not in names:
        return []
    # One retry, catalogs like cinemeta's sometimes take a while. None means it failed, [] means the list really ended
    for attempt in (0, 1):
        try:
            j = await fetch_json(catalog_url(a, c, extra or None), ttl=3600, timeout=max(15, cat_timeout(c)))
            return [m for m in (j.get("metas") or []) if isinstance(m, dict) and m.get("id")]
        except Exception as e:
            if attempt:
                log.info("catalog page %s/%s skip=%s failed: %s", a["m"].get("name"), c.get("id"), skip, e)
    return None


def catalog_genres(c):
    for e in c.get("extra") or []:
        if e.get("name") == "genre":
            return list(e.get("options") or [])
    return []


@app.get("/api/shelf")
async def shelf_more(id: str, skip: int = 0, p=Depends(current_profile)):
    """More of a Home row from where it got to"""
    take = 40
    if id.startswith("addon-"):
        _, aid, kind, cid = id.split("-", 3)
        a = next((x for x in addon_rows() if str(x["id"]) == aid), None)
        c = next((x for x in (a["m"].get("catalogs") or []) if x.get("type") == kind and x.get("id") == cid), None) if a else None
        if not c:
            return {"items": [], "next": None}
        metas = await catalog_page(a, c, skip)
        if metas is None:
            # Didnt answer, the page asks again next time instead of thinking the row ended
            return {"items": [], "next": skip, "retry": True}
        summ, _, _ = all_summaries(p["id"])
        have = lib_by_meta_id(summ)
        items = drop_empty([have.get(m["id"]) or ext_preview(m, c["type"]) for m in metas])
        if p.get("kids"):
            items = [i for i in items if not i.get("external") or kids_ok(i["genres"], i["imdb"])]
        return {"items": items, "next": skip + len(metas) if metas else None}
    if id in ("movies", "shows"):
        r = await browse_list(p, "movie" if id == "movies" else "series", skip, take)
        return {"items": r["items"], "next": r["next"]}
    hit = HOME_FULL.get(p["id"])
    if id.startswith("g-") and id in GENRE_ROWS:
        # A genre row: what Home already had, then films and shows from the addon catalogs for that genre, half each
        full = hit[1].get(id, []) if hit else []
        if skip < len(full):
            return {"items": full[skip:skip + take], "next": skip + take}
        g, _ = GENRE_ROWS[id]
        page = (skip - len(full)) // take
        have = {x.get("imdb") for x in full}
        m, sr = await asyncio.gather(browse_list(p, "movie", page * 20, 20, [g], src="ext"), browse_list(p, "series", page * 20, 20, [g], src="ext"))
        items = [x for pair in itertools.zip_longest(m["items"], sr["items"]) for x in pair if x and x.get("imdb") not in have]
        return {"items": items, "next": skip + take if (m["next"] or sr["next"]) else None}
    full = hit[1].get(id, []) if hit else []
    items = full[skip:skip + take]
    return {"items": items, "next": skip + take if skip + take < len(full) else None}


async def browse_list(p, kind, skip=0, limit=60, genres=(), decade=0, minr=0.0, src="", sort="added", q=""):
    """Movies or TV Shows: the library first, then titles from the addon catalogs, a page at a time with the filters
    applied. Catalogs that can filter by genre are asked for that genre, so a genre keeps going past the first page"""
    yr = lambda t: int(str(t.get("releaseInfo") or t.get("year") or "")[:4]) if str(t.get("releaseInfo") or t.get("year") or "")[:4].isdigit() else 0
    rating = lambda t: float(t["rating"]) if str(t.get("rating") or "").replace(".", "", 1).isdigit() else 0.0
    qn = norm(q)

    def keep(t, fetched_genre=None):
        g = set(t.get("genres") or [])
        if fetched_genre and not g:
            g = {fetched_genre}
        if genres and not all(x in g or x == fetched_genre for x in genres):
            return False
        if decade and not (decade <= yr(t) < decade + 10):
            return False
        if minr and rating(t) < minr:
            return False
        if qn and qn not in norm(t.get("name")):
            return False
        return True

    keys = {"name": lambda t: norm(t["name"]), "year": lambda t: -yr(t), "old": lambda t: yr(t) or 9999,
            "rating": lambda t: -rating(t), "added": lambda t: -(t.get("added") or 0)}
    key = keys.get(sort, keys["added"])
    summ, _, _ = all_summaries(p["id"])
    have = lib_by_meta_id(summ)
    lib = [s for s in summ if s["kind"] == kind and keep(s)] if src != "ext" else []
    lib.sort(key=key)
    ext, done = [], True
    need = skip + limit - len(lib)
    if src != "lib" and need > 0:
        cats = [(a, c) for a, c in home_catalogs() if c.get("type") == kind or (kind == "series" and c.get("type") == "anime")]
        g0 = genres[0] if genres else None
        if g0:
            # Only catalogs that know the genre, or ones that dont filter at all
            cats = [(a, c) for a, c in cats if not catalog_genres(c) or g0 in catalog_genres(c)]
        offs = {i: 0 for i in range(len(cats))}
        live = set(offs)
        seen = set(have) | {s.get("imdb") for s in lib} | empty_ids()
        rounds = 0
        while live and len(ext) < need and rounds < 40:
            rounds += 1
            idx = sorted(live)
            pages = await asyncio.gather(*(catalog_page(cats[i][0], cats[i][1], offs[i], g0) for i in idx))
            for i, metas in zip(idx, pages):
                # An addon that's down is left out of this page instead of holding the whole list up
                if metas is None:
                    live.discard(i)
                    continue
                if not metas:
                    live.discard(i)
                    continue
                offs[i] += len(metas)
                for m in metas:
                    if m["id"] in seen:
                        continue
                    seen.add(m["id"])
                    t = ext_preview(m, cats[i][1]["type"])
                    if t["kind"] != kind:
                        continue
                    if p.get("kids") and not kids_ok(t["genres"], t["imdb"]):
                        continue
                    if keep(t, g0):
                        ext.append(t)
        done = not live
        if sort != "added":
            ext.sort(key=key)
    all_ = lib + ext
    items = all_[skip:skip + limit]
    more = len(all_) > skip + limit or not done
    return {"items": items, "next": skip + len(items) if more and items else None, "library": len(lib)}


@app.get("/api/browse")
async def browse(kind: str, skip: int = 0, genres: str = "", decade: int = 0, minr: float = 0, src: str = "", sort: str = "added", q: str = "",
                 p=Depends(current_profile)):
    if kind not in ("movie", "series"):
        raise HTTPException(400, "Unknown type")
    gl = [g for g in genres.split(",") if g][:4]
    r = await browse_list(p, kind, max(0, skip), 60, gl, decade, minr, src, sort, q)
    if skip == 0:
        # Every genre the library or a catalog knows about, most common in the library first
        summ, _, _ = all_summaries(p["id"])
        counts = {}
        for s in summ:
            if s["kind"] == kind:
                for g in s["genres"]:
                    counts[g] = counts.get(g, 0) + 1
        opts = set(counts)
        for a, c in home_catalogs():
            if c.get("type") == kind:
                opts |= set(catalog_genres(c))
        r["genres"] = sorted(opts, key=lambda g: (-counts.get(g, 0), g))
        r["decades"] = sorted({(int(str(s.get("releaseInfo") or "")[:4]) // 10) * 10 for s in summ if str(s.get("releaseInfo") or "")[:4].isdigit()} | set(range(1920, 2030, 10)), reverse=True)
        r["has_ext"] = any(c.get("type") == kind for _, c in home_catalogs())
    return r


def family_liked(p, summ):
    """What the other profiles liked or loved, loved ones first and then by how many people liked it"""
    by_id = {s["id"]: s for s in summ}
    votes = {}
    rows = db().q("SELECT r.title_id, r.value, r.updated, pr.name FROM ratings r JOIN profiles pr ON pr.id = r.profile_id "
                  f"WHERE r.profile_id NOT IN ({ids_sql(group_ids(p['id']))}) AND r.value > 0 AND pr.pending = 0", group_ids(p["id"]))
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
    empty = empty_ids()
    for a, c in home_catalogs():
        if c.get("type") not in ("movie", "series"):
            continue
        for m in (cached_catalog(a, c) or [])[:60]:
            mid = isinstance(m, dict) and m.get("id")
            if not mid or mid in have or mid in out or mid in empty:
                continue
            out[mid] = ext_preview(m, c["type"])
            ids.append((mid, out[mid]["kind"]))
    if not out:
        return []
    now = time.time()
    db().many("INSERT OR IGNORE INTO seen VALUES (?,?,?)", [(i, k, now) for i, k in ids])
    # Only the ones on this page, the table gets a row for every title an addon ever showed and was read whole on each home load
    first = {}
    want = [i for i, _ in ids]
    for i in range(0, len(want), 500):
        part = want[i:i + 500]
        for r in db().q("SELECT id, first FROM seen WHERE id IN (%s)" % ",".join("?" * len(part)), part):
            first[r["id"]] = r["first"]
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
    if video_type(c.get("type")):
        # Youtubio calls its rows Discover and Watch Later, YouTube Watch Later says where it's from
        t = c["type"]
        return n if t == "channel" or t.lower() in n.lower() else f"{t} {n}"
    if re.search(r"movie|film|show|series|tv|anime", n, re.I):
        return n
    word = {"movie": "Movies", "series": "Shows", "anime": "Anime", "tv": "Channels"}.get(c.get("type"), "")
    return f"{n} {word}".strip()


def addon_shelves(summ, kids=False):
    have = lib_by_meta_id(summ)
    empty = empty_ids()
    per_addon = {}
    cats = home_catalogs()
    count = {}
    for a, c in cats:
        count[a["id"]] = count.get(a["id"], 0) + 1
    for a, c in cats:
        metas = cached_catalog(a, c)
        title = shelf_title(c, a, count[a["id"]] > 1)
        row = {"id": f"addon-{a['id']}-{c['type']}-{c['id']}", "title": title, "style": "wide" if video_type(c.get("type")) else "poster",
               "source": None if (a["m"].get("name") or "") in title else a["m"].get("name")}
        if metas is None:
            # Not loaded yet (Kino just started, or a slow addon like youtubio), the page fills it in when it arrives
            # instead of the row being left off. Rows that come back empty take themselves off again
            if catalog_url(a, c) not in CAT_ERR or "too long" in CAT_ERR.get(catalog_url(a, c), ""):
                per_addon.setdefault(a["id"], []).append({**row, "items": [], "pending": True})
            continue
        items = drop_empty([have.get(m.get("id")) or ext_preview(m, c["type"]) for m in metas[:24] if isinstance(m, dict) and m.get("id")], empty)
        if kids:
            items = [i for i in items if not i.get("external") or kids_ok(i["genres"], i["imdb"])]
        if len(items) >= 3:
            per_addon.setdefault(a["id"], []).append({**row, "items": items})
    # Every row thats turned on in Settings shows, taking turns between addons so one with loads of catalogs doesnt
    # push the others to the bottom. Video rows (youtube) go after the films and shows
    out, lists = [], [[sh for sh in l if sh["style"] != "wide"] for l in per_addon.values()]
    lists = [l for l in lists if l]
    while lists:
        for l in lists:
            if l:
                out.append(l.pop(0))
        lists = [l for l in lists if l]
    return out + [sh for l in per_addon.values() for sh in l if sh["style"] == "wide"]


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
        m = meta_light(LIB["titles"][s["id"]]) or {}
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
        if t["kind"] != "series" or t["id"] not in ok_ids:
            continue
        idx = episode_index(t["key"])
        if not idx or not any(q in n for _, _, _, n, _ in idx):
            continue
        m = meta_light(t) or {}
        vids = {(se, ep): (name, thumb) for se, ep, name, _, thumb in idx}
        for fid in t["files"]:
            f = LIB["files"][fid]
            v = vids.get((f["season"], f["episode"]))
            if v and q in norm(v[0]):
                eps.append({"title_id": t["id"], "file_id": fid, "show": m.get("name"), "name": v[0],
                            "season": f["season"], "episode": f["episode"], "thumbnail": v[1]})
    ppl = sorted(people.values(), key=lambda x: (norm(x["name"]).startswith(q), x["count"]), reverse=True)
    # Live channels from the playlists whose name matches, english ones first like on the Live TV page
    cw = live_country_where(p)
    chans = db().q("SELECT c.* FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE l.enabled = 1 AND (c.ok IS NULL OR c.ok = 1) AND c.name LIKE ? "
                   + ("AND c.grp = 'Kids' " if p.get("kids") else "") + (f"AND {cw} " if cw else "") + "ORDER BY c.rank, c.name LIMIT 30",
                   (f"%{q}%", *(LIVE_HOME_COUNTRIES if cw else ())))
    guide = now_next({c["tvg"] for c in chans if c["tvg"]})
    embeds = []
    if not p.get("kids"):
        names = {r["id"]: r["name"] for r in db().q("SELECT id, name FROM embed_sources WHERE enabled = 1")}
        for sid, (_, items) in list(EMBED_CACHE.items()):
            if sid in names:
                embeds += [{**x, "source": names[sid]} for x in items if q in norm(x["title"])][:10]
    return {"titles": [s for _, s in scored[:60]], "episodes": eps[:20], "people": ppl[:12], "channels": [chan_out(c, guide) for c in chans], "embeds": embeds[:20]}


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
        cast, directors = people_of(meta_light(LIB["titles"][s["id"]]) or {})
        if any(norm(n) == want for n in cast + directors):
            out.append(s)
    out.sort(key=lambda s: str(s.get("releaseInfo") or ""), reverse=True)
    return {"name": name, "titles": out}


@app.get("/api/search/addons")
async def search_addons(q: str, videos: int = 0, p=Depends(current_profile)):
    # Kept separate from the library search so the library results show straight away and addons fill in after.
    # videos=1 is youtubio and the like, asked for seperatly so a slow yt-dlp search dosent hold up the films
    q = q.strip()[:60]
    external = []
    if videos and not any(video_type(c.get("type")) and (any(e.get("name") == "search" for e in c.get("extra") or []) or "search" in (c.get("extraSupported") or []))
                          for a in addon_rows() for c in a["m"].get("catalogs") or []):
        return {"external": [], "none": True}
    if q and addon_rows():
        summ, _, _ = all_summaries(p["id"])
        have = lib_by_meta_id(summ)
        empty = empty_ids()
        try:
            hits = await asyncio.wait_for(addon_search(None, q, videos=bool(videos)), timeout=27 if videos else 9)
        except asyncio.TimeoutError:
            hits = []
        seen, rank = {}, {}
        for a, c, m in hits:
            mid = m.get("id")
            if not mid or mid in have or (mid in empty and not video_type(c.get("type"))):
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
        if videos:
            # The addon already sorted these how youtube does, thats better than Kino's name matching
            external = list(seen.values())
        await rank_by_popularity(external[:12])
        external.sort(key=lambda x: x["score"], reverse=True)
    return {"external": external[:120]}


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
    ids = group_ids(pid)
    for fid in fids:
        if watched:
            row = db().q(f"SELECT MAX(dur) AS dur FROM watch WHERE profile_id IN ({ids_sql(ids)}) AND file_id = ?", (*ids, fid))
            dur = (row[0]["dur"] if row else 0) or 0
            put_watch(pid, fid, dur, dur, 1, now)
        else:
            db().q(f"DELETE FROM watch WHERE profile_id IN ({ids_sql(ids)}) AND file_id = ?", (*ids, fid))


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
    if (intro is None or credits is None) and t and f["season"] is not None:
        # Nothing in the file or from the audio matching so the community database might know
        on = await online_segments((meta_for(t) or {}).get("id"), f["season"], f["episode"])
        if on:
            if intro is None and on["intro"] and on["intro"][1] < (pr["duration"] or 1e9):
                intro = {"start": on["intro"][0], "end": on["intro"][1], "source": "online"}
            if credits is None and on["outro"] and pr["duration"] and pr["duration"] * 0.6 < on["outro"] < pr["duration"] - 5:
                credits = on["outro"]
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
    row = watch_row(p["id"], fid, "pos, watched")
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
    # Audio sync: aresample keeps the sound matched to the video's timestamps (files with gaps or drift go out of
    # sync slowly otherwise), and the player's Audio Sync setting can shift it by hand, positive is later. The filter
    # itself gets made further down once we know where the video starts
    try:
        ad = max(-5.0, min(5.0, float(body.get("ad") or 0)))
    except (TypeError, ValueError):
        ad = 0.0
    if fid.startswith("s"):
        r = stream_row(fid)
        if r["url"].startswith("torbox:"):
            url, pr = await tb_probe(r)
        elif is_hls(r["url"]):
            url, pr = await hls_probe(r)
        else:
            raise HTTPException(400, "That stream plays directly")
        f = {"id": fid, "path": url}
    else:
        f = file_or_404(fid)
        pr = await get_probe(f)
    v = pr.get("video")
    if not v:
        raise HTTPException(415, "This file has no video track")
    owner = f"p{p['id']}"
    try:
        if shutil.disk_usage(HLS_DIR).free < 6 * 1024**3:
            raise HTTPException(503, "The server is nearly out of space for converting, try again in a few minutes")
    except OSError:
        pass

    # One player per device, starting a new one stops that device's old one. A profile can watch on a few devices
    # at once (PROFILE_DEVICES), different things on each. Players nobody is fetching from go after 90 seconds
    device = browser_key(request)
    if device.startswith("|"):
        device = client_ip(request) + device  # no device cookie (an allow listed network), the address tells them apart
    for sid, s in list(SESS.items()):
        if s["owner"] == owner and s.get("device") == device:
            kill_session(sid)
    if sum(1 for s in SESS.values() if s["owner"] == owner) >= PROFILE_DEVICES:
        raise HTTPException(429, f"This profile is already watching on {PROFILE_DEVICES} devices. Stop one of them, or use another profile")
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

    # Copied video can only start on a keyframe but the audio starts exactly where you asked, so after a skip the two begin
    # at diferent times. The mp4 muxer writes that gap as an empty edit in the header and chrome, hls.js and exoplayer all
    # ignore those so the sound played early by however far the keyframe was (that was the desync after skipping and why
    # resync never helped, it just made the same stream again). So we ask ffmpeg where the video realy starts first
    offset = t
    if t > 0 and vargs[:2] == ["-c:v", "copy"] and Path(f["path"]).suffix.lower() not in (".ts", ".m2ts", ".mts"):
        # A bit past where you asked cause ffmpeg lands on the keyframe before a point with some room, a keyframe sitting
        # right on the spot gets skiped for the one before it otherwise
        v0 = await video_start(f["path"], t + 0.6)
        if v0 is not None and v0 <= 0:
            # Start BOTH of them on that keyframe and drop anything the copy would put before it so theres no gap at the
            # start for a player to ignore, the sound before the keyframe comes along as well. A millisecond under it so
            # rounding cant drop the keyframe its self
            offset = max(0.0, t + 0.6 + v0)
            t = max(0.0, math.floor(offset * 1000 - 1) / 1000)
            vargs += ["-copypriorss:v", "0"]
    # first_pts 0 puts silence in front if the sound starts a bit after the picture (and cuts it if it starts before), a few
    # files have the sound starting late even without skipping. 48000 first so everything after it is in a known unit
    afilter = "aresample=48000,aresample=async=1000:first_pts=0" + (f",asetpts=PTS{ad:+.3f}/TB" if ad else "")

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
             "-c:a", "aac", "-ac", "2", "-b:a", "192k", "-af", afilter, "-sn", "-dn", "-max_muxing_queue_size", "2048",
             "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "event", "-hls_segment_type", "fmp4",
             "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", str(out / "seg%05d.m4s"),
             str(out / "index.m3u8")]
    errlog = open(out / "ffmpeg.log", "wb")
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=errlog)
    SESS[sid] = {"proc": proc, "dir": out, "owner": owner, "device": device, "fid": fid, "last": time.time(), "offset": offset}

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
    return {"sid": sid, "url": f"/api/hls/{sid}/index.m3u8", "offset": offset}


async def video_start(path, t):
    """Where the copied video really begins when ffmpeg is told to seek to t: seconds from t, negative when the keyframe
    is earlier (the usual) and positive when it had to go on to the next one. Runs the same seek ffmpeg will do and reads
    the first video packet, so it lands on the same keyframe whatever the file is (mkv with few seek points, mp4, ts).
    None when it can't tell, then it just starts where it was asked like it always did"""
    proc = None
    try:
        proc = await asyncio.create_subprocess_exec("ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-ss", f"{t:.3f}", "-i", path,
                                                    "-map", "0:v:0", "-c", "copy", "-frames:v", "1", "-f", "framecrc", "-",
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=20)
        tb = None
        for line in out.decode(errors="ignore").splitlines():
            if line.startswith("#tb 0:"):
                a, _, b = line.split(":", 1)[1].strip().partition("/")
                tb = int(a) / int(b)
            elif line and line[0] == "0" and tb:
                # stream, dts, pts, duration, size, crc
                v = float(line.split(",")[2]) * tb
                # a keyframe more than 90 seconds off means somthing odd (a bad index) so better to leave the audio alone
                return v if abs(v) <= 90 else None
    except (asyncio.TimeoutError, ValueError, IndexError, ZeroDivisionError, OSError):
        if proc and proc.returncode is None:
            try:
                proc.kill()
            except Exception:
                pass
    return None


HLS_NAME = re.compile(r"^(index\.m3u8|init\.mp4|seg\d{5}\.m4s)$")


@app.get("/api/hls/{sid}/{name}")
async def hls_file(sid: str, name: str, p=Depends(current_profile)):
    s = SESS.get(sid)
    if not s or s["owner"] != f"p{p['id']}" or not HLS_NAME.match(name):
        raise HTTPException(404, "This player session ended")
    s["last"] = time.time()
    m = re.match(r"seg(\d+)\.m4s$", name)
    if m:
        s["maxseg"] = max(s.get("maxseg", 0), int(m.group(1)))
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
        if not s.get("live"):
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
    # A source that wouldn't play goes to the back of the list next time, unless its host just said it was busy (429), that passes
    r = stream_row(sid)
    host = urlparse(r["url"]).hostname or ""
    if host_busy(host, 120):
        return {"ok": True, "busy": True, "host": host}
    db().q("INSERT INTO stream_health (id, good, bad) VALUES (?, 0, ?) ON CONFLICT(id) DO UPDATE SET bad = excluded.bad", (sid, time.time()))
    return {"ok": True, "busy": False, "host": host}


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
    put_watch(p["id"], fid, pos, dur, done)
    # A paused player stops fetching segments, but the progress still comes in, so that keeps its converted stream from being
    # reaped after 90 seconds (it used to die and the movie broke a minute after pressing resume)
    owner = f"p{p['id']}"
    for s in SESS.values():
        if s["owner"] == owner and s.get("fid") == fid:
            s["last"] = time.time()
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
    Image.MAX_IMAGE_PIXELS = 25_000_000  # A small file can be a huge image once its opened, this stops that eating the ram
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


# Only these protocols for anything ffmpeg gets a url for, so a hostile playlist cant make it read local files or other schemes
FF_NET = ["-protocol_whitelist", "http,https,tcp,tls,crypto"]


async def pinned_request(client, method, url, headers=None, local=False):
    """Resolves the host once, checks it is public and then connects to that exact ip, so the dns cant change its answer
    between the check and the connect (rebinding). Https still checks the cert against the real name"""
    u = urlparse(url)
    host = u.hostname
    if local or ADDON_ALLOW_PRIVATE or not host:
        return client.build_request(method, url, headers=headers)
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, u.port or (443 if u.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise HTTPException(502, f"Couldn't find {host}")
    if not infos or not all(ip_is_public(i[4][0]) for i in infos):
        raise HTTPException(400, "That address points to a private network, which isn't allowed")
    ip = infos[0][4][0]
    netloc = f"[{ip}]" if ":" in ip else ip
    if u.port:
        netloc += f":{u.port}"
    h = dict(headers or {})
    h["Host"] = f"{host}:{u.port}" if u.port else host
    return client.build_request(method, u._replace(netloc=netloc).geturl(), headers=h, extensions={"sni_hostname": host})


async def safe_fetch(url, max_bytes=5 * 1024**2, timeout=12, allow_http=False):
    for _ in range(4):
        u = urlparse(url)
        if u.scheme != "https" and not (u.scheme == "http" and (allow_http or ADDON_ALLOW_PRIVATE)):
            raise HTTPException(400, "Only https addresses are supported")
        if not u.hostname:
            raise HTTPException(400, "That isn't a valid address")
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False,
                                     headers={"User-Agent": "Kino (Stremio addon client)"}) as c:
            req = await pinned_request(c, "GET", url)
            r = await c.send(req, stream=True)
            try:
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
            finally:
                await r.aclose()
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
    rows = db().q("SELECT id, url, manifest, enabled, hidden, src_prio FROM addons " + ("WHERE enabled = 1 " if enabled_only else "") + "ORDER BY id")
    out = []
    for r in rows:
        try:
            m = json.loads(r["manifest"])
        except ValueError:
            continue
        out.append({"id": r["id"], "url": r["url"], "base": r["url"][: -len("/manifest.json")], "m": m,
                    "enabled": bool(r["enabled"]), "hidden": json.loads(r["hidden"] or "[]"), "prio": int(r["src_prio"] or 0)})
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
                     "home": not needs, "shown": f"{c.get('type')}/{c.get('id')}" not in a["hidden"],
                     "problem": CAT_ERR.get(catalog_url(a, c)) if not needs else None})
    return {"id": a["id"], "url": a["url"], "enabled": a["enabled"], "prio": a.get("prio", 0), "name": m.get("name") or m.get("id"),
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


# Movie and series get Kino's normal pages, anime gets folded into those and tv is live channels. Any other type an
# addon makes up (youtubio calls its stuff YouTube, stremio has channel) is shown as videos with there own pages
NOT_VIDEO = ("movie", "series", "anime", "tv")


def video_type(t):
    return isinstance(t, str) and t not in NOT_VIDEO and bool(re.fullmatch(r"[\w .-]{1,40}", t))


def addon_types(a):
    m = a["m"]
    out = {t for t in m.get("types") or [] if isinstance(t, str)}
    out.update(c.get("type") for c in m.get("catalogs") or [] if isinstance(c, dict))
    for r in m.get("resources") or []:
        if isinstance(r, dict):
            out.update(t for t in r.get("types") or [] if isinstance(t, str))
    return out


def kind_ok(kind):
    """movie, series, or a video type one of the installed addons actualy uses"""
    return kind in ("movie", "series") or (video_type(kind) and any(kind in addon_types(a) for a in addon_rows()))


def ext_preview(m, kind):
    """A catalog item from an addon, shaped like a library tile but marked as not in the library"""
    i = str(m.get("id", ""))
    t = m.get("type")
    if t == "tv" or (kind == "tv" and t not in ("movie", "series")):
        return live_preview(m)
    vt = t if video_type(t) else kind if t not in ("movie", "series") and video_type(kind) else None
    if vt:
        # Youtube style stuff, the picture is a thumbnail so it doubles as the background and theres no imdb anything
        thumb = https_url(m.get("poster"))
        return {"id": None, "ext": f"{vt}/{i}", "external": True, "kind": "video", "atype": vt,
                "shape": m.get("posterShape") if m.get("posterShape") in ("square", "poster") else "landscape",
                "name": unesc(m.get("name") or ""), "poster": thumb, "background": https_url(m.get("background")) or thumb, "logo": https_url(m.get("logo")),
                "releaseInfo": m.get("releaseInfo") or m.get("year"), "genres": unesc(m.get("genres") or m.get("genre") or [])[:6],
                "rating": None, "description": unesc(m.get("description")), "imdb": i, "count": 0, "added": 0,
                "watched": False, "watched_count": 0, "my_rating": 0, "last_activity": 0, "matched": True}
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
            if needs or f"{c.get('type')}/{c.get('id')}" in a["hidden"] or (c.get("type") not in ("movie", "series", "anime") and not video_type(c.get("type"))):
                continue
            # Your own torbox list already plays through TorBox first, so its addon catalog dosent get a shelf too
            if "torbox" in f"{a['m'].get('id', '')} {a['m'].get('name', '')} {c.get('name', '')}".lower():
                continue
            out.append((a, c))
    return out


CAT_ERR = {}  # catalog link -> why it isnt on Home, shown under the addon in Settings


def cat_timeout(c):
    # Youtubio runs yt-dlp for every list, a hundred videos can take most of a minute
    return 60 if video_type(c.get("type")) else 12


async def refresh_catalogs():
    if CAT_STATE["refreshing"]:
        return
    CAT_STATE["refreshing"] = True
    try:
        # A few at a time, so one slow addon (youtubio can take a minute) doesnt hold every other row up
        gate = asyncio.Semaphore(4)

        async def one(a, c):
            u = catalog_url(a, c)
            async with gate:
                try:
                    j = await fetch_json(u, ttl=3600, timeout=cat_timeout(c))
                    CAT_ERR.pop(u, None) if (j.get("metas") if isinstance(j, dict) else None) else CAT_ERR.__setitem__(u, "The addon sent an empty list")
                except Exception as e:
                    CAT_ERR[u] = "Took too long to answer" if isinstance(e, httpx.TimeoutException) else f"Failed: {str(e)[:80] or type(e).__name__}"
                    log.info("catalog %s/%s failed: %s", a["m"].get("name"), c.get("id"), e)
        await asyncio.gather(*(one(a, c) for a, c in home_catalogs()))
    finally:
        CAT_STATE["refreshing"] = False


async def catalog_worker():
    while True:
        await refresh_catalogs()
        try:
            await check_sources()
        except Exception as e:
            log.info("source check failed: %s", e)
        await asyncio.sleep(1800)


# ---------------------------------------------------------------- titles with nothing to play
# Addon catalogs list loads of things none of your stream addons (or TorBox) have a copy of. Those get checked in
# the background and hidden from Home, Movies, TV Shows and search. Only a clear answer hides anything: every stream
# addon has to have answered and said nothing. A slow or broken addon means "dont know", which stays visible.
# A show counts as empty only when its first two episodes both have nothing. Anything opened directly still works,
# and a title found to have sources later comes straight back
NOSRC_DAYS = 3


def sources_known(mid):
    r = db().q("SELECT has, checked FROM sources_seen WHERE id = ?", (mid,))
    return dict(r[0]) if r else None


def note_sources(kind, mid, has):
    db().q("INSERT OR REPLACE INTO sources_seen VALUES (?,?,?,?)", (mid, kind, 1 if has else 0, time.time()))


def empty_ids():
    return {r["id"] for r in db().q("SELECT id FROM sources_seen WHERE has = 0 AND checked > ?", (time.time() - NOSRC_DAYS * 86400,))}


def drop_empty(items, empty=None):
    """Takes out addon titles known to have nothing to play, library titles and youtube style videos always stay"""
    empty = empty_ids() if empty is None else empty
    if not empty:
        return items
    return [i for i in items if not (i.get("external") and i.get("kind") in ("movie", "series") and i.get("imdb") in empty)]


async def has_sources(kind, mid):
    """True, False, or None when it cant be sure (an addon didnt answer, or theres nothing to ask)"""
    vids = [mid] if kind == "movie" else [f"{mid}:1:1", f"{mid}:1:2"]
    rows = [a for a in addon_rows() if supports(a["m"], "stream", kind, vids[0])]
    if not rows:
        return None
    for vid in vids:
        for a in rows:
            try:
                j = await addon_call(a, "stream", kind, vid, ttl=3 * 3600, timeout=30)
            except Exception:
                return None
            for st in (j.get("streams") or []) if isinstance(j, dict) else []:
                if isinstance(st, dict) and st.get("url") and not (st.get("infoHash") or st.get("ytId") or st.get("externalUrl")):
                    return True
    return False


async def check_sources(limit=300):
    """Goes through the films and shows on the Home rows, a couple at a time so the stream addons arent hammered"""
    todo, seen = [], set()
    for a, c in home_catalogs():
        if c.get("type") not in ("movie", "series"):
            continue
        for m in (cached_catalog(a, c) or [])[:40]:
            mid = isinstance(m, dict) and m.get("id")
            if not mid or mid in seen:
                continue
            seen.add(mid)
            k = sources_known(mid)
            if k and time.time() - k["checked"] < NOSRC_DAYS * 86400:
                continue
            todo.append((c["type"], mid))
    gate = asyncio.Semaphore(2)

    async def one(kind, mid):
        async with gate:
            has = await has_sources(kind, mid)
            if has is not None:
                note_sources(kind, mid, has)
            await asyncio.sleep(0.5)
    await asyncio.gather(*(one(k, m) for k, m in todo[:limit]))
    if todo:
        log.info("checked %d addon titles for sources", min(len(todo), limit))


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
    meta_put(key, got)
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


async def addon_search(kind, q, limit_per=60, videos=False):
    """Searches every installed catalog that supports search, used by search and fix match. Video catalogs (youtubio)
    are searched on there own with videos=True, they run yt-dlp and can take a lot longer than a normal addon"""
    tasks = []
    for a in addon_rows():
        for c in a["m"].get("catalogs") or []:
            has_search = any(e.get("name") == "search" for e in c.get("extra") or []) or "search" in (c.get("extraSupported") or [])
            if not has_search or video_type(c.get("type")) != videos:
                continue
            if videos or not kind or c.get("type") == kind or c.get("type") not in ("movie", "series"):
                tasks.append((a, c))
    async def one(a, c):
        try:
            j = await fetch_json(catalog_url(a, c, {"search": q}), ttl=600, timeout=25 if videos else 8)
            return [(a, c, m) for m in (j.get("metas") or [])[:limit_per]]
        except Exception:
            return []
    res = await asyncio.gather(*(one(a, c) for a, c in tasks[:16]))
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
        # A tiny gzip can unpack to gigabytes, so it only gets to be a few mb
        d = zlib.decompressobj(31)
        raw = d.decompress(raw, 4 * 1024**2)
        if d.unconsumed_tail:
            raise HTTPException(502, "That subtitle file is too big")
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
    if "prio" in b:
        try:
            pr = max(0, min(9, int(b["prio"])))
        except (TypeError, ValueError):
            raise HTTPException(400, "Priority has to be a number from 0 to 9")
        db().q("UPDATE addons SET src_prio = ? WHERE id = ?", (pr, aid))
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


VIDEO_INLINE = {}  # (type, video id) -> (when, addon, streams) that came inside a video's details


async def video_meta(kind, mid):
    """Details for a youtube style video or channel straight from its addon. Only kept half an hour, not days like
    films, cause youtubio puts links in them that run out"""
    for a in addon_rows():
        if not supports(a["m"], "meta", kind, mid):
            continue
        try:
            j = await addon_call(a, "meta", kind, mid, ttl=1800, timeout=40)
        except Exception as e:
            log.info("meta from %s failed: %s", a["m"].get("name"), e)
            continue
        m = j.get("meta") if isinstance(j, dict) else None
        if isinstance(m, dict) and (m.get("name") or m.get("videos")):
            return a, m
    return None, None


async def external_video(kind, mid, name, p):
    a, m = await video_meta(kind, mid)
    if not m:
        m = listed_meta(mid, name, kind)
        if not m:
            raise HTTPException(404, "The addon didn't send any details for that, it might be down")
    if len(VIDEO_INLINE) > 3000:
        VIDEO_INLINE.clear()
    vids = []
    for v in m.get("videos") or []:
        if not isinstance(v, dict) or not v.get("id"):
            continue
        inl = v.get("streams")
        if isinstance(inl, list) and a:
            # Youtubio's first entry on a channel is "Channel Options" which only has outside links, so it's left off
            if not any(isinstance(s, dict) and s.get("url") for s in inl):
                continue
            VIDEO_INLINE[(kind, str(v["id"]))] = (time.time(), a, inl)
        vids.append({"id": str(v["id"]), "name": unesc(v.get("title") or v.get("name") or ""), "thumbnail": https_url(v.get("thumbnail")),
                     "overview": unesc(v.get("overview") or v.get("description") or ""), "released": v.get("released")})
    single = str((m.get("behaviorHints") or {}).get("defaultVideoId") or "") or None
    if single and not any(v["id"] == single for v in vids):
        single = None
    if not single and not vids:
        single = mid  # Nothing listed, the id itself is the video
    ids = [v["id"] for v in vids] or [mid]
    prog = {}
    for r in db().q("SELECT s.video_id, w.pos, w.dur, w.watched, w.updated FROM streams s JOIN watch w ON w.file_id = s.id "
                    "WHERE w.profile_id = ? AND s.video_id IN (%s) ORDER BY w.updated" % ",".join("?" * len(ids)), [p["id"], *ids]):
        prog[r["video_id"]] = dict(r)
    for v in vids:
        v["progress"] = prog.get(v["id"])
    links = [l for l in m.get("links") or [] if isinstance(l, dict)]
    item = ext_preview({**m, "id": mid, "type": kind, "genres": m.get("genres") or [l.get("name") for l in links if l.get("category") == "Genres"][:4]}, kind)
    channel = next((l.get("name") for l in links if l.get("category") in ("Directors", "Channel")), None)
    return {**item, "in_list": in_list(p["id"], mid), "list_key": mid, "videos": [] if single and len(vids) <= 1 else vids,
            "single": single, "channel": channel, "runtime": m.get("runtime") if m.get("runtime") not in ("0 min", "") else None,
            "cast": [], "director": None, "season_list": [], "seasons": 0, "episodes": len(vids)}


@app.get("/api/external/{kind}/{mid:path}")
async def external_title(kind: str, mid: str, stay: int = 0, name: str = "", p=Depends(current_profile)):
    if not kind_ok(kind):
        raise HTTPException(404, "Unknown type")
    if video_type(kind):
        return await external_video(kind, mid, name, p)
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

def on_pd_list(url):
    # The http to https upgrade is only for hosts known to have both, a self hosted addon on plain http has no https
    host = (urlparse(str(url or "")).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in PD_HOSTS)


def stream_row(sid):
    rows = db().q("SELECT * FROM streams WHERE id = ?", (sid,))
    if not rows:
        raise HTTPException(404, "That stream isn't known anymore, open the title again")
    return dict(rows[0])


@app.get("/api/streams/{kind}/{vid:path}")
async def streams_for(kind: str, vid: str, request: Request, quick: int = 0, p=Depends(current_profile)):
    if not kind_ok(kind):
        raise HTTPException(404, "Unknown type")
    rows = [a for a in addon_rows() if supports(a["m"], "stream", kind, vid)]
    # Youtubio already put the streams in the details it sent, theres no need to run yt-dlp a second time
    inline = VIDEO_INLINE.get((kind, vid))
    inline = inline if inline and time.time() - inline[0] < 1800 else None
    if inline:
        rows = []
    meta = await meta_lookup(kind, show_of(vid)) or {}
    if p.get("kids") and not kids_ok(meta.get("genres"), show_of(vid)):
        raise HTTPException(404, "That title isn't available on this profile")
    # Something that isnt out yet has no real sources, whatever the addons send is fake. And for a few weeks after a film comes out
    # (a few days for an episode) what is on offer is mostly camera recordings and fakes, so it is flagged
    cur = (await ep_context(kind, vid))[1] if kind == "series" else None
    rel = released_at(cur.get("released") if cur else meta.get("released"))
    now_t = time.time()
    # No exact date but the year is still to come: not out either
    if not rel:
        yr = str(meta.get("releaseInfo") or "")[:4]
        if yr.isdigit() and int(yr) > datetime.datetime.now().year:
            rel = datetime.datetime(int(yr), 1, 1, tzinfo=datetime.timezone.utc).timestamp()
    if rel and rel > now_t + 86400:
        return {"streams": [], "dropped": 0, "checked": 0, "partial": False, "upcoming": datetime.datetime.fromtimestamp(rel, datetime.timezone.utc).strftime("%Y-%m-%d")}
    minutes = parse_runtime(meta)
    # Films: inside the window after release real HD copies dont exist yet. Episodes: new ones are out within a day or two
    window = hd_window(meta, minutes) if kind == "movie" else 0
    age = (now_t - rel) / 86400 if rel else None
    young = window if (kind == "movie" and age is not None and 0 <= age < window) else 0
    too_new = {"age": int(age), "window": window, "left": max(1, math.ceil(window - age)),
               "from": datetime.datetime.fromtimestamp(rel + window * 86400, datetime.timezone.utc).strftime("%Y-%m-%d")} if young else None
    fresh = bool(rel and not young and now_t - rel < (2 if cur else 60) * 86400)

    async def one(a):
        try:
            # archive.org is slow so these get a bit longer than other addon calls
            # quick is the title page's first look: whatever answers in a few seconds, so Play shows straight away. The
            # full list comes right after, slow addons (archive.org) get there 45 seconds there
            j = await addon_call(a, "stream", kind, vid, ttl=3 * 3600, timeout=6 if quick else 45)
            return a, j.get("streams") or [], None
        except httpx.TimeoutException:
            return a, [], "took too long to answer"
        except Exception as e:
            log.info("streams from %s failed: %s", a["m"].get("name"), e)
            return a, [], "couldn't be reached" if isinstance(e, (httpx.ConnectError, socket.gaierror)) else "gave an error"

    out, dropped, report = [], 0, []
    # Sources are the ones the addons send. TorBox copies are not a source of their own (what TorBox holds comes to the Storage Box through the
    # sync, and then shows as the Library copy)
    got = [(inline[1], inline[2], None)] if inline else await asyncio.gather(*(one(a) for a in rows))
    for a, streams, err in got:
        rep_ = {"addon": a["m"].get("name"), "found": len(streams), "kept": 0, "other": [], "error": err}
        report.append(rep_)
        for st in streams[:40]:
            if not isinstance(st, dict):
                continue
            url = st.get("url")
            # archive.org works on https too, so old http links get upgraded instead of dropped
            if isinstance(url, str) and url.startswith("http://") and on_pd_list("https://" + url[7:]):
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
            w = watch_row(p["id"], sid, "pos, dur, watched")
            out.append({"id": sid, **stream_facts(st, url, label), "addon": a["m"].get("name"),
                        "progress": dict(w[0]) if w else None, "_url": url})
    # TorBox copies first, then a source that played fine before, then ones not tried yet, and ones that failed last.
    # After that the ones that play in a browser, then the best quality
    health = {r["id"]: r for r in db().q("SELECT id, good, bad FROM stream_health WHERE id IN (%s)" % ",".join("?" * len(out)), [x["id"] for x in out])} if out else {}

    def rank(x):
        h = health.get(x["id"])
        if not h:
            return 1
        # A failure counts for 6 hours, links come back and go away, so an old one shouldnt keep a source at the back for good
        if (h["bad"] or 0) > (h["good"] or 0) and time.time() - (h["bad"] or 0) < 6 * 3600:
            return 2
        return 0 if (h["good"] or 0) > (h["bad"] or 0) else 1
    # Ask every source if it is answering, a dead one is marked so it goes last and the player doesnt try it by itself
    if out and not inline:
        # Only the 4 that would be tried first are asked (the rest only if an earlier answer is remembered), asking a long list hit the
        # sources' own limits and could start work on their side
        early = {a["m"].get("name") for a in rows if a.get("prio")}
        cand = sorted(out, key=lambda x: (x["addon"] not in early, -(x["seeders"] if x.get("seeders") is not None else -1), -x["height"]))
        todo = [x for x in cand if not probe_cached(x["_url"])][:4]
        await asyncio.gather(*(probe_source(x["_url"]) for x in todo))
        for x in out:
            hit = probe_cached(x["_url"])
            if hit:
                x["_ok"], x["why"], size = hit
                if size and not x["bytes"]:
                    x["bytes"] = size  # the source's own size, for the ones whose addon didnt say
    for x in out:
        x["health"] = "dead" if x.get("_ok") is False else ("good", "untried", "failed")[rank(x)]
        x.pop("_ok", None)
        x["host"] = urlparse(x["_url"]).hostname or ""
        x["suspect"] = suspect_reasons(f"{x['label']} {x.get('file') or ''}", x["height"], x["bytes"], minutes, kind, young) if kind in ("movie", "series") else []
    prio = {}
    for a in rows:
        if a.get("prio"):
            prio[a["m"].get("name")] = min(prio.get(a["m"].get("name"), 99), a["prio"])

    def group(x):
        if x["health"] == "dead":
            return 5
        r = rank(x)
        if r == 2:
            return 4
        if x["suspect"]:
            return 3
        if x.get("addon") in prio:
            return 0
        return 1 if r == 0 else 2
    # Order: the addons you put first in Settings (Source Priority: First, then Second and so on) come before everything, a priority addon's
    # sources stay together and the ones that played fine before lead inside it. Then other sources that played fine before, then every
    # source not tried yet, then probably-fake ones, ones that failed before, and dead ones last. Inside each the most seeders first, then
    # the best quality and size
    names = ["", "First", "Second", "Third", "Fourth"]
    for x in out:
        g = group(x)
        x["tier"] = (f"Priority: {names[min(4, prio[x['addon']])]}" + (", worked before" if rank(x) == 0 else "")) if g == 0 else "Worked before" if g == 1 else ""
    out.sort(key=lambda x: (group(x), prio.get(x.get("addon"), 100) if group(x) == 0 else 0, rank(x) if group(x) == 0 else 0, not x["plays"],
                            -(x["seeders"] if x.get("seeders") is not None else -1), -x["height"], -(x["bytes"] or 0)))
    if video_type(kind):
        # Youtubio lists every quality twice (its own sponsor cutting player and the plain one), the top few is plenty
        out = out[:12]
    for x in out:
        x.pop("_url", None)
    res = {"streams": out, "dropped": dropped, "checked": len(rows), "partial": bool(quick and any(x["error"] == "took too long to answer" for x in report)), "fresh": fresh, "too_new": too_new}
    # What this title turned out to have, for hiding ones with nothing. Found something always counts, nothing only
    # counts for a film when every addon answered (shows get checked by there first episodes in the background)
    if kind in ("movie", "series") and rows and not inline:
        sid = show_of(vid) if kind == "series" else vid
        if out:
            note_sources(kind, sid, True)
        elif kind == "movie" and not quick and all(x["error"] is None for x in report):
            note_sources(kind, sid, False)
    if admin_user(request):
        res["report"] = report
        res["stream_addons"] = [a["m"].get("name") for a in addon_rows() if supports(a["m"], "stream")]
    return res


FORMATS = {".mp4": ("MP4", True), ".m4v": ("MP4", True), ".webm": ("WebM", True), ".mkv": ("MKV", False),
           ".ogv": ("Ogg", False), ".ogg": ("Ogg", False), ".mpeg": ("MPEG", False), ".mpg": ("MPEG", False),
           ".avi": ("AVI", False), ".mov": ("MOV", True), ".wmv": ("WMV", False)}


def parse_runtime(m):
    """Minutes from what the metadata says, '98 min' or '1h 38min', None when it isnt known"""
    t = str((m or {}).get("runtime") or "").lower()
    h = re.search(r"(\d+)\s*h", t)
    mi = re.search(r"(\d+)\s*m", t)
    n = (int(h.group(1)) * 60 if h else 0) + (int(mi.group(1)) if mi else 0)
    if not n and re.fullmatch(r"\s*\d+\s*", t):
        n = int(t)
    return n or None


def released_at(v):
    """When something came out, as a timestamp, None when the date isnt known"""
    if not v:
        return None
    try:
        d = datetime.datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return (d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)).timestamp()


# A camera recording or a screener: not a real copy of a film, it is what turns up first for new releases. Release names put dots between
# the words so those count as gaps. TS only counts in capitals (a .ts file is just a video file, the ending is cut off first)
CAM_RE = re.compile(r"(?<![A-Za-z0-9])(?:cam|hdcam|camrip|cam-rip|hd-?ts|telesync|tele-sync|hdtc|telecine|workprint|dvdscr|screener|scr)(?![A-Za-z0-9])", re.I)
CAM_RE_TS = re.compile(r"(?<![A-Za-z0-9])TS(?![A-Za-z0-9])")


# How long after a film's release a real HD copy (WEB-DL or better) turns up: big films 45 to 60 days or more, smaller ones 20 to 35. Before
# then an "HD" copy is a fake or a camera recording passed off as one. Streaming service films (Netflix and the like) come after 14 to 21
# days, the metadata doesnt say who made a film so those are treated like smaller films
HD_BIG_DAYS, HD_SMALL_DAYS = 55, 28
BIG_GENRES = {"Action", "Adventure", "Animation", "Sci-Fi", "Fantasy", "Family"}
HD_RE = re.compile(r"web-?dl|web-?rip|blu-?ray|bdrip|brrip|hdrip|remux|(?<![A-Za-z0-9])(?:2160|1440|1080|720)p|(?<![A-Za-z0-9])4k(?![A-Za-z0-9])", re.I)


def hd_window(meta, minutes):
    """Days a film needs before a real HD copy is likely to exist: a long action, adventure, animation, sci-fi or fantasy film is a major one"""
    big = bool(set(meta.get("genres") or []) & BIG_GENRES) and (minutes or 0) >= 95
    return HD_BIG_DAYS if big else HD_SMALL_DAYS


def suspect_reasons(text, height, size, minutes, kind, young=0):
    """Why a source is probably not the real thing: a camera recording, a file far too small for what it says it is, or an HD copy of a film
    that is too new to have one (young is the days a real HD copy usually takes, 0 when the film is old enough)"""
    why = []
    text = re.sub(r"\.(?:ts|mkv|mp4|m4v|avi|mov|webm|wmv)$", "", str(text).strip(), flags=re.I)
    cam = bool(CAM_RE.search(text) or CAM_RE_TS.search(text))
    if cam:
        why.append("a camera recording")
    elif young and (height >= 720 or HD_RE.search(text)):
        why.append(f"an HD copy of a film that is too new for one, they usually turn up about {young} days after release")
    mins = minutes or (110 if kind == "movie" else 45)
    # A real video is never under about 1.5 MB for every minute it runs, a 30 second clip standing in for a film is nowhere near it
    if size and size < mins * 1.5e6:
        why.append("far too small to be the whole thing")
    elif size and height:
        floor = {2160: 4.0e9, 1440: 2.5e9, 1080: 1.0e9, 720: 0.45e9}.get(height)
        if floor:
            mins = minutes or (110 if kind == "movie" else 45)
            # What a normal file of that quality weighs for that length, a file under a third of it is not what it says
            floor = floor * min(1.5, max(0.2, mins / 110))
            if size < floor / 3:
                why.append("much smaller than a real file of that quality")
    return why


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
    elif (wh := re.search(r"\b\d{3,4}x(\d{3,4})\b", text)):
        height = int(wh.group(1))  # yt-dlp says 1920x1080
    fmt, plays = ("HLS", True) if is_hls(url) else FORMATS.get(Path(urlparse(url).path).suffix.lower(), ("Video", True))
    size = (st.get("behaviorHints") or {}).get("videoSize")
    if not size:
        sm = re.search(r"(\d+(?:[.,]\d+)?)\s*(GB|MB)", label, re.I)
        if sm:
            size = float(sm.group(1).replace(",", ".")) * (1024**3 if sm.group(2).upper() == "GB" else 1024**2)
    lines = [x.strip() for x in re.split(r"[\n|]", str(st.get("title") or st.get("description") or "")) if x.strip()]
    name = lines[0] if lines else (str(st.get("name") or "").strip() or Path(urlparse(url).path).stem)
    q = "4K" if height >= 2160 else f"{height}p" if height else "SD"
    seeders, peers = torrent_stats(st)
    return {"label": name[:120], "quality": q, "height": height, "format": fmt, "plays": plays, "seeders": seeders, "peers": peers,
            "bytes": int(size) if isinstance(size, (int, float)) else None, "file": Path(urlparse(url).path).name[:120]}


def torrent_stats(st):
    """Seeders and peers when the addon gives them, as fields (seeders, seeds, peers, leechers) or in the text like torrentio does
    (the person icon followed by a number, Seeders: 12, S: 12, Peers: 3)"""
    bh = st.get("behaviorHints") or {}
    def num(v):
        try:
            n = int(float(str(v).replace(",", "")))
            return n if 0 <= n < 10**7 else None
        except (TypeError, ValueError):
            return None
    seeders = next((n for n in [num(st.get(k)) for k in ("seeders", "seeds", "seeder")] + [num(bh.get("seeders"))] if n is not None), None)
    peers = next((n for n in [num(st.get(k)) for k in ("peers", "leechers", "leeches", "leecher")] + [num(bh.get("peers"))] if n is not None), None)
    text = " ".join(str(st.get(k) or "") for k in ("name", "title", "description"))
    if seeders is None:
        m = re.search(r"(?:\U0001F464|\U0001F331)\s*(\d[\d,]*)|\bseed(?:er)?s?\s*[:=]?\s*(\d[\d,]*)|\bS\s*[:=]\s*(\d[\d,]*)\b", text, re.I)
        if m:
            seeders = num(next(g for g in m.groups() if g))
    if peers is None:
        m = re.search(r"\b(?:peers?|leech(?:er)?s?)\s*[:=]?\s*(\d[\d,]*)|\bP\s*[:=]\s*(\d[\d,]*)\b", text, re.I)
        if m:
            peers = num(next(g for g in m.groups() if g))
    return seeders, peers


def is_hls(url):
    # A playlist of little segments instead of one file, youtube's come as manifest.googlevideo.com/.../hls_playlist/
    u = str(url or "").lower()
    return "m3u8" in u or "/hls_playlist/" in u


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
    # The details of the title: kids profiles are checked against them, and how long it should be goes to the player (to spot fakes that are far too short)
    m = show if cur else await meta_lookup(r["kind"], show_of(r["video_id"]))
    if p.get("kids") and not kids_ok((m or {}).get("genres"), show_of(r["video_id"])):
        raise HTTPException(404, "That title isn't available on this profile")
    w = watch_row(p["id"], sid, "pos, watched")
    # Streams have no file to compare so the intro (and where the credits start) can only come from the comunity database
    on = await online_segments(show_of(r["video_id"]), cur["season"], cur["episode"]) if cur else None
    s_intro = {"start": on["intro"][0], "end": on["intro"][1], "source": "online"} if on and on["intro"] else None
    common = {"expect": parse_runtime(m), "resume": w[0]["pos"] if w and not w[0]["watched"] else 0,
              "season": cur["season"] if cur else None, "episode": cur["episode"] if cur else None,
              "ep_name": cur.get("name") if cur else None, "show_id": show_of(r["video_id"]) if cur else None,
              "title_id": None, "intro": s_intro, "credits": None, "next": nxt, "kind": r["kind"], "video_id": r["video_id"],
              "prefs": p["prefs"], "is_admin": bool(admin_user(request)), "art": art_for_id(show_of(r["video_id"]), r["poster"])}
    if r["kind"] in ("movie", "series"):
        await asyncio.to_thread(note_played, r, cur)
    if r["url"].startswith("torbox:") or is_hls(r["url"]):
        _, pr = await (tb_probe(r) if r["url"].startswith("torbox:") else hls_probe(r))
        a = next((x for x in pr["audio"] if x.get("default")), pr["audio"][0] if pr["audio"] else None)
        dur = pr.get("duration")
        if on and on["outro"] and dur and dur * 0.6 < on["outro"] < dur - 5:
            common["credits"] = on["outro"]
        return {"id": sid, "stream": True, "name": r["name"], "src": None, "direct": False, "video": pr.get("video") or {},
                "audio": [{"n": x["n"], "lang": lang_name(x["lang"]) if x.get("lang") else "",
                           "label": " ".join(str(y) for y in (x.get("title") or lang_name(x.get("lang")), x.get("codec", "").upper(), f"{x.get('channels')}ch") if y)}
                          for x in pr["audio"]],
                "default_audio": a["n"] if a else 0, "subs": [], "badges": badges(pr), "duration": pr.get("duration"),
                "download": None if is_hls(r["url"]) else f"/api/rstream/{sid}?dl=1", **common}
    ext = Path(urlparse(r["url"]).path).suffix.lower()
    return {"id": sid, "stream": True, "name": r["name"], "src": f"/api/rstream/{sid}", "direct": True,
            "video": {"codec": None}, "audio": [], "default_audio": 0, "subs": [], "badges": [],
            "download": f"/api/rstream/{sid}?dl=1", "resume": w[0]["pos"] if w and not w[0]["watched"] else 0,
            "season": cur["season"] if cur else None, "episode": cur["episode"] if cur else None,
            "ep_name": cur.get("name") if cur else None, "show_id": show_of(r["video_id"]) if cur else None,
            "title_id": None, "intro": s_intro, "credits": None, "next": nxt, "kind": r["kind"], "video_id": r["video_id"], "ext": ext, "prefs": p["prefs"], "is_admin": bool(admin_user(request)),
            "art": common["art"]}


def art_for_id(mid, poster=None):
    # Pictures for the loading screen
    mid = str(mid or "")
    if mid.startswith("tt"):
        return {"background": f"https://images.metahub.space/background/medium/{mid}/img", "logo": f"https://images.metahub.space/logo/medium/{mid}/img", "poster": poster}
    # Youtube thumbnails are already wide, so the poster works as the background too
    return {"background": poster if poster and "ytimg" in poster else None, "logo": None, "poster": poster}


async def tb_open(url, headers):
    """Opens a file from your torbox account, the link came from torbox itself so it can go to there download servers"""
    client = httpx.AsyncClient(timeout=httpx.Timeout(30, read=60), follow_redirects=False)
    try:
        for _ in range(5):
            if urlparse(url).scheme != "https" and not ADDON_ALLOW_PRIVATE:
                raise HTTPException(502, "TorBox sent an unexpected link")
            r = await client.send(await pinned_request(client, "GET", url, headers=headers), stream=True)
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
            if url.startswith("http://") and on_pd_list("https://" + url[7:]):
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


def video_answer(status, ctype):
    return status in (200, 206) and (ctype.startswith("video/") or ctype in ("application/octet-stream", "application/ogg"))


# Is a source answering right now? The first few candidates are asked for their first bytes when the sources list is made, so one that is dead
# (an error, a web page, a playlist that isnt one) goes to the back and isnt tried by itself, and the real size is known. Remembered for a while
# so the title page and Play dont ask again. Careful with it: a source address can be a service that starts work when it is asked, and the
# host can say "too many requests", so only a few are asked, one at a time per host, and a busy, slow or erroring answer is "cant tell", never
# "dead"
SRC_PROBE = {}
HOST_LOCK = {}
HOST_BUSY = {}  # host -> when it last said it was busy (429)


def host_busy(host, secs=90):
    return time.time() - HOST_BUSY.get(host, 0) < secs


def probe_cached(url):
    hit = SRC_PROBE.get(url)
    if hit and time.time() - hit[0] < (1200 if hit[1] else 600 if hit[1] is False else 60):
        return hit[1], hit[2], hit[3]
    return None


async def probe_source(url):
    """(working: True, False, or None when it cant be told, why not, size in bytes or None). The size comes from the server itself, addons
    often dont say, and it is how a fake that is far too small gets spotted"""
    hit = probe_cached(url)
    if hit:
        return hit
    host = urlparse(url).hostname or ""
    if host_busy(host):
        return None, "busy", None

    async def go():
        client, up = await pd_open(url, {"Range": "bytes=0-1023"})
        try:
            if up.status_code == 429:
                HOST_BUSY[host] = time.time()
                return None, "busy", None
            if up.status_code >= 500 or up.status_code == 408:
                return None, f"error {up.status_code}", None
            if is_hls(url):
                if up.status_code != 200:
                    return False, f"answered {up.status_code}", None
                head = b""
                async for ch in up.aiter_bytes(512):
                    head += ch
                    break
                return (True, "", None) if head.lstrip().startswith(b"#EXTM3U") else (False, "isn't a playlist", None)
            if not video_answer(up.status_code, up.headers.get("content-type", "")):
                return False, f"didn't send a video (answered {up.status_code})", None
            size = None
            m = re.search(r"/(\d+)\s*$", up.headers.get("content-range", ""))
            if m:
                size = int(m.group(1))
            elif up.status_code == 200 and (up.headers.get("content-length") or "").isdigit():
                size = int(up.headers["content-length"])
            head = b""
            async for ch in up.aiter_bytes(64):
                head += ch
                break
            # A web page or an error message sent with a video label
            if head.lstrip()[:1] in (b"<", b"{"):
                return False, "sent a web page, not a video", size
            return True, "", size
        finally:
            await up.aclose(); await client.aclose()
    lock = HOST_LOCK.setdefault(host, asyncio.Lock())
    async with lock:  # one at a time per host, with a gap
        if host_busy(host):  # an earlier one in the queue just got "too many requests"
            return None, "busy", None
        try:
            ok, why, size = await asyncio.wait_for(go(), 5)
        except asyncio.TimeoutError:
            ok, why, size = None, "slow to answer", None  # a service that sets a download going can take longer than this, that isnt dead
        except HTTPException as e:
            ok, why, size = (False, str(e.detail)[:100], None) if e.status_code in (400, 403) else (None, "couldn't be checked", None)
        except Exception:
            ok, why, size = None, "couldn't be reached", None
        await asyncio.sleep(0.3)
    SRC_PROBE[url] = (time.time(), ok, why, size)
    if len(SRC_PROBE) > 2000:
        for k in sorted(SRC_PROBE, key=lambda k: SRC_PROBE[k][0])[:500]:
            SRC_PROBE.pop(k, None)
    return ok, why, size


async def stream_proxy(r, request, dl=0):
    hdr = {"Range": request.headers["range"]} if request.headers.get("range") else {}
    if r["url"].startswith("torbox:"):
        client, up = await tb_open(await tb_link(*tb_parts(r["url"])), hdr)
    else:
        client, up = await pd_open(r["url"], hdr)
    ctype = up.headers.get("content-type", "")
    if not video_answer(up.status_code, ctype):
        await up.aclose(); await client.aclose()
        host = urlparse(r["url"]).hostname or "The source"
        # googlevideo links from yt-dlp only work from the machine that made them, a 403 from there usually means that
        hint = " Youtube links only work from the server that runs the addon." if up.status_code == 403 and "googlevideo" in host else ""
        if up.status_code == 429:
            HOST_BUSY[host] = time.time()
            raise HTTPException(503, f"{host} is busy right now (it answered 429, too many requests), it needs a moment")
        raise HTTPException(502, f"{host} didn't send a video (it answered {up.status_code}), try another source.{hint}")
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
        db().q("INSERT OR REPLACE INTO media_origin VALUES (?,?,?,?)", (str(target.relative_to(MEDIA_DIR)), "archive.org", (r["addon"] if "addon" in r.keys() else None) or "Archive.org", time.time()))
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



# ---------------------------------------------------------------- downloaded media (admin)
# Everything on the storage box, with where it came from, and delete. What gets deleted is remembered (deleted_media) and written to
# deleted.json for the sync, so it doesnt just fetch the same film again. Playing it again from any source lets it download again
SYNC_STATE = {"mt": None, "v": {}}


def sync_origins():
    """path -> torbox item the sync downloaded it from, read from the sync's own state file (.state.json on the box)"""
    f = MEDIA_DIR / ".state.json"
    try:
        mt = f.stat().st_mtime
        if SYNC_STATE["mt"] != mt:
            j = json.loads(f.read_text())
            SYNC_STATE.update(mt=mt, v={str(Path(v.get("path", ""))): {"key": k, "item": v.get("item"), "at": v.get("at")} for k, v in j.items() if isinstance(v, dict)})
    except (OSError, ValueError):
        pass
    return SYNC_STATE["v"]


def origin_of(path, rel):
    """The sync's key for a file (kept with the delete so the same copy can be let back in), nothing the admin sees"""
    o = sync_origins().get(str(Path(path)))
    return {"key": o["key"]} if o else {"key": None}


def source_of(f):
    """Where a file on the box came from: the addon whose source was played for it (remembered when it was played), the archive.org
    addon for ones saved from there, or just the Storage Box when nothing is known"""
    r = db().q("SELECT label FROM media_origin WHERE rel = ?", (f["rel"],))
    if r:
        return r[0]["label"] or "Archive.org"
    g = guess(f["rel"])
    nt = norm(first(g.get("title")) or "")
    se = (first(g.get("season")) if first(g.get("season")) is not None else -1, first(g.get("episode")) if first(g.get("episode")) is not None else -1)
    if not nt:
        return None
    r = db().q("SELECT addon FROM play_sources WHERE ntitle = ? AND season = ? AND episode = ? ORDER BY (year = ?) DESC, at DESC LIMIT 1",
               (nt, se[0], se[1], str(first(g.get("year")) or "")))
    return r[0]["addon"] if r else None


def write_deleted_json():
    tombs = [{"rel": r["rel"], "key": r["origin"], "at": r["at"]} for r in db().q("SELECT rel, origin, at FROM deleted_media ORDER BY id")]
    allow = [{"key": r["key"], "name": r["name"], "at": r["at"]} for r in db().q("SELECT key, name, at FROM media_allow")]
    tmp = DELETED_FILE.with_suffix(".tmp")
    try:
        DELETED_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps({"tombs": tombs, "allow": allow}))
        tmp.chmod(0o644)
        tmp.replace(DELETED_FILE)
    except OSError as e:
        log.warning("couldnt write %s: %s", DELETED_FILE, e)


@app.get("/api/admin/media")
async def media_list(q: str = "", sort: str = "size", skip: int = 0, admin=Depends(require_admin)):
    q = q.strip().lower()[:60]
    rows = []
    for f in list(LIB["files"].values()):
        t = LIB["titles"].get(f["title_id"]) or {}
        title = t.get("guess_name") or f["name"]
        if q and q not in f"{title} {f['name']}".lower():
            continue
        rows.append((f, t, title))
    key = {"size": lambda r: -r[0]["size"], "new": lambda r: -r[0]["mtime"], "name": lambda r: (r[2].lower(), r[0]["season"] or 0, r[0]["episode"] or 0)}.get(sort, lambda r: -r[0]["size"])
    rows.sort(key=key)
    out = []
    for f, t, title in rows[max(0, skip):max(0, skip) + 100]:
        out.append({"id": f["id"], "name": f["name"], "title": title, "year": t.get("year"), "kind": t.get("kind"), "season": f["season"], "episode": f["episode"],
                    "size": f["size"], "added": f["mtime"], "quality": f["quality"], "source": source_of(f), "subs": len(f["ext_subs"])})
    return {"files": out, "total": len(rows), "bytes": sum(r[0]["size"] for r in rows), "all": len(LIB["files"]), "deleted": db().q("SELECT COUNT(*) n FROM deleted_media")[0]["n"],
            "next": skip + 100 if skip + 100 < len(rows) else None, "scanning": bool(LIB["scanning"])}


@app.post("/api/admin/media/delete")
async def media_delete(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    ids = [str(i) for i in (b.get("ids") or [])][:200]
    freed, done, failed = 0, 0, []
    for fid in ids:
        f = LIB["files"].get(fid)
        if not f:
            continue
        try:
            await asyncio.to_thread(remove_file, dict(f), admin)
            log.info("kino deleted %s by %s", logsafe(f["rel"]), logsafe(admin))
            freed += f["size"]; done += 1
        except HTTPException as e:
            failed.append({"name": f["name"], "error": str(e.detail)})
        except OSError as e:
            failed.append({"name": f["name"], "error": str(e)[:120]})
    return {"deleted": done, "freed": freed, "failed": failed}


@app.get("/api/admin/media/deleted")
async def media_deleted(admin=Depends(require_admin)):
    rows = db().q("SELECT id, name, title, year, season, episode, size, at, origin FROM deleted_media ORDER BY id DESC LIMIT 300")
    return {"deleted": [dict(r) for r in rows]}


@app.post("/api/admin/media/deleted/{did}/allow")
async def media_allow_again(did: int, admin=Depends(require_admin)):
    r = db().q("SELECT rel, origin, name FROM deleted_media WHERE id = ?", (did,))
    if not r:
        raise HTTPException(404, "That one isn't on the list anymore")
    # The delete is forgotten, and the copy it came from is let past the sync's list of what it already has
    db().q("DELETE FROM deleted_media WHERE id = ?", (did,))
    if r[0]["origin"]:
        db().q("INSERT OR REPLACE INTO media_allow VALUES (?,?,?)", (r[0]["origin"], r[0]["name"], time.time()))
    await asyncio.to_thread(write_deleted_json)
    return {"ok": True}


def note_played(r, cur):
    """Called when a source starts playing. Remembers which addon the media was played from (the manager shows that as its source),
    and if it was deleted before, somebody wanting it again lets it back in: the delete is forgotten and the copy the sync had
    (and the one just played, if it is in TorBox) is allowed to download on its next run"""
    try:
        nt = norm(r["name"] or "")
        if not nt:
            return
        yr = str(r["year"] or "")[:4]
        se, ep = (cur["season"], cur["episode"]) if cur else (-1, -1)
        if r["addon"] and r["addon"] != "TorBox":
            db().q("INSERT OR REPLACE INTO play_sources VALUES (?,?,?,?,?,?,?)", (nt, yr, se, ep, r["addon"], str(r["label"] or "")[:200], time.time()))
        lifted = False
        for t in db().q("SELECT id, ntitle, year, season, episode, origin FROM deleted_media WHERE ntitle = ?", (nt,)):
            if cur:
                if (t["season"], t["episode"]) != (se, ep):
                    continue
            elif t["episode"] is not None or (t["year"] and t["year"].isdigit() and yr.isdigit() and abs(int(t["year"]) - int(yr)) > 1):
                continue
            db().q("DELETE FROM deleted_media WHERE id = ?", (t["id"],))
            if t["origin"]:
                db().q("INSERT OR REPLACE INTO media_allow VALUES (?,?,?)", (t["origin"], str(r["label"] or r["name"])[:200], time.time()))
            lifted = True
        if r["url"].startswith("torbox:"):
            _, kind, item, file = r["url"].split(":", 3)
            if lifted:
                db().q("INSERT OR REPLACE INTO media_allow VALUES (?,?,?)", (f"{kind}:{item}:{file}", str(r["label"] or r["name"])[:200], time.time()))
        if lifted:
            write_deleted_json()
            log.info("kino lets %s download again, it was played", logsafe(r["name"]))
    except Exception as e:
        log.info("noting a played source failed: %s", e)


# ---------------------------------------------------------------- my list
def list_key_for(t, meta):
    return (meta or {}).get("id") or f"lib:{t['id']}"


def in_list(pid, key):
    ids = group_ids(pid)
    return bool(db().q(f"SELECT 1 FROM mylist WHERE profile_id IN ({ids_sql(ids)}) AND key = ?", (*ids, key)))


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
        if not kind_ok(kind) or not mid:
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
    ids = group_ids(p["id"])
    db().q(f"DELETE FROM mylist WHERE profile_id IN ({ids_sql(ids)}) AND key = ?", (*ids, key))
    return {"ok": True}


def mylist_items(p, summ, wm):
    """My List resolved against the library, plus shows in the list that got new episodes since they were last looked at"""
    by_meta, by_id = lib_by_meta_id(summ), {s["id"]: s for s in summ}
    items, fresh = [], []
    ids, seen_keys = group_ids(p["id"]), set()
    for r in db().q(f"SELECT * FROM mylist WHERE profile_id IN ({ids_sql(ids)}) ORDER BY added DESC", ids):
        if r["key"] in seen_keys:
            continue
        seen_keys.add(r["key"])
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
        KIDS_RULES["rules"] = None
    else:
        db().q("INSERT OR REPLACE INTO kids_rules VALUES (?,?)", (key, 1 if b["allow"] else 0))
        KIDS_RULES["rules"] = None
    return {"ok": True}


STORAGE_WARN_PCT = float(env("STORAGE_WARN_PCT", "90"))


def storage_state():
    d = disk_box() if box_mounted() else None
    if not d or not d["total"]:
        return None
    pct = d["used"] / d["total"] * 100
    return {**d, "pct": round(pct, 1), "warn": pct >= STORAGE_WARN_PCT}


@app.get("/api/admin/storage")
async def storage_review(admin=Depends(require_admin)):
    st = storage_state()
    # Joint profiles dont count, what they watch is already saved to both people in them
    profiles = [r["id"] for r in db().q("SELECT id FROM profiles WHERE pending = 0 AND (members IS NULL OR members = '')")]
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
    log.warning("kino app %s page=%s device=%s %s", logsafe(entry["kind"]), logsafe(entry["page"]), logsafe(entry["device"]), logsafe(entry["detail"]))
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


GATE_HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light"><meta name="robots" content="noindex, nofollow"><title>Kino</title>
<link rel="icon" href="/static/icon.svg" type="image/svg+xml"><link rel="icon" href="/static/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/static/icon-180.png">
<link rel="stylesheet" href="/static/app.css?v=__V__"></head><body class="gate-body"><main class="gate" id="gate">
<div class="gate-card glass-card"><div class="gate-mark">__WORDMARK__</div><h1>This Device Isn't Allowed Yet</h1>
<p class="secondary">Kino only opens on your family's networks or on devices the admin has approved. Ask for access and give the admin this code.</p>
<div class="gate-code" id="gateCode">···-···</div>
<form id="gateForm" class="gate-form"><input id="gateName" maxlength="40" placeholder="Name this device, like Mum's iPad" required>
<button class="btn primary" type="submit">Ask for Access</button></form>
<p class="note" id="gateMsg"></p></div></main><script src="/static/gate.js?v=__V__"></script></body></html>"""
GATE_WORDMARK = (Path(__file__).with_name("static") / "wordmark.svg").read_text()


@app.get("/gate")
async def gate_page():
    return Response(GATE_HTML.replace("__V__", STATIC_VERSION["v"]).replace("__WORDMARK__", GATE_WORDMARK), media_type="text/html", headers={"Cache-Control": "no-store"})


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
        if not kind_ok(kind) or not mid:
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


async def hls_probe(r):
    """A playlist stream (youtube) cant be handed to a browser as one file, so it goes through the server's player like
    a torbox copy. Probed by stream id not link, the link changes every time youtubio is asked"""
    url = r["url"]
    await check_host(urlparse(url).hostname)
    rows = db().q("SELECT data FROM probe WHERE path = ?", ("hls:" + r["id"],))
    if rows:
        return url, json.loads(rows[0]["data"])
    try:
        data = await asyncio.to_thread(run_probe, url)
    except Exception as e:
        raise HTTPException(502, f"Couldn't open that stream: {e}")
    if not data.get("video"):
        raise HTTPException(502, "That stream didn't have any video in it, the link might have run out")
    db().q("INSERT OR REPLACE INTO probe VALUES (?,?,?,?)", ("hls:" + r["id"], 0, 0, json.dumps(data)))
    return url, data


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


def remove_file(f, admin=""):
    p = Path(f["path"]).resolve()
    root = MEDIA_DIR.resolve()
    # Never deletes anything outside the storage box library, or a link that points somewhere else
    if root not in p.parents or Path(f["path"]).is_symlink():
        raise HTTPException(400, "That file is outside the library")
    # Remembered before it goes: the sync reads this list (deleted.json) so it doesnt fetch the same thing again
    o = origin_of(f["path"], f["rel"])
    g = guess(f["rel"])
    t = LIB["titles"].get(f["title_id"]) or {}
    p.unlink(missing_ok=True)
    db().q("INSERT INTO deleted_media (rel, origin, name, title, ntitle, year, season, episode, size, at, by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
           (f["rel"], o["key"], f["name"], t.get("guess_name") or f["name"], norm(first(g.get("title")) or ""), str(first(g.get("year")) or ""),
            f["season"], f["episode"], f["size"], time.time(), str(admin)[:60]))
    db().q("DELETE FROM media_origin WHERE rel = ?", (f["rel"],))
    write_deleted_json()
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
    await asyncio.to_thread(remove_file, f, admin)
    log.info("kino deleted %s by %s", logsafe(f["rel"]), logsafe(admin))
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
            await asyncio.to_thread(remove_file, f, admin)
            log.info("kino deleted %s by %s", logsafe(f["rel"]), logsafe(admin))
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
        "disks": {"vps": disk("/"), "box": disk_box() if mounted else None},
        "box_mounted": mounted, "players": len(SESS), "watchdog": read_json(WATCHDOG_STATUS),
    }


# ---- stress test: how the server copes with lots of people at once
# Runs pretend viewers on the server itself: some converting a film to HLS exactly like the player does (at real
# time speed), the rest reading a film off the Storage Box at a normal streaming rate like direct play. Every second
# it notes the CPU, memory and Storage Box reading. At the end each viewer either kept up or it didnt, which is what
# decides if playback would stutter. It cant test the internet connection to your viewers, thats outside the server
STRESS = {"state": "idle"}
STRESS_RATE = 1_000_000  # bytes a second a direct viewer reads, about 8 Mbps, a good 1080p film


async def stress_run(n, secs, conv_pct):
    files = [f for f in LIB["files"].values() if (f.get("size") or 0) > 50 * 1024**2]
    if not files:
        STRESS.update(state="failed", error="There aren't any films in the library to test with")
        return
    random.shuffle(files)
    conv = round(n * conv_pct / 100)
    st = STRESS
    st.update(state="running", started=time.time(), viewers=n, seconds=secs, converting=conv, direct=n - conv, samples=[], error=None, result=None)
    procs, readers, dirs = [], [], []
    stop = asyncio.Event()

    async def converter(i, f):
        try:
            pr = await get_probe(f)
        except Exception:
            pr = {}
        dur = pr.get("duration") or 0
        start = random.uniform(0, max(0, dur * 0.6)) if dur > 120 else 0
        v = (pr.get("video") or {}).get("codec")
        vargs = ["-c:v", "copy"] if v in ("h264", "hevc", "av1", "vp9", None) else ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p"]
        out = Path(tempfile.mkdtemp(prefix="kino-stress-"))
        dirs.append(out)
        args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-nostats", "-progress", "pipe:1"]
        if FF_INFO["burst"]:
            args += ["-readrate", "1", "-readrate_initial_burst", "20"]
        args += ["-ss", f"{start:.1f}", "-i", f["path"], "-map", "0:v:0", "-map", "0:a:0?", *vargs, "-c:a", "aac", "-ac", "2", "-b:a", "192k",
                 "-af", "aresample=async=1000", "-sn", "-dn", "-f", "hls", "-hls_time", "6", "-hls_segment_type", "fmp4",
                 "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", str(out / "s%05d.m4s"), str(out / "i.m3u8")]
        proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        procs.append(proc)
        rec = {"kind": "convert", "file": f["name"][:60], "media": 0.0, "began": time.time(), "converted": vargs[1] != "copy"}
        readers.append(rec)
        try:
            while not stop.is_set():
                line = await proc.stdout.readline()
                if not line:
                    break
                k, _, val = line.decode(errors="ignore").strip().partition("=")
                if k == "out_time_us" and val.isdigit():
                    rec["media"] = int(val) / 1e6
        except Exception:
            pass

    async def direct(i, f):
        rec = {"kind": "direct", "file": f["name"][:60], "bytes": 0, "began": time.time()}
        readers.append(rec)
        try:
            fh = await asyncio.to_thread(open, f["path"], "rb")
        except OSError:
            rec["error"] = True
            return
        try:
            size = f["size"]
            await asyncio.to_thread(fh.seek, int(random.uniform(0, size * 0.6)))
            t0 = time.time()
            while not stop.is_set():
                chunk = await asyncio.to_thread(fh.read, 256 * 1024)
                if not chunk:
                    await asyncio.to_thread(fh.seek, 0)
                    continue
                rec["bytes"] += len(chunk)
                # Reads like a player does: as fast as it can until it's ahead, then at the film's rate
                ahead = rec["bytes"] / STRESS_RATE - (time.time() - t0)
                if ahead > 5:
                    await asyncio.sleep(min(1, ahead - 5))
        finally:
            fh.close()

    tasks = [asyncio.create_task(converter(i, files[i % len(files)])) for i in range(conv)]
    tasks += [asyncio.create_task(direct(i, files[(conv + i) % len(files)])) for i in range(n - conv)]
    psutil.cpu_percent(None)
    d0 = psutil.disk_io_counters()
    n0 = psutil.net_io_counters()
    last = time.time()
    try:
        for sec in range(secs):
            if st.get("cancel"):
                break
            await asyncio.sleep(1)
            now = time.time()
            d1, n1 = psutil.disk_io_counters(), psutil.net_io_counters()
            box_read = sum(r.get("bytes", 0) for r in readers)
            vm = psutil.virtual_memory()
            st["samples"].append({"t": sec + 1, "cpu": psutil.cpu_percent(None), "mem": vm.total - vm.available, "mem_pct": vm.percent,
                                  "net_in": (n1.bytes_recv - n0.bytes_recv) / (now - last), "disk": ((d1.read_bytes - d0.read_bytes) if d1 and d0 else 0) / (now - last),
                                  "direct_read": box_read})
            d0, n0, last = d1, n1, now
    finally:
        stop.set()
        for p_ in procs:
            try:
                p_.kill()
            except ProcessLookupError:
                pass
        await asyncio.gather(*tasks, return_exceptions=True)
        for d in dirs:
            shutil.rmtree(d, ignore_errors=True)
    # Who kept up: converters need about 1x real time once past the first burst, direct readers need there rate
    elapsed = max(1, time.time() - st["started"])
    conv_r = [r for r in readers if r["kind"] == "convert"]
    dir_r = [r for r in readers if r["kind"] == "direct"]
    speeds = [r["media"] / max(1, time.time() - r["began"]) for r in conv_r]
    rates = [r["bytes"] / max(1, time.time() - r["began"]) for r in dir_r]
    conv_ok = sum(1 for x in speeds if x >= 0.95)
    dir_ok = sum(1 for x in rates if x >= STRESS_RATE * 0.95)
    sm = st["samples"] or [{"cpu": 0, "mem": 0, "mem_pct": 0}]
    cpu_peak, cpu_avg = max(x["cpu"] for x in sm), sum(x["cpu"] for x in sm) / len(sm)
    ok = conv_ok == len(conv_r) and dir_ok == len(dir_r) and cpu_peak < 95
    problems = []
    if conv_ok < len(conv_r):
        problems.append(f"{len(conv_r) - conv_ok} of {len(conv_r)} converted streams couldn't keep up with real time")
    if dir_ok < len(dir_r):
        problems.append(f"{len(dir_r) - dir_ok} of {len(dir_r)} direct viewers couldn't get a film's worth of data from the Storage Box")
    if cpu_peak >= 95:
        problems.append("the CPU was maxed out")
    st.update(state="done", result={
        "ok": ok, "problems": problems, "elapsed": elapsed, "cpu_peak": cpu_peak, "cpu_avg": cpu_avg,
        "mem_peak": max(x["mem"] for x in sm), "mem_pct_peak": max(x["mem_pct"] for x in sm),
        "convert": {"n": len(conv_r), "ok": conv_ok, "slowest": min(speeds) if speeds else None, "avg": sum(speeds) / len(speeds) if speeds else None,
                    "reencoding": sum(1 for r in conv_r if r["converted"])},
        "direct": {"n": len(dir_r), "ok": dir_ok, "slowest_mbps": min(rates) * 8 / 1e6 if rates else None,
                   "total_mbps": sum(rates) * 8 / 1e6 if rates else None},
        "upload_needed_mbps": n * 8,
    })


@app.post("/api/admin/stress")
async def stress_start(request: Request, admin=Depends(require_admin)):
    if STRESS.get("state") == "running":
        raise HTTPException(409, "A stress test is already running")
    b = await request.json()
    n = max(1, min(40, int(b.get("viewers") or 20)))
    secs = max(15, min(300, int(b.get("seconds") or 60)))
    pct = max(0, min(100, int(b.get("converted") if b.get("converted") is not None else 50)))
    STRESS.clear()
    STRESS.update(state="starting")
    asyncio.create_task(stress_run(n, secs, pct))
    return {"ok": True}


@app.post("/api/admin/stress/stop")
async def stress_stop(admin=Depends(require_admin)):
    STRESS["cancel"] = True
    return {"ok": True}


@app.get("/api/admin/stress")
async def stress_status(admin=Depends(require_admin)):
    return {**{k: v for k, v in STRESS.items() if k != "cancel"}, "now": time.time()}


@app.get("/api/admin/errors")
async def server_errors(admin=Depends(require_admin)):
    return {"items": list(SERVER_ERRORS)}


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


# ---------------------------------------------------------------- live tv
# Two places channels come from: IPTV playlists (M3U) the admin adds in Settings, with an XMLTV guide if there is
# one, and Stremio addons with tv type catalogs. Everything plays as HLS through Kino: playlists that are already HLS
# get there links rewritten so every request comes back through here (no CORS problems, and links that only work
# from the server keep working), anything else (a raw MPEG-TS stream from a tuner) gets repackaged by ffmpeg live.
# English channels go first, the UK before the US, then other english speaking countries, then everything else
LIVE = {"refreshing": False, "checking": False, "seen": 0}
LIVE_STRIKES = {}  # channel id -> when it failed lately


def live_strike(cid):
    """A channel is only switched off after it failed 3 times in 10 minutes, one bad answer (a busy provider, a hiccup) isnt a dead channel"""
    now = time.time()
    hits = [t for t in LIVE_STRIKES.get(cid, []) if now - t < 600] + [now]
    LIVE_STRIKES[cid] = hits
    if len(hits) >= 3 and cid.startswith("c"):
        db().q("UPDATE channels SET ok = 0, checked = ? WHERE id = ?", (now, cid))
LP = {}  # proxy token -> (url, headers, local, made)
LIVE_RESOLVED = {}  # addon channel id -> (when, url, headers)
M3U_ATTR = re.compile(r'([\w-]+)="([^"]*)"')
UK_FIRST = ("bbc", "itv", "channel 4", "channel 5", "e4", "more4", "film4", "sky", "dave", "gb news", "tnt sports", "quest",
            "5usa", "s4c", "u&", "drama", "yesterday", "w ", "talk")
EN_COUNTRIES = ("ie", "ca", "au", "nz")
# Channels most people know, they come before the rest of their country in the list (the ones that actually get watched move up on top of that)
POPULAR_RX = re.compile(r"\b(espn|cnn|bbc|sky|fox|nbc|cbs|abc|hbo|amc|fx|discovery|national geographic|nat geo|history|eurosport|dazn|tnt|bt sport|premier|formula|f1|nickelodeon|disney|cartoon network|mtv|comedy central|paramount|tlc|bravo|itv|channel 4|channel 5|e4|film4|dave|gb news|quest|cnbc|bloomberg|euronews|al jazeera|france 24)\b")
GROUPS = [("News", r"news"), ("Sports", r"sport"), ("Movies", r"movie|film|cinema"), ("Kids", r"kid|animation|cartoon|family"),
          ("Music", r"music"), ("Documentary", r"documentar|science|education|nature"), ("Entertainment", r"entertain|general|series|comedy|lifestyle|culture|reality|show")]


# Kinds of channel the admin can hide in Settings (Live TV, Hide Channels). Nothing is hidden until it is switched on. Matched on the channel name
# and its group in the playlist
JUNK = {
    "religious": ("Religious", re.compile(r"\b(church|gospel|christian|jesus|bible|catholic|ewtn|tbn|god ?tv|daystar|hillsong|3abn|islam\w*|quran\w*|koran|muslim|makkah|mecca|madinah|madina|hajj|allah|ahmadi\w*|iqra|madani|peace ?tv|bhakti|bhajan|aastha|sanskar|sikh|gurbani|gurdwara|hindu|buddh\w*|torah|jewish|prayer|sermon|worship|spiritual|religio\w*|rosary|vatican)\b", re.I)),
    "shopping": ("Shopping", re.compile(r"\b(shop|shopping|qvc|hsn|ideal world|jewellery maker|tjc|teleshop\w*|bid ?tv|price drop|gems? tv)\b", re.I)),
    "adult": ("Adult", re.compile(r"\b(xxx|adult|erotic\w*|porn\w*|playboy|hustler|penthouse|brazzers)\b|18\+", re.I)),
    "radio": ("Radio", re.compile(r"\bradio\b", re.I)),
}


def classify_junk(name, grp=""):
    t = f"{name} {grp}"
    for k, (_, rx) in JUNK.items():
        if rx.search(t):
            return k
    return None


def junk_where():
    """What the admin chose to hide, as SQL for the channel lists (c is the channels table): whole kinds of channel and words in a name"""
    cats = [r["value"] for r in db().q("SELECT value FROM live_filter WHERE kind = 'cat'")]
    words = [r["value"] for r in db().q("SELECT value FROM live_filter WHERE kind = 'word'")]
    sql, args = [], []
    if cats:
        sql.append("(c.junk IS NULL OR c.junk NOT IN (%s))" % ",".join("?" * len(cats))); args += cats
    for w in words[:50]:
        sql.append("lower(c.name) NOT LIKE ?"); args.append(f"%{w.lower()}%")
    return sql, args


def live_group(raw, name=""):
    g = f"{raw or ''} {name}".lower()
    for label, rx in GROUPS:
        if re.search(rx, g):
            return label
    g = (raw or "").split(";")[0].strip()[:30]
    return "Other" if not g or g.lower() == "undefined" else g


def live_country(attrs, name, grp, default):
    # A country playlist (iptv-org's countries/uk.m3u) says it for every channel in it, ids like 5Cops.us@UK are US
    # channels on there UK feed
    if default:
        return default
    c = (attrs.get("tvg-country") or "").split(";")[0].strip().lower()
    if not c:
        m = re.search(r"\.([a-z]{2})(?:@|$)", (attrs.get("tvg-id") or "").lower())
        c = m.group(1) if m else ""
    if not c:
        t = f"{grp} {name}".lower()
        c = "uk" if re.search(r"\b(uk|gb|united kingdom|british)\b", t) else "us" if re.search(r"\b(us|usa|united states)\b", t) else default
    return "uk" if c == "gb" else c


def live_rank(name, country, lang):
    english = (lang or "").lower() in ("", "eng", "english")
    base = 0 if country == "uk" else 1 if country == "us" else 2 if country in EN_COUNTRIES or (lang or "").lower() in ("eng", "english") else 3
    if not english and base < 3:
        base = 3
    n = norm(name)
    star = 0 if any(n.startswith(x) for x in UK_FIRST) or POPULAR_RX.search(n) else 1
    return base * 10 + star


def parse_m3u(text, list_id, default_country=""):
    """Channels from an M3U playlist, plus the guide link if the playlist names one"""
    out, cur, hdr, epg = [], None, {}, None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("#EXTM3U"):
            a = dict(M3U_ATTR.findall(line))
            epg = (a.get("url-tvg") or a.get("x-tvg-url") or "").split(",")[0].strip() or None
        elif line.startswith("#EXTINF"):
            attrs = dict(M3U_ATTR.findall(line))
            name = line.rsplit(",", 1)[-1].strip() if "," in line else attrs.get("tvg-name", "")
            # iptv-org adds things like (720p) and [Geo-blocked] to names, they come off so the list reads cleanly
            name = re.sub(r"\s*\((?:\d{3,4}p|\d+k)\)|\s*\[[^\]]*\]", "", unesc(name or attrs.get("tvg-name") or "")).strip() or "Channel"
            cur, hdr = {"attrs": attrs, "name": name}, {}
        elif line.startswith("#EXTVLCOPT:") and "=" in line:
            k, v = line[11:].split("=", 1)
            k = {"http-user-agent": "User-Agent", "http-referrer": "Referer", "http-referer": "Referer", "http-origin": "Origin"}.get(k.strip().lower())
            if k:
                hdr[k] = v.strip()
        elif line.startswith("#EXTHTTP:"):
            try:
                hdr.update({str(k): str(v) for k, v in json.loads(line[9:]).items()})
            except Exception:
                pass
        elif not line.startswith("#") and cur:
            if re.match(r"^(https?|rtmp|rtsp|udp)://", line, re.I) and line.lower().startswith("http"):
                a = cur["attrs"]
                grp = live_group(a.get("group-title"), cur["name"])
                country = live_country(a, cur["name"], a.get("group-title") or "", default_country)
                out.append({"id": "c" + hashlib.sha1(f"{list_id}|{line}|{cur['name']}".encode()).hexdigest()[:15], "list_id": list_id,
                            "name": cur["name"][:120], "logo": a.get("tvg-logo") or None, "grp": grp, "country": country,
                            "tvg": (a.get("tvg-id") or "").strip() or None, "url": line, "headers": json.dumps(hdr) if hdr else None,
                            "rank": live_rank(cur["name"], country, a.get("tvg-language")), "junk": classify_junk(cur["name"], a.get("group-title") or grp), "pop": popularity(cur["name"])})
            cur = None
    return out, epg


async def live_get(url, headers=None, local=False, max_bytes=60 * 1024**2, timeout=60):
    """Downloads a playlist or guide, following redirects. Private addresses only for playlists marked as on your network"""
    for _ in range(5):
        u = urlparse(url)
        if u.scheme not in ("http", "https") or not u.hostname:
            raise HTTPException(400, "That isn't an http or https link")
        if not local:
            await check_host(u.hostname)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False, headers={"User-Agent": "Mozilla/5.0 Kino", **(headers or {})}) as c:
            async with c.stream("GET", url) as r:
                if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                    url = urljoin(url, r.headers["location"])
                    continue
                if r.status_code != 200:
                    raise HTTPException(502, f"It answered with an error ({r.status_code})")
                buf = bytearray()
                async for chunk in r.aiter_bytes():
                    buf += chunk
                    if len(buf) > max_bytes:
                        raise HTTPException(502, "That's too big")
                return bytes(buf), url
    raise HTTPException(502, "Too many redirects")


def guide_name(n):
    """Channel names made comparable between a playlist and a guide: BBC One HD, bbc one and BBCOne all match"""
    n = re.sub(r"^[A-Za-z]{2}\s+-\s+", "", n or "")   # the guide calls it "UK - BBC One"
    n = n.lower().replace("&", "and").replace("+", "plus")
    n = re.sub(r"[^a-z0-9]", "", n)
    n = re.sub(r"(fhd|uhd|hd|sd|4k|uk|gb|us|usa)$", "", n)
    return n.replace("bbc1", "bbcone").replace("bbc2", "bbctwo")


async def guide_parse(*args):
    """Runs guide_parse.py in its own low priority process and reads back the JSON it prints"""
    proc = await asyncio.create_subprocess_exec(sys.executable, str(Path(__file__).with_name("guide_parse.py")), *args,
                                                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    out, err = await asyncio.wait_for(proc.communicate(), 900)
    if proc.returncode != 0:
        raise RuntimeError(f"reading the guide failed: {err.decode(errors='ignore')[-200:]}")
    return json.loads(out)


UK_REGIONS = {"london", "lon", "east", "west", "north", "south", "midlands", "wales", "scotland", "northern", "ireland", "ni", "cumbria", "yorkshire",
              "anglia", "border", "central", "granada", "meridian", "tyne", "tees", "west", "england", "channel", "islands", "", "&", "and", "eastern", "western"}
# Free guides by country, used for playlists that dont name one (iptv-org's dont), matched by channel name. These are from
# iptv-epg.org, the epg.pw ones we used before have their times shifted by hours (BBC News at One shows at 05:00)
AUTO_GUIDES = {k: f"https://iptv-epg.org/files/epg-{k if k != 'uk' else 'gb'}.xml.gz" for k in ("uk", "us", "fr", "de", "ca", "au", "nz")}


async def load_guide(url, local, chans, country=None):
    """Downloads a guide, matches it to the playlist's channels (by guide id, then by name) and stores whats on.
    A country guide only gets that country's channels, otherwise UK Sky News ends up with the Australian Sky News schedule.
    Returns how many channels got a guide"""
    raw, _ = await live_get(url, local=local, max_bytes=300 * 1024**2, timeout=240)
    # Big guides (the US one is about 300 MB unpacked) are read in a seperate low priority process, in a thread they
    # took the whole server's attention for minutes and everything else went slow
    tmp = DATA_DIR / f"guide-{secrets.token_hex(4)}.xml"
    wfile = tmp.with_suffix(".want")
    # Guide ids are only unique inside their own guide (the free ones are plain numbers), so each guide gets its own prefix
    tag = guide_tag(url)
    try:
        await asyncio.to_thread(tmp.write_bytes, raw)
        del raw
        res = await guide_parse("channels", str(tmp))
        gch, have = res["names"], res["count"]
        by_name = {}
        for gid, names in gch.items():
            if not have.get(gid):
                continue
            for n in names:
                # "BBC Four / CBeebies" is one guide channel for two playlist channels
                for part in [n, *re.split(r"\s+/\s+", n)]:
                    k = guide_name(part)
                    if k and (k not in by_name or have[gid] > have[by_name[k]]):
                        by_name[k] = gid
        matched = {}
        for c in chans:
            if country and c["country"] != country:
                continue
            tid = (c["tvg"] or "").split("@")[0]   # playlists write BBCOne.uk@SD, the guide has BBCOne.uk
            gid = tid if tid in gch and have.get(tid) else by_name.get(guide_name(c["name"]))
            if not gid:
                # Regional versions (BBC One London, BBC One Wales) fall back to the main channel's guide
                words = re.sub(r"\s+(hd|sd|fhd)$", "", c["name"], flags=re.I).split()
                while not gid and len(words) > 2 and words[-1].lower().strip("&") in UK_REGIONS:
                    words.pop()
                    gid = by_name.get(guide_name(" ".join(words)))
            if gid:
                matched[c["id"]] = gid
        if not matched:
            return 0
        want = set(matched.values())
        wfile.write_text(json.dumps(list(want)))
        progs = [(f"{tag}~{x[0]}", *x[1:]) for x in await guide_parse("progs", str(tmp), str(wfile))]
    finally:
        tmp.unlink(missing_ok=True)
        wfile.unlink(missing_ok=True)
    keys = [f"{tag}~{g}" for g in want]
    # The US guide is hundreds of thousands of rows, doing this on the main thread (holding the db the whole time) froze
    # everything for seconds, so its a thread and in chunks so other requests get the db in between
    await asyncio.to_thread(write_epg, keys, progs, [(f"{tag}~{g}", cid) for cid, g in matched.items()])
    return len(matched)


def db_chunks(sql, rows, size=5000):
    for i in range(0, len(rows), size):
        db().many(sql, rows[i:i + size])


def write_epg(keys, progs, tvg_rows):
    for i in range(0, len(keys), 500):
        part = keys[i:i + 500]
        db().q("DELETE FROM epg WHERE tvg IN (%s)" % ",".join("?" * len(part)), part)
    db_chunks("INSERT INTO epg VALUES (?,?,?,?,?,?)", progs)
    db_chunks("UPDATE channels SET tvg = ? WHERE id = ?", tvg_rows)


def guide_tag(url):
    return hashlib.sha1(url.encode()).hexdigest()[:6]


def keep_tvg(c, old, tags):
    """A playlist refresh keeps the guide a channel was matched to (while its guide is still one we read) until the new guide is
    read, so the guide doesnt go blank if the guide download fails"""
    prev = (old.get(c["id"]) or {}).get("tvg")
    return prev if prev and "~" in prev and prev.split("~", 1)[0] in tags else c["tvg"]


async def refresh_list(row):
    lid = row["id"]
    try:
        raw, _ = await live_get(row["url"], local=bool(row["local"]))
        text = raw.decode("utf-8", errors="ignore")
        if "#EXTINF" not in text:
            raise HTTPException(400, "That link isn't an M3U playlist")
        default = ""
        m = re.search(r"/countries/([a-z]{2})\.m3u", row["url"].lower())
        if m:
            default = "uk" if m.group(1) == "gb" else m.group(1)
        chans, epg = await asyncio.to_thread(parse_m3u, text, lid, default)
        old = {r["id"]: dict(r) for r in db().q("SELECT id, ok, checked, tvg FROM channels WHERE list_id = ?", (lid,))}
        guide = row["epg"] or epg
        err = None
        guides = [guide] if guide else []
        if not guides:
            # No guide named, the free country guides fill in for the english speaking countries in it
            counts = {}
            for c in chans:
                counts[c["country"]] = counts.get(c["country"], 0) + 1
            guides = [(AUTO_GUIDES[k], k) for k in AUTO_GUIDES if counts.get(k, 0) >= 5]
        else:
            guides = [(g, None) for g in guides]
        tags = {guide_tag(g) for g, _ in guides}
        rows = [(c["id"], lid, c["name"], c["logo"], c["grp"], c["country"], keep_tvg(c, old, tags), c["url"], c["headers"], c["rank"],
                 (old.get(c["id"]) or {}).get("ok"), (old.get(c["id"]) or {}).get("checked"), c.get("junk"), c.get("pop")) for c in chans]

        def store():
            db().q("DELETE FROM channels WHERE list_id = ?", (lid,))
            db_chunks("INSERT OR REPLACE INTO channels VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        await asyncio.to_thread(store)
        for g, ctry in guides:
            try:
                n = await load_guide(g, bool(row["local"]) and g == guide, chans, ctry)
                log.info("live tv guide %s matched %d channels", g, n)
            except Exception as e:
                err = f"Guide failed: {getattr(e, 'detail', None) or e}"[:200]
        db().q("UPDATE iptv_lists SET refreshed = ?, count = ?, error = ?, epg = COALESCE(epg, ?) WHERE id = ?", (time.time(), len(chans), err, row["epg"] or None, lid))
        log.info("live tv list %s: %d channels", row["name"], len(chans))
    except Exception as e:
        db().q("UPDATE iptv_lists SET refreshed = ?, error = ? WHERE id = ?", (time.time(), str(getattr(e, "detail", None) or e)[:200], lid))
        log.info("live tv list %s failed: %s", row["name"], e)


async def check_channel(c, tries=2):
    """Opens a channel for a moment (twice if it fails the first time): a playlist or video coming back counts as working"""
    ok = False
    for i in range(tries):
        ok = await probe_channel(c)
        if ok:
            break
        await asyncio.sleep(2)
    db().q("UPDATE channels SET ok = ?, checked = ? WHERE id = ?", (1 if ok else 0, time.time(), c["id"]))
    return ok


async def probe_channel(c):
    hdr = json.loads(c["headers"]) if c["headers"] else {}
    local = bool(db().q("SELECT local FROM iptv_lists WHERE id = ?", (c["list_id"],))[0]["local"]) if c["list_id"] else False
    try:
        cl, r, _ = await asyncio.wait_for(live_open(c["url"], hdr, local), 12)
        try:
            head = b""
            async for chunk in r.aiter_bytes():
                head += chunk
                if len(head) > 2048:
                    break
            ct = r.headers.get("content-type", "").lower()
            ok = r.status_code == 200 and (b"#EXTM3U" in head[:200] or "mpegurl" in ct or "video" in ct or "mp2t" in ct or "octet" in ct)
        finally:
            await r.aclose()
            await cl.aclose()
    except Exception:
        ok = False
    return ok


async def check_channels(limit=800):
    # Providers often allow a connection or two at a time, checking channels while somebody is watching could cut their stream off
    if LIVE["checking"] or time.time() - LIVE["seen"] < 180:
        return
    LIVE["checking"] = True
    try:
        rows = db().q("SELECT * FROM channels WHERE checked IS NULL OR (ok = 0 AND checked < ?) OR checked < ? ORDER BY rank, name LIMIT ?",
                      (time.time() - 3600, time.time() - 12 * 3600, limit))
        gate = asyncio.Semaphore(4)

        async def one(c):
            async with gate:
                await check_channel(c)
        await asyncio.gather(*(one(c) for c in rows))
    finally:
        LIVE["checking"] = False


async def live_worker():
    await asyncio.sleep(20)
    try:
        # Playlists added before the free guides existed get them now instead of in 12 hours
        # The guides are matched per country now (and ids carry a guide prefix), so lists read the old way get read again once
        flag = DATA_DIR / "guide-v2"
        if not flag.exists():
            db().q("DELETE FROM epg")
        for row in db().q("SELECT * FROM iptv_lists l WHERE enabled = 1 AND (? OR NOT EXISTS (SELECT 1 FROM channels c JOIN epg e ON e.tvg = c.tvg WHERE c.list_id = l.id))", (0 if flag.exists() else 1,)):
            await refresh_list(row)
        flag.touch()
    except Exception as e:
        log.info("live tv guide catch up: %s", e)
    while True:
        try:
            for row in db().q("SELECT * FROM iptv_lists WHERE enabled = 1 AND (refreshed IS NULL OR refreshed < ?)", (time.time() - 12 * 3600,)):
                await refresh_list(row)
            db().q("DELETE FROM epg WHERE stop < ?", (time.time() - 7200,))
            await check_channels()
            # Embed lists get read now and then so search can find whats in them
            for src in db().q("SELECT * FROM embed_sources WHERE enabled = 1"):
                try:
                    await embed_list(src, fresh=True)
                except Exception:
                    pass
        except Exception as e:
            log.info("live tv worker: %s", e)
        await asyncio.sleep(1800)


def live_preview(m):
    """An addon's tv item (a channel or a live event), plays straight away instead of having a title page"""
    i = str(m.get("id", ""))
    return {"id": None, "ext": f"tv/{i}", "external": True, "kind": "live", "live_id": "t" + base64.urlsafe_b64encode(i.encode()).decode().rstrip("="),
            "name": unesc(m.get("name") or "") or "Live", "poster": https_url(m.get("poster")), "background": https_url(m.get("background")) or https_url(m.get("poster")),
            "logo": https_url(m.get("logo")), "shape": m.get("posterShape") or "landscape", "genres": unesc(m.get("genres") or [])[:4],
            "description": unesc(m.get("description")), "releaseInfo": None, "rating": None, "imdb": i, "count": 0, "added": 0,
            "watched": False, "watched_count": 0, "my_rating": 0, "last_activity": 0, "matched": True}


def live_kids_ok(grp):
    return grp == "Kids"


def now_next(tvgs):
    """Whats on now and next for a set of guide ids"""
    if not tvgs:
        return {}
    now, out = time.time(), {}
    tv = list(tvgs)
    for i in range(0, len(tv), 500):
        part = tv[i:i + 500]
        for r in db().q("SELECT tvg, start, stop, title, sub FROM epg WHERE tvg IN (%s) AND stop > ? AND start < ? ORDER BY start" % ",".join("?" * len(part)), [*part, now, now + 6 * 3600]):
            l = out.setdefault(r["tvg"], [])
            if len(l) < 2:
                l.append({"title": r["title"], "sub": r["sub"], "start": r["start"], "stop": r["stop"]})
    return out


def chan_out(c, guide):
    g = guide.get(c["tvg"]) or []
    return {"id": c["id"], "name": c["name"], "logo": https_url(c["logo"]) if c["logo"] else None, "group": c["grp"], "country": c["country"],
            "ok": c["ok"], "now": g[0] if g and g[0]["start"] <= time.time() else None, "next": g[1] if len(g) > 1 else (g[0] if g and g[0]["start"] > time.time() else None)}


def live_catalogs():
    """tv type catalogs from addons that can be listed without typing a search"""
    out = []
    for a in addon_rows():
        for c in a["m"].get("catalogs") or []:
            if c.get("type") != "tv" or f"{c.get('type')}/{c.get('id')}" in a["hidden"]:
                continue
            extra = {e.get("name"): e for e in c.get("extra") or []}
            if "search" in extra and extra["search"].get("isRequired"):
                continue
            g = extra.get("genre")
            out.append((a, c, (g.get("options") or [None])[0] if g and g.get("isRequired") else None))
    return out


LIVE_HOME_COUNTRIES = ("uk", "us", "fr", "de")


def live_country_where(p):
    """Live TV only lists the UK, US, France and Germany unless the profile turned on Show All Countries in Settings"""
    if (p.get("prefs") or {}).get("live_all_countries"):
        return None
    return "(c.country IN (%s) OR c.country = '' OR c.country IS NULL)" % ",".join("?" * len(LIVE_HOME_COUNTRIES))


def fav_names(pid):
    """The channels a profile has favourited, by name. By name because the same channel can be in a list twice and the id changes when
    the playlist link does, going by id gave favourites that vanished or turned up double"""
    return {r["name"] for r in db().q("SELECT DISTINCT name FROM live_fav WHERE profile_id = ? AND name IS NOT NULL", (pid,))}


@app.get("/api/live")
async def live_list(group: str = "", country: str = "", q: str = "", skip: int = 0, all: int = 0, fav: int = 0, p=Depends(current_profile)):
    where, args = ["l.enabled = 1"], []
    if fav:
        where.append("lower(c.name) IN (SELECT name FROM live_fav WHERE profile_id = ? AND name IS NOT NULL)"); args.append(p["id"])
    if not all:
        where.append("(c.ok IS NULL OR c.ok = 1)")
    if p.get("kids"):
        where.append("c.grp = 'Kids'")
    cw = live_country_where(p)
    if cw:
        where.append(cw); args.extend(LIVE_HOME_COUNTRIES)
    if group:
        where.append("c.grp = ?"); args.append(group)
    if country:
        where.append("c.country = ?"); args.append(country)
    if q:
        where.append("c.name LIKE ?"); args.append(f"%{q.strip()[:40]}%")
    favs = fav_names(p["id"])
    # Kinds of channel the admin hid (Settings, Live TV), favourites stay whatever they are
    jsql, jargs = ([], []) if fav else junk_where()
    where.extend(jsql); args.extend(jargs)
    # With no filter and some favourites, the page shows them in their own row on top, so the list below leaves them out (they were there twice)
    if favs and not (fav or group or country or q):
        where.append("lower(c.name) NOT IN (SELECT name FROM live_fav WHERE profile_id = ? AND name IS NOT NULL)"); args.append(p["id"])
    w = " AND ".join(where)
    # The same channel can be in a playlist more than once (a backup link, or the same one in two lists), a channel shows once, the copy that
    # works (or is first in the playlist) is the one that is used
    rows = db().q(f"WITH r AS (SELECT c.*, ROW_NUMBER() OVER (PARTITION BY lower(c.name) ORDER BY (c.ok = 1) DESC, c.rank, c.id) AS rn, "
                  "(lower(c.name) IN (SELECT name FROM live_fav WHERE profile_id = ? AND name IS NOT NULL)) AS isfav, "
                  "COALESCE((SELECT plays FROM live_usage u WHERE u.name = lower(c.name)), 0) AS plays, "
                  "(COALESCE(c.pop, 0) + CASE WHEN c.tvg IS NOT NULL THEN 10 ELSE 0 END) AS score "
                  f"FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE {w}) "
                  "SELECT * FROM r WHERE rn = 1 ORDER BY isfav DESC, plays DESC, (score / 20) DESC, (rank / 10), score DESC, rank, ok DESC, name LIMIT 120 OFFSET ?", [p["id"], *args, max(0, skip)])
    guide = now_next({r["tvg"] for r in rows if r["tvg"]})
    out = {"channels": [{**chan_out(r, guide), "fav": r["name"].lower() in favs} for r in rows], "next": skip + len(rows) if len(rows) == 120 else None}
    if skip == 0:
        out["fav_count"] = len(favs)
        out["recordings"] = db().q("SELECT COUNT(*) n FROM recordings WHERE state != 'cancelled'")[0]["n"]
        base = "FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE l.enabled = 1" + ("" if all else " AND (c.ok IS NULL OR c.ok = 1)") + (" AND c.grp = 'Kids'" if p.get("kids") else "") + (f" AND {cw}" if cw else "")
        bargs = list(LIVE_HOME_COUNTRIES) if cw else []
        bj, bja = junk_where()
        if bj:
            base += " AND " + " AND ".join(bj); bargs += bja
        out["groups"] = [r["grp"] for r in db().q(f"SELECT c.grp, COUNT(*) n {base} GROUP BY c.grp ORDER BY n DESC LIMIT 30", bargs)]
        cs = [r["country"] for r in db().q(f"SELECT c.country, COUNT(*) n {base} AND c.country != '' GROUP BY c.country ORDER BY n DESC", bargs)]
        lead = [c for c in ("uk", "us", "fr", "de") if c in cs]
        out["countries"] = lead + [c for c in cs if c not in lead]
        out["all_countries"] = not cw
        out["total"] = db().q(f"SELECT COUNT(DISTINCT lower(c.name)) n {base}", bargs)[0]["n"]
        out["has_guide"] = bool(db().q("SELECT 1 FROM epg WHERE stop > ? LIMIT 1", (time.time(),)))
        out["embeds"] = [] if p.get("kids") else [{"id": r["id"], "name": r["name"]} for r in db().q("SELECT id, name FROM embed_sources WHERE enabled = 1 ORDER BY id")]
        out["addon_rows"] = [] if p.get("kids") else [{"id": f"{a['id']}|{c['id']}", "title": f"{c.get('name') or c.get('id')}", "source": a["m"].get("name")} for a, c, _ in live_catalogs()]
    return out


@app.get("/api/live/addon")
async def live_addon_row(id: str, skip: int = 0, p=Depends(current_profile)):
    if p.get("kids"):
        return {"items": [], "next": None}
    aid, _, cid = id.partition("|")
    for a, c, g in live_catalogs():
        if str(a["id"]) == aid and c.get("id") == cid:
            names = {e.get("name") for e in c.get("extra") or []}
            extra = {k: v for k, v in (("genre", g), ("skip", skip if skip and "skip" in names else None)) if v}
            if skip and "skip" not in names:
                return {"items": [], "next": None}
            try:
                j = await fetch_json(catalog_url(a, c, extra or None), ttl=300, timeout=20)
            except Exception:
                return {"items": [], "next": skip, "retry": True}
            metas = [m for m in (j.get("metas") or []) if isinstance(m, dict) and m.get("id")]
            return {"items": [live_preview(m) for m in metas], "next": skip + len(metas) if metas and "skip" in names else None}
    return {"items": [], "next": None}


@app.get("/api/live/guide")
async def live_guide(start: float = 0, hours: float = 3, group: str = "", country: str = "", skip: int = 0, p=Depends(current_profile)):
    """The TV Guide: channels with a guide, and whats on each across a few hours"""
    start = start or (time.time() // 1800) * 1800
    end = start + min(12, max(1, hours)) * 3600
    where, args = ["l.enabled = 1", "c.tvg IS NOT NULL", "(c.ok IS NULL OR c.ok = 1)", "EXISTS (SELECT 1 FROM epg e WHERE e.tvg = c.tvg AND e.stop > ?)"], [time.time()]
    jsql, jargs = junk_where()
    where.extend(jsql); args.extend(jargs)
    if p.get("kids"):
        where.append("c.grp = 'Kids'")
    cw = live_country_where(p)
    if cw:
        where.append(cw); args.extend(LIVE_HOME_COUNTRIES)
    if group:
        where.append("c.grp = ?"); args.append(group)
    if country:
        where.append("c.country = ?"); args.append(country)
    rows = db().q(f"WITH r AS (SELECT c.*, ROW_NUMBER() OVER (PARTITION BY lower(c.name) ORDER BY (c.ok = 1) DESC, c.rank, c.id) AS rn "
                  f"FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE {' AND '.join(where)}) SELECT * FROM r WHERE rn = 1 ORDER BY rank, name LIMIT 60 OFFSET ?", [*args, max(0, skip)])
    favs = fav_names(p["id"])
    out = []
    for r in rows:
        progs = [{"title": x["title"], "sub": x["sub"], "desc": x["descr"], "start": x["start"], "stop": x["stop"]} for x in
                 db().q("SELECT * FROM epg WHERE tvg = ? AND stop > ? AND start < ? ORDER BY start", (r["tvg"], start, end))]
        out.append({**chan_out(r, {}), "fav": r["name"].lower() in favs, "progs": progs})
    return {"start": start, "end": end, "channels": out, "next": skip + len(rows) if len(rows) == 60 else None}


async def live_source(cid):
    """Where a channel's video actually is: (url, headers, local)"""
    if cid.startswith("c"):
        r = db().q("SELECT c.*, l.local FROM channels c JOIN iptv_lists l ON l.id = c.list_id WHERE c.id = ?", (cid,))
        if not r:
            raise HTTPException(404, "That channel isn't in your playlists anymore")
        return r[0]["url"], json.loads(r[0]["headers"]) if r[0]["headers"] else {}, bool(r[0]["local"])
    if cid.startswith("t"):
        hit = LIVE_RESOLVED.get(cid)
        if hit and time.time() - hit[0] < 600:
            return hit[1], hit[2], False
        try:
            mid = base64.urlsafe_b64decode(cid[1:] + "=" * (-len(cid[1:]) % 4)).decode()
        except Exception:
            raise HTTPException(404, "Unknown channel")
        for a in addon_rows():
            if not supports(a["m"], "stream", "tv", mid):
                continue
            try:
                j = await addon_call(a, "stream", "tv", mid, ttl=120, timeout=20)
            except Exception:
                continue
            sts = [x for x in (j.get("streams") or []) if isinstance(x, dict) and str(x.get("url") or "").startswith("http")]
            sts.sort(key=lambda x: 0 if "m3u8" in str(x["url"]).lower() else 1)
            if sts:
                hdr = (((sts[0].get("behaviorHints") or {}).get("proxyHeaders") or {}).get("request") or {})
                hdr = {str(k): str(v) for k, v in hdr.items()}
                LIVE_RESOLVED[cid] = (time.time(), sts[0]["url"], hdr)
                return sts[0]["url"], hdr, False
        raise HTTPException(404, "Nothing to play for that right now, it may not have started yet")
    raise HTTPException(404, "Unknown channel")


def lp_url(url, headers, local):
    tok = hashlib.sha1(f"{url}|{json.dumps(headers, sort_keys=True)}".encode()).hexdigest()[:24]
    if len(LP) > 20000:
        cut = time.time() - 3600
        for k in [k for k, v in LP.items() if v[3] < cut]:
            LP.pop(k, None)
        # Still too many (a feed with endless unique urls), the oldest go first. Dicts keep the order things went in
        while len(LP) > 15000:
            LP.pop(next(iter(LP)), None)
    LP[tok] = (url, headers, local, time.time())
    return f"/api/lp/{tok}"


def rewrite_m3u8(text, base, headers, local):
    out = []
    for line in text.splitlines():
        s = line.strip()
        if s and not s.startswith("#"):
            out.append(lp_url(urljoin(base, s), headers, local))
        elif 'URI="' in s:
            out.append(re.sub(r'URI="([^"]+)"', lambda m: f'URI="{lp_url(urljoin(base, m.group(1)), headers, local)}"', s))
        else:
            out.append(line)
    return "\n".join(out) + "\n"


async def live_open(url, headers, local):
    """Opens the source, following redirects, and says if its an HLS playlist"""
    client = httpx.AsyncClient(timeout=httpx.Timeout(15, read=30), follow_redirects=False, headers={"User-Agent": "Mozilla/5.0 Kino", **headers})
    try:
        for _ in range(6):
            u = urlparse(url)
            if u.scheme not in ("http", "https"):
                raise HTTPException(400, "That channel's link isn't http")
            r = await client.send(await pinned_request(client, "GET", url, local=local), stream=True)
            if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                await r.aclose()
                url = urljoin(url, r.headers["location"])
                continue
            return client, r, url
        raise HTTPException(502, "Too many redirects")
    except BaseException:
        await client.aclose()
        raise


def lp_type(ct):
    """Content types the live proxy hands on. Anything else (html, js, svg) would run on Kinos own origin, so its just bytes"""
    base = ct.split(";")[0].strip().lower()
    ok = base.startswith(("video/", "audio/", "image/jpeg", "image/png", "image/webp", "image/gif")) or base in (
        "application/vnd.apple.mpegurl", "application/x-mpegurl", "audio/mpegurl", "application/octet-stream",
        "application/mp4", "application/dash+xml", "text/vtt")
    return ct if ok else "application/octet-stream"


LIVE_ERR = {}  # channel id -> (when, what went wrong) the last time it wouldnt open, so the player can say why


@app.get("/api/live/{cid}/index.m3u8")
async def live_play(cid: str, request: Request, p=Depends(current_profile)):
    try:
        res = await live_play_inner(cid, request, p)
        await asyncio.to_thread(note_live_play, p["id"], cid)
        return res
    except HTTPException as e:
        LIVE_ERR[cid] = (time.time(), str(e.detail)[:200])
        if len(LIVE_ERR) > 500:
            LIVE_ERR.pop(next(iter(LIVE_ERR)), None)
        raise


LIVE_PLAYED = {}  # (profile, channel) -> when it was last counted


def note_live_play(pid, cid):
    """Channels people actually watch float to the top of the list. One count per profile and channel every 10 minutes, so retuning or a
    stream that restarts doesnt count again"""
    now = time.time()
    if now - LIVE_PLAYED.get((pid, cid), 0) < 600:
        return
    LIVE_PLAYED[(pid, cid)] = now
    row = db().q("SELECT name FROM channels WHERE id = ?", (cid,)) if cid.startswith("c") else None
    if row:
        db().q("INSERT INTO live_usage (name, plays, last) VALUES (?, 1, ?) ON CONFLICT(name) DO UPDATE SET plays = plays + 1, last = excluded.last", (row[0]["name"].lower(), now))


@app.get("/api/admin/live/filter")
async def live_filter_get(admin=Depends(require_admin)):
    counts = {r["junk"]: r["n"] for r in db().q("SELECT junk, COUNT(*) n FROM channels WHERE junk IS NOT NULL GROUP BY junk")}
    on = {r["value"] for r in db().q("SELECT value FROM live_filter WHERE kind = 'cat'")}
    return {"categories": [{"key": k, "label": v[0], "count": counts.get(k, 0), "on": k in on} for k, v in JUNK.items()],
            "words": [r["value"] for r in db().q("SELECT value FROM live_filter WHERE kind = 'word' ORDER BY value")]}


@app.put("/api/admin/live/filter")
async def live_filter_set(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    cats = [c for c in (b.get("cats") or []) if c in JUNK]
    words = []
    for w in (b.get("words") or [])[:50]:
        w = re.sub(r"\s+", " ", str(w)).strip().lower()[:40]
        if len(w) >= 2 and w not in words:
            words.append(w)
    db().q("DELETE FROM live_filter")
    for c in cats:
        db().q("INSERT INTO live_filter VALUES ('cat', ?)", (c,))
    for w in words:
        db().q("INSERT INTO live_filter VALUES ('word', ?)", (w,))
    log.info("kino live filter set by %s: %s, %d words", logsafe(admin), ",".join(cats) or "no kinds", len(words))
    return {"ok": True}


@app.get("/api/live/{cid}/why")
async def live_why(cid: str, p=Depends(current_profile)):
    hit = LIVE_ERR.get(cid)
    return {"why": hit[1] if hit and time.time() - hit[0] < 300 else ""}


async def live_play_inner(cid: str, request: Request, p):
    url, headers, local = await live_source(cid)
    client, r, final = await live_open(url, headers, local)
    try:
        LIVE["seen"] = time.time()
        if r.status_code != 200:
            live_strike(cid)
            raise HTTPException(502, f"The channel isn't working right now (it answered {r.status_code})")
        # A playlist says so in its first bytes, a raw video stream doesnt (and never ends, so its not read on)
        it = r.aiter_bytes()
        body = b""
        async for chunk in it:
            body += chunk
            if len(body) >= 16:
                break
        if "mpegurl" in r.headers.get("content-type", "").lower() or body.lstrip()[:7] == b"#EXTM3U":
            async for chunk in it:
                body += chunk
                if len(body) > 5 * 1024**2:
                    break
            if cid.startswith("c"):
                LIVE_STRIKES.pop(cid, None)
                db().q("UPDATE channels SET ok = 1, checked = ? WHERE id = ?", (time.time(), cid))
            return Response(rewrite_m3u8(body.decode("utf-8", errors="ignore"), final, headers, local), media_type="application/vnd.apple.mpegurl",
                            headers={"Cache-Control": "no-store"})
    finally:
        await r.aclose()
        await client.aclose()
    # Not HLS (a tuner or IPTV server sending one long MPEG-TS stream), ffmpeg turns it into HLS live
    sid = await live_ffmpeg(final, headers, request, p)
    return RedirectResponse(f"/api/hls/{sid}/index.m3u8", status_code=302)


async def live_ffmpeg(url, headers, request, p):
    owner = f"p{p['id']}"
    device = browser_key(request)
    if device.startswith("|"):
        device = client_ip(request) + device
    for sid, s in list(SESS.items()):
        if s["owner"] == owner and s.get("device") == device:
            kill_session(sid)
    if sum(1 for s in SESS.values() if s["owner"] == owner) >= PROFILE_DEVICES:
        raise HTTPException(429, f"This profile is already watching on {PROFILE_DEVICES} devices. Stop one of them, or use another profile")
    if len(SESS) >= MAX_FFMPEG:
        raise HTTPException(429, "Too many people are watching right now, try again in a minute")
    vcodec = None
    try:
        pr = await asyncio.wait_for(asyncio.create_subprocess_exec("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name",
                                                                   "-of", "csv=p=0", *FF_NET, *(["-headers", "".join(f"{k}: {v}\r\n" for k, v in headers.items())] if headers else []), url,
                                                                   stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL), 3)
        out_, _ = await asyncio.wait_for(pr.communicate(), 10)
        vcodec = out_.decode().strip().split("\n")[0] or None
    except Exception:
        pass
    vargs = ["-c:v", "copy"] if vcodec in (None, "h264", "hevc") else ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-vf", "scale=-2:'min(720,ih)'", "-pix_fmt", "yuv420p", "-g", "50", "-keyint_min", "50", "-sc_threshold", "0"]
    sid = secrets.token_hex(8)
    out = HLS_DIR / sid
    out.mkdir(parents=True)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-fflags", "+genpts+discardcorrupt", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
    if FF_INFO["burst"]:
        args += ["-readrate", "1"]  # real time, a source that sends faster than live (a recording) would run away from the player
    if headers:
        args += ["-headers", "".join(f"{k}: {v}\r\n" for k, v in headers.items())]
    args += [*FF_NET, "-i", url, "-map", "0:v:0?", "-map", "0:a:0?", *vargs, "-c:a", "aac", "-ac", "2", "-b:a", "160k", "-sn", "-dn",
             "-f", "hls", "-hls_time", "2", "-hls_list_size", "12", "-hls_flags", "delete_segments+independent_segments+omit_endlist",
             "-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", "init.mp4", "-hls_segment_filename", str(out / "seg%05d.m4s"), str(out / "index.m3u8")]
    errlog = open(out / "ffmpeg.log", "wb")
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=errlog)
    SESS[sid] = {"proc": proc, "dir": out, "owner": owner, "device": device, "fid": "live", "last": time.time(), "offset": 0, "live": True}
    pl = out / "index.m3u8"
    for _ in range(100):
        if pl.exists() and "#EXTINF" in pl.read_text(errors="ignore"):
            return sid
        if proc.returncode is not None:
            err = (out / "ffmpeg.log").read_text(errors="ignore")[-300:]
            kill_session(sid)
            raise HTTPException(502, f"The channel couldn't be opened: {err or 'ffmpeg stopped'}")
        await asyncio.sleep(0.2)
    kill_session(sid)
    raise HTTPException(504, "The channel took too long to start")


@app.get("/api/lp/{tok}")
async def live_proxy(tok: str, request: Request, p=Depends(current_profile)):
    hit = LP.get(tok)
    if not hit:
        raise HTTPException(404, "That stream link ran out, open the channel again")
    url, headers, local, _ = hit
    hdr = dict(headers)
    if request.headers.get("range"):
        hdr["Range"] = request.headers["range"]
    client, r, final = await live_open(url, hdr, local)
    ct = r.headers.get("content-type", "")
    if "mpegurl" in ct.lower() or urlparse(final).path.lower().endswith(".m3u8"):
        try:
            body = await r.aread()
        finally:
            await r.aclose()
            await client.aclose()
        if body.lstrip()[:7] == b"#EXTM3U":
            return Response(rewrite_m3u8(body.decode("utf-8", errors="ignore"), final, headers, local), media_type="application/vnd.apple.mpegurl", headers={"Cache-Control": "no-store"})
        return Response(body, media_type=lp_type(ct))
    out = {k: r.headers[k] for k in ("content-length", "content-range", "accept-ranges") if k in r.headers}
    out["Cache-Control"] = "no-store"

    async def body():
        try:
            async for chunk in r.aiter_bytes(128 * 1024):
                yield chunk
        finally:
            await r.aclose()
            await client.aclose()
    return StreamingResponse(body(), status_code=r.status_code, headers=out, media_type=lp_type(ct) if ct else "video/mp2t")


LIVE_THUMB_GATE = asyncio.Semaphore(3)


@app.get("/api/live/{cid}/thumb.jpg")
async def live_thumb(cid: str, p=Depends(current_profile)):
    """A small picture of whats on a channel right now, for the favourites. One frame grabbed by ffmpeg, kept 90 seconds"""
    if not re.fullmatch(r"[ct][\w-]{1,60}", cid):
        raise HTTPException(404, "Unknown channel")
    d = DATA_DIR / "livethumbs"
    d.mkdir(exist_ok=True)
    f = d / f"{cid}.jpg"
    if f.exists() and time.time() - f.stat().st_mtime < 90:
        return FileResponse(f, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=60"})
    async with LIVE_THUMB_GATE:
        if not (f.exists() and time.time() - f.stat().st_mtime < 90):
            url, headers, local = await live_source(cid)
            if not local:
                await check_host(urlparse(url).hostname)
            args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-rw_timeout", "8000000"]
            if headers:
                args += ["-headers", "".join(f"{k}: {v}\r\n" for k, v in headers.items())]
            args += [*FF_NET, "-i", url, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "6", str(f) + ".tmp.jpg"]
            try:
                proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
                await asyncio.wait_for(proc.wait(), 15)
                Path(str(f) + ".tmp.jpg").replace(f)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
                if not f.exists():
                    raise HTTPException(404, "No picture from that channel right now")
    return FileResponse(f, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=60"})


@app.post("/api/live/fav/{cid}")
async def live_fav_add(cid: str, p=Depends(current_profile)):
    row = db().q("SELECT name FROM channels WHERE id = ?", (cid[:40],))
    name = row[0]["name"].lower() if row else None
    db().q("INSERT OR REPLACE INTO live_fav (profile_id, cid, added, name) VALUES (?,?,?,?)", (p["id"], cid[:40], time.time(), name))
    if name:  # one favourite per channel name, whatever device or copy of the channel it was added from
        db().q("DELETE FROM live_fav WHERE profile_id = ? AND name = ? AND cid != ?", (p["id"], name, cid[:40]))
    return {"ok": True}


@app.delete("/api/live/fav/{cid}")
async def live_fav_remove(cid: str, p=Depends(current_profile)):
    row = db().q("SELECT name FROM channels WHERE id = ?", (cid[:40],)) or db().q("SELECT name FROM live_fav WHERE profile_id = ? AND cid = ?", (p["id"], cid[:40]))
    name = row[0]["name"].lower() if row and row[0]["name"] else None
    db().q("DELETE FROM live_fav WHERE profile_id = ? AND (cid = ? OR name = ?)", (p["id"], cid[:40], name))
    return {"ok": True}


# ---- recording live tv to the Storage Box. Each recording is ffmpeg saving the channel to an mp4 in
# kino-recordings (left out of the library scan), started and stopped by the worker below at the right times.
# Fragmented mp4 so whatever got saved still plays if it was cut off. Kept apart from films and shows on there own page
REC_DIR = MEDIA_DIR / "kino-recordings"
REC_PROCS = {}  # recording id -> ffmpeg process
REC_MAX = int(env("REC_MAX", "4"))


def rec_out(r):
    d = dict(r)
    d.pop("path", None)
    d["playable"] = r["state"] in ("recording", "done", "stopped") and bool(r["size"] or r["state"] == "recording")
    return d


async def rec_start(r):
    try:
        url, headers, local = await live_source(r["cid"])
        if urlparse(url).scheme not in ("http", "https"):
            raise HTTPException(400, "That channel's link isn't http")
        if not local:
            await check_host(urlparse(url).hostname)
    except Exception as e:
        db().q("UPDATE recordings SET state = 'failed', error = ? WHERE id = ?", (str(getattr(e, "detail", None) or e)[:200], r["id"]))
        return
    safe = re.sub(r"[^\w .()'-]", "", f"{r['channel']} - {r['title']}").strip()[:90] or f"Recording {r['id']}"
    when = datetime.datetime.fromtimestamp(r["start"]).strftime("%Y-%m-%d %H.%M")
    folder = REC_DIR / (re.sub(r"[^\w .()'-]", "", r["channel"]).strip().lstrip(". ")[:60] or "Channel")
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        db().q("UPDATE recordings SET state = 'failed', error = ? WHERE id = ?", (f"Couldn't write to the Storage Box: {e}"[:200], r["id"]))
        return
    path = folder / f"{safe} {when}.mp4"
    secs = max(60, int(r["stop"] - time.time()))
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-fflags", "+genpts+discardcorrupt", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "10"]
    if headers:
        args += ["-headers", "".join(f"{k}: {v}\r\n" for k, v in headers.items())]
    args += [*FF_NET, "-i", url, "-t", str(secs), "-map", "0:v:0?", "-map", "0:a:0?", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-af", "aresample=async=1000",
             "-f", "mp4", "-movflags", "+frag_keyframe+empty_moov+default_base_moof", str(path)]
    errlog = open(HLS_DIR / f"rec{r['id']}.log", "wb") if HLS_DIR.exists() else asyncio.subprocess.DEVNULL
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=errlog)
    REC_PROCS[r["id"]] = proc
    db().q("UPDATE recordings SET state = 'recording', path = ?, error = NULL WHERE id = ?", (str(path), r["id"]))
    log.info("recording %s from %s", path.name, r["channel"])

    async def wait():
        rc = await proc.wait()
        REC_PROCS.pop(r["id"], None)
        size = path.stat().st_size if path.exists() else 0
        cur = db().q("SELECT state FROM recordings WHERE id = ?", (r["id"],))
        if not cur:
            return
        state = cur[0]["state"]
        if state == "recording":
            state = "done" if size > 100_000 else "failed"
        err = None
        if state == "failed":
            try:
                err = (HLS_DIR / f"rec{r['id']}.log").read_text(errors="ignore")[-200:] or f"ffmpeg stopped ({rc})"
            except OSError:
                err = f"ffmpeg stopped ({rc})"
        db().q("UPDATE recordings SET state = ?, size = ?, error = COALESCE(?, error) WHERE id = ?", (state, size, err, r["id"]))
    asyncio.create_task(wait())


async def rec_worker():
    # Anything that was recording when Kino stopped keeps what it got
    for r in db().q("SELECT * FROM recordings WHERE state = 'recording'"):
        size = Path(r["path"]).stat().st_size if r["path"] and Path(r["path"]).exists() else 0
        db().q("UPDATE recordings SET state = ?, size = ?, error = ? WHERE id = ?", ("stopped" if size else "failed", size, "Kino restarted while this was recording", r["id"]))
    while True:
        try:
            now = time.time()
            for r in db().q("SELECT * FROM recordings WHERE state = 'scheduled' AND start <= ? ORDER BY start", (now + 15,)):
                try:
                    if r["stop"] is None or r["stop"] <= now:
                        db().q("UPDATE recordings SET state = 'failed', error = 'Missed, Kino was off' WHERE id = ?", (r["id"],))
                    elif len(REC_PROCS) >= REC_MAX:
                        db().q("UPDATE recordings SET state = 'failed', error = ? WHERE id = ?", (f"Already recording {REC_MAX} things", r["id"]))
                    else:
                        await rec_start(r)
                except Exception as e:
                    # One bad row cant be allowed to stop the others from recording
                    log.info("recording %s: %s", r["id"], e)
                    db().q("UPDATE recordings SET state = 'failed', error = ? WHERE id = ?", (str(e)[:200], r["id"]))
            for r in db().q("SELECT id, size, path FROM recordings WHERE state = 'recording'"):
                if r["path"] and Path(r["path"]).exists():
                    db().q("UPDATE recordings SET size = ? WHERE id = ?", (Path(r["path"]).stat().st_size, r["id"]))
        except Exception as e:
            log.info("recording worker: %s", e)
        await asyncio.sleep(15)


@app.post("/api/live/record")
async def rec_add(request: Request, p=Depends(current_profile)):
    if p.get("kids"):
        raise HTTPException(403, "Kids profiles can't record")
    b = await request.json()
    cid = str(b.get("cid") or "")[:40]
    if cid.startswith("c"):
        row = db().q("SELECT name FROM channels WHERE id = ?", (cid,))
        if not row:
            raise HTTPException(404, "Unknown channel")
        channel = row[0]["name"]
    elif cid.startswith("t"):
        channel = str(b.get("channel") or "Live")[:80]
    else:
        raise HTTPException(400, "That can't be recorded")
    now = time.time()
    try:
        start = float(b.get("start") or now)
        stop = float(b.get("stop") or 0) or start + 60 * float(b.get("minutes") or 60)
    except (TypeError, ValueError):
        raise HTTPException(400, "Those times aren't right")
    if not (math.isfinite(start) and math.isfinite(stop)):
        raise HTTPException(400, "Those times aren't right")
    if b.get("start"):
        start -= 120  # a couple of minutes either side, guides are often a bit out
        stop += 300
    start = max(now, start)
    if stop <= start or stop - start > 6 * 3600:
        raise HTTPException(400, "Recordings can be up to 6 hours")
    title = str(b.get("title") or "").strip()[:120]
    if not title and cid.startswith("c"):
        # Named after whats on when it starts, from the guide
        g = db().q("SELECT e.title FROM epg e JOIN channels c ON c.tvg = e.tvg WHERE c.id = ? AND e.start <= ? AND e.stop > ? LIMIT 1", (cid, start + 60, start + 60))
        title = g[0]["title"] if g else ""
    title = title or datetime.datetime.fromtimestamp(start).strftime("%d %b %H:%M")
    clash = db().q("SELECT 1 FROM recordings WHERE cid = ? AND state IN ('scheduled', 'recording') AND start < ? AND stop > ?", (cid, stop, start))
    if clash:
        raise HTTPException(409, "That's already being recorded")
    db().q("INSERT INTO recordings (profile_id, cid, channel, title, start, stop, state, created) VALUES (?,?,?,?,?,?, 'scheduled', ?)",
           (p["id"], cid, channel, title, start, stop, now))
    rid = db().q("SELECT id FROM recordings ORDER BY id DESC LIMIT 1")[0]["id"]
    if start <= now + 15:
        r = db().q("SELECT * FROM recordings WHERE id = ?", (rid,))[0]
        await rec_start(r)
    return {"ok": True, "id": rid, "now": start <= now + 15}


@app.get("/api/live/recordings")
async def rec_list(p=Depends(current_profile)):
    if p.get("kids"):
        return {"recordings": []}
    rows = db().q("SELECT * FROM recordings WHERE state != 'cancelled' ORDER BY CASE state WHEN 'recording' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, start DESC LIMIT 300")
    return {"recordings": [rec_out(r) for r in rows]}


@app.post("/api/live/recordings/{rid}/stop")
async def rec_stop(rid: int, request: Request, p=Depends(current_profile)):
    r = db().q("SELECT * FROM recordings WHERE id = ?", (rid,))
    if not r or (r[0]["profile_id"] != p["id"] and not admin_user(request)):
        raise HTTPException(404, "Unknown recording")
    if r[0]["state"] == "scheduled":
        db().q("UPDATE recordings SET state = 'cancelled' WHERE id = ?", (rid,))
    elif r[0]["state"] == "recording":
        db().q("UPDATE recordings SET state = 'stopped', stop = ? WHERE id = ?", (time.time(), rid))
        proc = REC_PROCS.get(rid)
        if proc and proc.returncode is None:
            # q tells ffmpeg to finish up properly instead of being killed mid write
            try:
                proc.terminate()
            except ProcessLookupError:
                pass
    return {"ok": True}


@app.delete("/api/live/recordings/{rid}")
async def rec_delete(rid: int, request: Request, p=Depends(current_profile)):
    r = db().q("SELECT * FROM recordings WHERE id = ?", (rid,))
    if not r or (r[0]["profile_id"] != p["id"] and not admin_user(request)):
        raise HTTPException(404, "Unknown recording")
    proc = REC_PROCS.get(rid)
    if proc and proc.returncode is None:
        proc.kill()
    if r[0]["path"]:
        Path(r[0]["path"]).unlink(missing_ok=True)
    db().q("DELETE FROM recordings WHERE id = ?", (rid,))
    return {"ok": True}


@app.get("/api/live/recordings/{rid}/file")
async def rec_file(rid: int, request: Request, p=Depends(current_profile)):
    r = db().q("SELECT * FROM recordings WHERE id = ?", (rid,))
    if not r or not r[0]["path"] or not Path(r[0]["path"]).exists() or p.get("kids"):
        raise HTTPException(404, "That recording isn't there anymore")
    return range_response(r[0]["path"], request, download_name=Path(r[0]["path"]).name if request.query_params.get("save") else None)


@app.post("/api/live/{cid}/bad")
async def live_bad(cid: str, p=Depends(current_profile)):
    # The player says a channel didnt work. That isnt taken as true on its own: the channel gets checked here, and only a channel that
    # fails the check is switched off (one that answers is marked as working again)
    LIVE_RESOLVED.pop(cid, None)
    row = db().q("SELECT * FROM channels WHERE id = ?", (cid,)) if cid.startswith("c") else None
    ok = None
    if row:
        try:
            ok = await asyncio.wait_for(check_channel(dict(row[0])), 40)
        except Exception:
            ok = None
    return {"ok": True, "working": ok}


# ---- embed sources: services that hand out a JSON list (channels, events) with a player page for each, the way a
# lot of free live tv sites do. Kino reads the list and opens the player page in a locked down frame: no popups, no
# sending you to another page, no reading Kino's cookies. Only https player pages. These cant go through Kino's own
# player (the video is inside someone elses page), so they have there own full screen view with previous and next
EMBED_CACHE = {}  # source id -> (when, items)
EMBED_TITLE = ("title", "name", "channel_name", "event", "match", "label")
EMBED_IMG = ("thumbnail", "logo_url", "logo", "poster", "image", "img", "icon", "homeTeamImage")
EMBED_CAT = ("sport", "league", "category", "group", "genre", "type")
EMBED_PLAYER = ("playerUrl", "player_url", "embedUrl", "embed_url", "embed", "iframe", "url", "link")


def jpath(x, path):
    """data.events.0.title style lookups into JSON, a missing step gives None"""
    for k in [k for k in str(path or "").strip().strip(".").split(".") if k]:
        if isinstance(x, list):
            x = x[int(k)] if k.lstrip("-").isdigit() and -len(x) <= int(k) < len(x) else None
        elif isinstance(x, dict):
            x = x.get(k)
        else:
            return None
    return x


def fill_template(tmpl, it, base, quote_values=True):
    """Puts an item's fields into a link: {id}, {channels.0.channel_id}, {playerUrl}, {base} is the list's site"""
    def one(m):
        key = m.group(1)
        if key == "base":
            u = urlparse(base)
            return f"{u.scheme}://{u.netloc}"
        v = jpath(it, key)
        if v is None:
            raise KeyError(key)
        v = str(v)
        # A whole link or a path dropped in as is, a plain value (an id, a name) gets made safe for a link
        return v if (not quote_values or v.startswith(("http://", "https://", "/")) or m.start() == 0) else quote(v, safe="")
    try:
        return re.sub(r"\{([\w.-]+)\}", one, tmpl)
    except KeyError:
        return None


def embed_items(j, src):
    """Finds the playable things in whatever shape the service's JSON is: a list, {events: [...]}, {data: [...]},
    or a schedule of days and categories with events inside. The admin can also say exactly where the list is
    (items, like data.events), which field is the title and picture, and build the player link from any field"""
    base, tmpl, out = src["url"], src["player"] or "", []
    tkey, ikey = src.get("title_key") or "", src.get("image_key") or ""
    if src.get("items"):
        got = jpath(j, src["items"])
        j = got if isinstance(got, list) else []

    def absolute(u, own=False):
        u = str(u or "").strip()
        if not u:
            return None
        # A link the admin typed in themselves is used as it is, even without https:// in front. It never gets the
        # list's own address stuck on the front, only a path starting with / is taken as being on the list's site
        if own and not u.startswith(("http://", "https://", "/")) and re.match(r"[\w-]+(\.[\w-]+)+(:\d+)?([/?#]|$)", u):
            return "https://" + u
        return urljoin(base, u)

    def item(it, cat):
        title = str(jpath(it, tkey) or "") if tkey else next((str(it[k]) for k in EMBED_TITLE if it.get(k)), "")
        if not title:
            return None
        chans = [c for c in it.get("channels") or [] if isinstance(c, dict)]
        cid = str(it.get("id") or it.get("channel_id") or (chans[0].get("channel_id") or chans[0].get("id") if chans else "") or it.get("slug") or "")
        if tmpl:
            # The admin's own link, any field of the item can go in it
            ctx = {**it, "id": it.get("id") if it.get("id") is not None else cid, "slug": it.get("slug") or cid, "title": title}
            player = fill_template(tmpl, ctx, base)
        else:
            player = next((it[k] for k in EMBED_PLAYER if isinstance(it.get(k), str) and it.get(k)), None)
        player = absolute(player, own=bool(tmpl)) if player else None
        if not player or urlparse(player).scheme not in ("https", "http"):
            return None
        img_ = (jpath(it, ikey) if ikey else None) or next((it[k] for k in EMBED_IMG if isinstance(it.get(k), str) and it.get(k)), None) or (chans[0].get("logo_url") if chans else None)
        img_ = img_ if isinstance(img_, str) else None
        status = str(it.get("status") or "")
        when = " ".join(str(it[k]) for k in ("date", "time") if it.get(k))
        return {"id": "e" + hashlib.sha1(player.encode()).hexdigest()[:14], "title": unesc(title)[:120], "image": https_url(absolute(img_)) if img_ else None,
                "category": str(next((it[k] for k in EMBED_CAT if it.get(k)), cat or ""))[:40], "status": status[:20],
                "live": status.lower() in ("live", "in play", "inplay", "1h", "2h", "ht") or it.get("live") is True,
                "when": when[:40], "score": str(it.get("score") or "")[:20] or None, "player": player}

    def walk(x, cat=None, depth=0):
        if depth > 5:
            return
        if isinstance(x, list):
            for it in x:
                if isinstance(it, dict) and any(it.get(k) for k in EMBED_TITLE):
                    got = item(it, cat)
                    if got:
                        out.append(got)
                else:
                    walk(it, cat, depth + 1)
        elif isinstance(x, dict):
            for k, v in x.items():
                if isinstance(v, (list, dict)):
                    walk(v, cat if k in ("events", "channels", "data", "items", "results", "list") else k, depth + 1)
    if src.get("items") and isinstance(j, list):
        for it in j:
            if isinstance(it, dict):
                got = item(it, None)
                if got:
                    out.append(got)
    else:
        walk(j)
    seen, uniq = set(), []
    for x in out:
        if x["id"] not in seen:
            seen.add(x["id"])
            uniq.append(x)
    # Whats live now first, then the rest in the order the service gave
    uniq.sort(key=lambda x: not x["live"])
    return uniq


async def embed_list(src, fresh=False):
    hit = EMBED_CACHE.get(src["id"])
    if hit and not fresh and time.time() - hit[0] < 90:
        return hit[1]
    try:
        raw, _ = await live_get(src["url"], max_bytes=20 * 1024**2, timeout=30)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Couldn't read that link: {type(e).__name__} {str(e)[:120]}")
    try:
        j = json.loads(raw)
    except Exception:
        raise HTTPException(502, "That link didn't send JSON")
    items = await asyncio.to_thread(embed_items, j, dict(src))
    EMBED_CACHE[src["id"]] = (time.time(), items)
    return items


@app.get("/api/live/embeds")
async def live_embeds(p=Depends(current_profile)):
    if p.get("kids"):
        return {"sources": []}
    return {"sources": [{"id": r["id"], "name": r["name"]} for r in db().q("SELECT id, name FROM embed_sources WHERE enabled = 1 ORDER BY id")]}


@app.get("/api/live/embed/{eid}")
async def live_embed(eid: int, p=Depends(current_profile)):
    if p.get("kids"):
        raise HTTPException(404, "Not on this profile")
    r = db().q("SELECT * FROM embed_sources WHERE id = ? AND enabled = 1", (eid,))
    if not r:
        raise HTTPException(404, "Unknown source")
    try:
        items = await embed_list(r[0])
        db().q("UPDATE embed_sources SET error = NULL WHERE id = ?", (eid,))
    except Exception as e:
        db().q("UPDATE embed_sources SET error = ? WHERE id = ?", (str(getattr(e, "detail", None) or e)[:200], eid))
        raise HTTPException(502, f"{r[0]['name']} didn't answer")
    return {"name": r[0]["name"], "items": items[:300]}


def clean_link(u):
    # Pasted links sometimes carry invisible characters or a capital H, those come off
    return re.sub(r"[\s\u200b-\u200d\ufeff]+", "", str(u or "")).strip()


def embed_form(b):
    url = clean_link(b.get("url"))
    if url.lower().startswith(("https://", "http://")):
        url = url[:url.index("://")].lower() + url[url.index("://"):]
    if not url.startswith(("https://", "http://")):
        raise HTTPException(400, "The list link has to start with https://")
    return {"id": 0, "url": url, "player": clean_link(b.get("player")).replace("%7B", "{").replace("%7D", "}"),
            "items": str(b.get("items") or "").strip()[:120], "title_key": str(b.get("title_key") or "").strip()[:80],
            "image_key": str(b.get("image_key") or "").strip()[:80]}


@app.post("/api/admin/embeds/test")
async def embed_test(request: Request, admin=Depends(require_admin)):
    """Reads the list with these settings and shows what came out, without saving anything. Also shows the start of
    the JSON and the fields of the first item, so its easy to see what to put in the boxes"""
    src = embed_form(await request.json())
    try:
        raw, _ = await live_get(src["url"], max_bytes=20 * 1024**2, timeout=30)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Couldn't read that link: {type(e).__name__} {str(e)[:120]}")
    try:
        j = json.loads(raw)
    except Exception:
        raise HTTPException(400, "That link didn't send JSON")
    items = embed_items(j, src)
    arr = jpath(j, src["items"]) if src["items"] else None
    first = arr[0] if isinstance(arr, list) and arr else None
    if first is None:
        def find(x, d=0):
            if d > 5:
                return None
            if isinstance(x, list):
                for it in x:
                    if isinstance(it, dict):
                        return it
                    f = find(it, d + 1)
                    if f:
                        return f
            elif isinstance(x, dict):
                for v in x.values():
                    if isinstance(v, (list, dict)):
                        f = find(v, d + 1)
                        if f:
                            return f
            return None
        first = find(j)
    def keys(x, pre="", d=0):
        out = []
        if isinstance(x, dict) and d < 3:
            for k, v in list(x.items())[:30]:
                out += keys(v, f"{pre}{k}.", d + 1) if isinstance(v, (dict, list)) else [f"{pre}{k}"]
        elif isinstance(x, list) and x and d < 3:
            out += keys(x[0], f"{pre}0.", d + 1)
        return out
    top = list(j.keys())[:20] if isinstance(j, dict) else ["(a list)"]
    return {"count": len(items), "items": [{"title": x["title"], "player": x["player"], "image": x["image"]} for x in items[:5]],
            "top": top, "fields": keys(first)[:40] if first else []}


@app.post("/api/admin/embeds")
async def embed_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    src = embed_form(b)
    name = str(b.get("name") or "").strip()[:60] or urlparse(src["url"]).hostname
    items = await embed_list(src, fresh=True)
    if not items:
        raise HTTPException(400, "Kino read that list but found nothing it could play. Press Test to see what's in it and fill in where the list is and the player link")
    db().q("INSERT INTO embed_sources (name, url, player, enabled, added, items, title_key, image_key) VALUES (?,?,?,1,?,?,?,?)",
           (name, src["url"], src["player"] or None, time.time(), src["items"] or None, src["title_key"] or None, src["image_key"] or None))
    EMBED_CACHE.pop(0, None)
    return {"ok": True, "count": len(items), "sample": [x["title"] for x in items[:3]]}


@app.put("/api/admin/embeds/{eid}")
async def embed_edit(eid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if "enabled" in b:
        db().q("UPDATE embed_sources SET enabled = ? WHERE id = ?", (1 if b["enabled"] else 0, eid))
    return {"ok": True}


@app.delete("/api/admin/embeds/{eid}")
async def embed_remove(eid: int, admin=Depends(require_admin)):
    db().q("DELETE FROM embed_sources WHERE id = ?", (eid,))
    EMBED_CACHE.pop(eid, None)
    return {"ok": True}


@app.get("/api/admin/live")
async def live_admin(admin=Depends(require_admin)):
    rows = db().q("SELECT * FROM iptv_lists ORDER BY id")
    stats = {r["list_id"]: dict(r) for r in db().q("SELECT list_id, COUNT(*) n, SUM(ok = 1) good, SUM(ok = 0) bad, "
                                                   "SUM(EXISTS (SELECT 1 FROM epg e WHERE e.tvg = channels.tvg)) guided FROM channels GROUP BY list_id")}
    return {"lists": [{**dict(r), "good": (stats.get(r["id"]) or {}).get("good") or 0, "bad": (stats.get(r["id"]) or {}).get("bad") or 0,
                       "guided": (stats.get(r["id"]) or {}).get("guided") or 0} for r in rows],
            "guides": [{"name": f"Free guide: {n}", "url": u} for n, u in (("UK", AUTO_GUIDES["uk"]), ("USA", AUTO_GUIDES["us"]), ("France", AUTO_GUIDES["fr"]), ("Germany", AUTO_GUIDES["de"]), ("Canada", AUTO_GUIDES["ca"]), ("Australia", AUTO_GUIDES["au"]))],
            "embeds": [dict(r) for r in db().q("SELECT * FROM embed_sources ORDER BY id")],
            "guide_rows": db().q("SELECT COUNT(*) n FROM epg")[0]["n"], "checking": LIVE["checking"]}


@app.post("/api/admin/live")
async def live_admin_add(request: Request, admin=Depends(require_admin)):
    b = await request.json()
    url = str(b.get("url") or "").strip()
    epg = str(b.get("epg") or "").strip() or None
    if not re.match(r"^https?://", url) or (epg and not re.match(r"^https?://", epg)):
        raise HTTPException(400, "Links have to start with http:// or https://")
    host = urlparse(url).hostname or ""
    try:
        local = bool(b.get("local")) or not ip_is_public(socket.gethostbyname(host))
    except Exception:
        local = bool(b.get("local"))
    name = str(b.get("name") or "").strip()[:60] or host
    db().q("INSERT INTO iptv_lists (name, url, epg, local, enabled, added) VALUES (?,?,?,?,1,?)", (name, url, epg, 1 if local else 0, time.time()))
    row = db().q("SELECT * FROM iptv_lists ORDER BY id DESC LIMIT 1")[0]
    await refresh_list(row)
    asyncio.create_task(check_channels())
    r = db().q("SELECT count, error FROM iptv_lists WHERE id = ?", (row["id"],))[0]
    return {"ok": True, "count": r["count"], "error": r["error"]}


@app.post("/api/admin/live/{lid}/refresh")
async def live_admin_refresh(lid: int, admin=Depends(require_admin)):
    row = db().q("SELECT * FROM iptv_lists WHERE id = ?", (lid,))
    if not row:
        raise HTTPException(404, "Unknown playlist")
    await refresh_list(row[0])
    db().q("UPDATE channels SET checked = NULL WHERE list_id = ?", (lid,))
    asyncio.create_task(check_channels())
    return {"ok": True}


@app.put("/api/admin/live/{lid}")
async def live_admin_edit(lid: int, request: Request, admin=Depends(require_admin)):
    b = await request.json()
    if "enabled" in b:
        db().q("UPDATE iptv_lists SET enabled = ? WHERE id = ?", (1 if b["enabled"] else 0, lid))
    if "epg" in b:
        epg = str(b.get("epg") or "").strip() or None
        db().q("UPDATE iptv_lists SET epg = ?, refreshed = NULL WHERE id = ?", (epg, lid))
    return {"ok": True}


@app.delete("/api/admin/live/{lid}")
async def live_admin_remove(lid: int, admin=Depends(require_admin)):
    db().q("DELETE FROM iptv_lists WHERE id = ?", (lid,))
    db().q("DELETE FROM channels WHERE list_id = ?", (lid,))
    return {"ok": True}


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
