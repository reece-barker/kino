"""Reads XMLTV guides for kino in its own process, so a big guide (the US one is about 300 MB) doesnt slow the
server down. python guide_parse.py channels FILE prints {guide id: [names]}, python guide_parse.py progs FILE
WANT.json prints the programmes for the guide ids in WANT.json, 2 hours back to 36 hours ahead"""
import datetime
import gzip
import io
import json
import os
import sys
import time
import xml.etree.ElementTree as ET


def read(path):
    raw = open(path, "rb").read()
    return gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw


def xmltv_time(t):
    try:
        return datetime.datetime.strptime(t[:20].strip(), "%Y%m%d%H%M%S %z").timestamp()
    except ValueError:
        try:
            return datetime.datetime.strptime(t[:14], "%Y%m%d%H%M%S").replace(tzinfo=datetime.timezone.utc).timestamp()
        except ValueError:
            return None


def channels(raw):
    out = {}
    for _, el in ET.iterparse(io.BytesIO(raw), events=("end",)):
        if el.tag == "channel":
            out[el.get("id")] = [d.text or "" for d in el.findall("display-name")]
            el.clear()
        elif el.tag == "programme":
            el.clear()
    return out


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
