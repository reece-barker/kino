#!/usr/bin/env python3
"""Builds the app icons from app/static/icon.svg.

Run with the kino venv (it has playwright + chromium):
  ~/.venvs/kino/bin/python build/make-icons.py
Needs macOS sips + iconutil. Writes into desktop/build/.
"""
import math
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent.parent / "app" / "static" / "icon.svg"
OUT = HERE


def squircle_path(n=5.0, steps=360):
    # superellipse in 512 space, close to the Apple icon shape
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        c, s = math.cos(t), math.sin(t)
        x = 256 + 256 * math.copysign(abs(c) ** (2 / n), c)
        y = 256 + 256 * math.copysign(abs(s) ** (2 / n), s)
        pts.append(f"{x:.2f} {y:.2f}")
    return "M" + " L".join(pts) + " Z"


def master_svg():
    inner = SRC.read_text()
    # drop the svg wrapper and the baked in rounded corners, the squircle does the shaping
    body = re.sub(r"^<svg[^>]*>", "", inner.strip())
    body = re.sub(r"</svg>\s*$", "", body)
    body = body.replace('rx="112"', 'rx="0"')
    size = 824  # ~10% transparent margin on a 1024 canvas
    off = (1024 - size) / 2
    k = size / 512
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs>
<clipPath id="sq"><path d="{squircle_path()}"/></clipPath>
<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/></filter>
</defs>
<g filter="url(#sh)"><path transform="translate({off} {off}) scale({k})" d="{squircle_path()}" fill="#08080c"/></g>
<g transform="translate({off} {off}) scale({k})"><g clip-path="url(#sq)">{body}</g></g>
</svg>"""


def render(svg_text, png_path):
    from playwright.sync_api import sync_playwright

    html = f"<html><body style='margin:0;background:transparent'>{svg_text}</body></html>"
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1024, "height": 1024})
        pg.set_content(html)
        pg.screenshot(path=str(png_path), omit_background=True)
        b.close()


def dmg_background():
    # 660x400 window, app icon sits at x=180 and Applications at x=480, y=190
    html = """<html><body style='margin:0;width:660px;height:400px;background:
      radial-gradient(500px 300px at 0% 100%, rgba(238,63,82,.28), transparent 70%),
      radial-gradient(500px 300px at 100% 0%, rgba(48,68,162,.35), transparent 70%), #08080c;
      font-family:-apple-system,Helvetica,sans-serif;color:#fff;position:relative;overflow:hidden'>
      <div style='position:absolute;top:34px;width:100%;text-align:center;font-size:15px;color:#a1a1a6'>Drag Kino to Applications</div>
      <svg style='position:absolute;left:290px;top:172px' width='80' height='36' viewBox='0 0 80 36'><path d='M4 18H70M56 6l14 12-14 12' fill='none' stroke='#6e6e73' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>
      </body></html>"""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        for scale, name in ((1, "background.png"), (2, "background@2x.png")):
            pg = b.new_page(viewport={"width": 660, "height": 400}, device_scale_factor=scale)
            pg.set_content(html)
            pg.screenshot(path=str(OUT / name))
        b.close()


def sips(src, dst, px):
    subprocess.run(["sips", "-z", str(px), str(px), str(src), "--out", str(dst)],
                   check=True, stdout=subprocess.DEVNULL)


def make_ico(pngs, dst):
    # png-in-ico, vista and later read this fine
    data = [p.read_bytes() for p in pngs]
    sizes = [int(p.stem.split("-")[-1]) for p in pngs]
    head = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries = b""
    for sz, d in zip(sizes, data):
        w = 0 if sz >= 256 else sz
        entries += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(d), offset)
        offset += len(d)
    dst.write_bytes(head + entries + b"".join(data))


def main():
    svg = master_svg()
    (OUT / "icon-master.svg").write_text(svg)
    master = OUT / "icon-1024.png"
    render(svg, master)

    iconset = OUT / "icon.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()
    for base in (16, 32, 128, 256, 512):
        sips(master, iconset / f"icon_{base}x{base}.png", base)
        sips(master, iconset / f"icon_{base}x{base}@2x.png", base * 2)
    subprocess.run(["iconutil", "--convert", "icns", str(iconset), "--output", str(OUT / "icon.icns")], check=True)

    # linux png + windows ico (windows wants the flat full bleed look, so use the masters as is)
    sips(master, OUT / "icon.png", 512)
    tmp = OUT / "ico-tmp"
    tmp.mkdir(exist_ok=True)
    pngs = []
    for px in (16, 32, 48, 64, 128, 256):
        p = tmp / f"w-{px}.png"
        sips(master, p, px)
        pngs.append(p)
    make_ico(pngs, OUT / "icon.ico")
    shutil.rmtree(tmp)
    dmg_background()
    print("ok")


if __name__ == "__main__":
    sys.exit(main())
