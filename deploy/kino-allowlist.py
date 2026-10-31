#!/usr/bin/env python3
# Turns the allow list from the Kino settings page into the nginx ip lock, runs as root
# The dashboard itself cant touch nginx, it only writes a json file and this checks every entry before using it
import ipaddress
import json
import os
import secrets
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path

SRC = Path("/var/lib/kino/allowlist.json")
DEST = Path("/etc/nginx/snippets/kino-allow.conf")
APPLIED = Path("/var/lib/kino/allowlist-applied.json")


def write_safe(path, text):
    # The folder belongs to the kino user but this runs as root, so a plain write could be pointed at any file on the
    # vps with a symlink. This writes a brand new temp file (never follows a link) and swaps it in, and says no if the
    # real name is a symlink. Mode is 644 and not 640 because the file is owned by root and the dashboard has to read it
    folder, name = os.path.dirname(str(path)), os.path.basename(str(path))
    dfd = os.open(folder, os.O_RDONLY | os.O_DIRECTORY)
    try:
        try:
            if stat.S_ISLNK(os.lstat(name, dir_fd=dfd).st_mode):
                raise OSError(f"{path} is a symlink, not writing to it")
        except FileNotFoundError:
            pass
        tmp = f".{name}.{os.getpid()}.{secrets.token_hex(6)}.tmp"
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644, dir_fd=dfd)
        try:
            with os.fdopen(fd, "w") as f:
                f.write(text)
                f.flush()
                os.fchmod(f.fileno(), 0o644)
            os.replace(tmp, name, src_dir_fd=dfd, dst_dir_fd=dfd)
        except BaseException:
            try:
                os.unlink(tmp, dir_fd=dfd)
            except OSError:
                pass
            raise
    finally:
        os.close(dfd)


def report(ok, count=0, error=None):
    try:
        write_safe(APPLIED, json.dumps({"ok": ok, "count": count, "error": error, "applied_at": time.time()}))
    except OSError as e:
        # The result is in the journal at least, the dashboard just wont see it
        print(f"couldnt write {APPLIED}: {e} (ok={ok}, error={error})", file=sys.stderr, flush=True)


def main():
    try:
        entries = json.loads(SRC.read_text()).get("entries", [])
    except Exception as e:
        return report(False, error=f"Couldnt read the list: {e}")
    nets = []
    for e in entries:
        try:
            n = ipaddress.ip_network(str(e.get("cidr", "")), strict=False)
        except ValueError:
            continue
        # Same limits as the dashboard, never opens it up to huge ranges even if the json was edited by hand
        if (n.version == 4 and n.prefixlen < 8) or (n.version == 6 and n.prefixlen < 32):
            continue
        nets.append(n)
    if not nets:
        return report(False, error="The list is empty, kept the old nginx list so nobody gets locked out")
    lines = ["# Written by kino-allowlist from the Kino settings page, edit it there instead of here"]
    lines += [f"allow {n};" for n in nets] + ["deny all;", ""]
    backup = DEST.with_suffix(".bak")
    if DEST.exists():
        shutil.copy2(DEST, backup)
    DEST.write_text("\n".join(lines))
    t = subprocess.run(["nginx", "-t"], capture_output=True, text=True)
    if t.returncode != 0:
        if backup.exists():
            shutil.copy2(backup, DEST)
        return report(False, error="nginx config test failed, kept the old list")
    subprocess.run(["systemctl", "reload", "nginx"], check=False)
    report(True, count=len(nets))
    print(f"applied {len(nets)} entries", flush=True)


if __name__ == "__main__":
    main()
