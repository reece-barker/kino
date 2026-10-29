#!/usr/bin/env python3
# Checks the storage box mount every minute and reconnects it if its gone or frozen
# Runs as root from kino-watchdog.timer, writes a small status file the dashboard shows on the Server page
import json
import os
import subprocess
import time
from pathlib import Path

MOUNT = "/srv/torbox"
STATUS = Path("/var/lib/kino-watchdog/status.json")


def responsive():
    # A frozen sshfs mount makes stat hang forever, so it gets 15 seconds and is left behind if it hangs
    if not os.path.ismount(MOUNT):
        return False
    p = subprocess.Popen(["stat", "-t", MOUNT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        return p.wait(timeout=15) == 0
    except subprocess.TimeoutExpired:
        p.kill()
        return False


def remount():
    subprocess.run(["umount", "-l", MOUNT], capture_output=True, timeout=30)
    r = subprocess.run(["mount", MOUNT], capture_output=True, text=True, timeout=60)
    return r.returncode == 0, (r.stderr or r.stdout).strip()[:300]


def main():
    STATUS.parent.mkdir(parents=True, exist_ok=True)
    try:
        st = json.loads(STATUS.read_text())
    except Exception:
        st = {"remounts": 0}
    now = time.time()
    st["last_check"] = now
    if responsive():
        st["ok"] = True
        st["last_error"] = None
    else:
        ok, err = remount()
        ok = ok and responsive()
        st["ok"] = ok
        st["remounts"] = st.get("remounts", 0) + 1
        st["last_remount"] = now
        st["last_error"] = None if ok else (err or "Mount failed")
        print("remounted" if ok else f"remount failed: {err}", flush=True)
    tmp = STATUS.with_suffix(".tmp")
    tmp.write_text(json.dumps(st))
    tmp.chmod(0o644)
    tmp.replace(STATUS)


if __name__ == "__main__":
    main()
