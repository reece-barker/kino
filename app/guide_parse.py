"""Reads XMLTV guides for kino in its own process, so a big guide (the US one is about 300 MB) doesnt slow the
server down. python guide_parse.py channels FILE prints {guide id: [names]}, python guide_parse.py progs FILE
WANT.json prints the programmes for the guide ids in WANT.json, 2 hours back to 36 hours ahead"""
import datetime
import gzip
import io
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET


def read(path):
    raw = open(path, "rb").read()
    return gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw


TIME_RE = re.compile(r"^\s*(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?\s*(?:(Z|UTC|GMT)|([+-])(\d{2}):?(\d{2})?)?")


def xmltv_time(t):
    """XMLTV times are 20261030203000 +0100, but guides in the wild also write +01:00, +01, no space before the offset, Z or
    no offset at all (that one is UTC). Anything that doesnt read as a time is None"""
    m = TIME_RE.match(t or "")
    if not m:
        return None
    y, mo, d, h, mi, se = (int(x or 0) for x in m.groups()[:6])
    off = 0
    if m.group(8):
        off = (int(m.group(9)) * 3600 + int(m.group(10) or 0) * 60) * (1 if m.group(8) == "+" else -1)
    try:
        return datetime.datetime(y, mo, d, h, mi, se, tzinfo=datetime.timezone(datetime.timedelta(seconds=off))).timestamp()
    except ValueError:
        return None


def channels(raw):
    """{guide id: [names]} and how many programmes each id has, so when two ids share a name the one with data wins"""
    out, count = {}, {}
    for _, el in ET.iterparse(io.BytesIO(raw), events=("end",)):
        if el.tag == "channel":
            out[el.get("id")] = [d.text or "" for d in el.findall("display-name")]
            el.clear()
        elif el.tag == "programme":
            count[el.get("channel")] = count.get(el.get("channel"), 0) + 1
            el.clear()
    return {"names": out, "count": count}


def progs(raw, want):
    now, rows = time.time(), []
    lo, hi = now - 7200, now + 36 * 3600
    for _, el in ET.iterparse(io.BytesIO(raw), events=("end",)):
        if el.tag != "programme":
            if el.tag == "channel":
                el.clear()
            continue
        ch = el.get("channel")
        if ch in want:
            a, b = xmltv_time(el.get("start") or ""), xmltv_time(el.get("stop") or "")
            if a and b and b > lo and a < hi:
                rows.append((ch, a, b, (el.findtext("title") or "")[:200], (el.findtext("sub-title") or "")[:200], (el.findtext("desc") or "")[:600]))
        el.clear()
    return rows


if __name__ == "__main__":
    os.nice(10)
    if sys.argv[1] == "channels":
        json.dump(channels(read(sys.argv[2])), sys.stdout)
    else:
        json.dump(progs(read(sys.argv[2]), set(json.load(open(sys.argv[3])))), sys.stdout)
