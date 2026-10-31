#!/usr/bin/env python3
# Checks the storage box mount every minute and reconnects it if its gone or frozen
# Runs as root from kino-watchdog.timer, writes a small status file the dashboard shows on the Server page
import json
import os
import re
import signal
import subprocess
import time
from pathlib import Path

MOUNT = "/srv/torbox"
STATUS = Path("/var/lib/kino-watchdog/status.json")


def is_mounted(mount=MOUNT, info="/proc/self/mountinfo"):
    # Reads the kernels mount list instead of os.path.ismount, because ismount does an lstat on the mount and that hangs
    # forever on a frozen sshfs. This never touches the mount its self. Field 5 is the mount point, with spaces and
    # such written as octal escapes like \040
    try:
        with open(info) as f:
            for line in f:
                parts = line.split(" ", 5)
                if len(parts) > 4 and re.sub(r"\\([0-7]{3})", lambda m: chr(int(m.group(1), 8)), parts[4]) == mount:
                    return True
    except OSError:
        pass
    return False


def responsive():
    # A frozen sshfs mount makes stat hang forever, so it gets 15 seconds and is left behind if it hangs.
    # Its the only thing that touches the mount, and it runs in its own session so the whole group can be killed
    if not is_mounted():
        return False
    p = subprocess.Popen(["stat", "-t", MOUNT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        return p.wait(timeout=15) == 0
    except subprocess.TimeoutExpired:
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except OSError:
            pass
        # A process stuck on a dead mount cant always be killed until the mount is gone, so dont wait for it for long
        try:
            p.wait(timeout=2)
        except subprocess.TimeoutExpired:
            pass
        return False


def remount():
    subprocess.run(["umount", "-l", MOUNT], capture_output=True, timeout=30)
    # Through systemd's own mount unit (made from the fstab line), so sshfs belongs to that and not to this short job.
    # Plain mount is the fallback for a box without one
    unit = subprocess.run(["systemd-escape", "-p", "--suffix=mount", MOUNT], capture_output=True, text=True).stdout.strip()
    r = subprocess.run(["systemctl", "restart", unit], capture_output=True, text=True, timeout=90) if unit else None
    if r is None or r.returncode != 0:
        r = subprocess.run(["mount", MOUNT], capture_output=True, text=True, timeout=60)
    # Waits a moment and checks again, so a mount that drops straight away counts as failed instead of "remounted"
    time.sleep(3)
    if r.returncode == 0 and not is_mounted():
        return False, "mounted but dropped again straight away"
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
