#!/usr/bin/env python3
# Turns the allow list from the Kino settings page into the nginx ip lock, runs as root
# The dashboard itself cant touch nginx, it only writes a json file and this checks every entry before using it
import ipaddress
import json
import shutil
import subprocess
import time
from pathlib import Path

SRC = Path("/var/lib/kino/allowlist.json")
DEST = Path("/etc/nginx/snippets/kino-allow.conf")
APPLIED = Path("/var/lib/kino/allowlist-applied.json")


def report(ok, count=0, error=None):
    APPLIED.write_text(json.dumps({"ok": ok, "count": count, "error": error, "applied_at": time.time()}))
    APPLIED.chmod(0o644)


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
