"""Finds the intro of tv episodes by comparing there audio, the bit that sounds the same in two episodes of
a season near the start is the intro. Works a bit like shazam, each slice of audio gets turned into a small
fingerprint and then the two episodes are slid past each other to find where they line up"""

import subprocess

import numpy as np

RATE = 8000          # 8 kHz mono is plenty for music and keeps it fast
FRAME = 2048         # samples per fft
HOP = 1024           # 0.128 s per fingerprint
SCAN = 600           # only the first 10 minutes, intros are never later than that
MIN_LEN = 15         # seconds, shorter matches are usually a logo or a sound effect
MAX_LEN = 150
WIN = 48             # frames looked at together when deciding if two bits match (about 6 seconds)

_POP = np.array([bin(i).count("1") for i in range(1 << 16)], dtype=np.uint8)


def audio(path, seconds=SCAN):
    """Decodes the start of a file to raw audio, ffmpeg only reads as much of the file as it needs"""
    out = subprocess.run(["nice", "-n", "15", "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-t", str(seconds),
                          "-i", path, "-vn", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
                         capture_output=True, timeout=600)
    return np.frombuffer(out.stdout, dtype=np.int16).astype(np.float32)


def fingerprint(x):
    """One 16 bit code per frame, each bit says if the energy difference between two bands went up or down"""
    if len(x) < FRAME * 4:
        return np.zeros(0, dtype=np.uint16)
    n = 1 + (len(x) - FRAME) // HOP
    idx = np.arange(FRAME)[None, :] + HOP * np.arange(n)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * np.hanning(FRAME), axis=1))
    freqs = np.fft.rfftfreq(FRAME, 1 / RATE)
    edges = np.geomspace(250, 3000, 18)
    bands = np.stack([spec[:, (freqs >= lo) & (freqs < hi)].sum(axis=1) for lo, hi in zip(edges[:-1], edges[1:])], axis=1)
    bands = np.log1p(bands)
    d = bands[:, :-1] - bands[:, 1:]          # 16 differences between neighbour bands
    bits = (d[1:] - d[:-1]) > 0               # and how they changed since the last frame
    weights = (1 << np.arange(16)).astype(np.uint32)
    return (bits.astype(np.uint32) * weights).sum(axis=1).astype(np.uint16)


def _moving(m, w):
    c = np.concatenate([[0], np.cumsum(m, dtype=np.int32)])
    return c[w:] - c[:-w]


def match(a, b):
    """Returns (a_start, a_end, b_start, b_end) in seconds for the longest stretch both share, or None"""
    if len(a) < WIN * 2 or len(b) < WIN * 2:
        return None
    best = (0, 0)
    # Slides b along a, for each offset counts how many frames line up in the best 6 second window
    for shift in range(-(len(b) - WIN), len(a) - WIN):
        i0, j0 = max(shift, 0), max(-shift, 0)
        n = min(len(a) - i0, len(b) - j0)
        if n < WIN:
            continue
        m = _POP[a[i0:i0 + n] ^ b[j0:j0 + n]] <= 4
        score = _moving(m, WIN).max()
        if score > best[0]:
            best = (score, shift)
    score, shift = best
    if score < WIN * 0.45:   # random audio lines up for about 4% of frames, a real match is way above that
        return None
    i0, j0 = max(shift, 0), max(-shift, 0)
    n = min(len(a) - i0, len(b) - j0)
    m = (_POP[a[i0:i0 + n] ^ b[j0:j0 + n]] <= 4).astype(np.float32)
    rate = np.convolve(m, np.ones(WIN) / WIN, mode="same")
    good = rate >= 0.3
    peak = int(np.argmax(rate))
    if not good[peak]:
        return None
    s = peak
    while s > 0 and good[s - 1]:
        s -= 1
    e = peak
    while e < n - 1 and good[e + 1]:
        e += 1
    # The smoothing blurs the edges, so they get found again on the raw matches, a run of 8 frames mostly matching
    lo = max(0, s - WIN // 2)
    for i in range(lo, e):
        if m[i:i + 8].mean() >= 0.5:
            s = i
            break
    hi = min(n, e + WIN // 2)
    for i in range(hi, s, -1):
        if m[max(0, i - 8):i].mean() >= 0.5:
            e = i
            break
    sec = HOP / RATE
    length = (e - s) * sec
    if not (MIN_LEN <= length <= MAX_LEN):
        return None
    # If nearly everything matches its the same file twice (a duplicate copy), not an intro
    if e - s > 0.6 * min(len(a), len(b)):
        return None
    return round((i0 + s) * sec, 2), round((i0 + e) * sec, 2), round((j0 + s) * sec, 2), round((j0 + e) * sec, 2)


def find_intros(paths):
    """Takes the files of one season in order and returns {path: (start, end)} for the ones it could work out"""
    prints, out = {}, {}

    def fp(p):
        if p not in prints:
            prints[p] = fingerprint(audio(p))
        return prints[p]

    for i, p in enumerate(paths):
        if p in out:
            continue
        # Compares with the next episode, or the one before for the last one, and tries one more if that fails
        others = [q for q in (paths[i + 1:i + 3] + paths[max(0, i - 2):i][::-1]) if q != p]
        for q in others:
            r = match(fp(p), fp(q))
            if r:
                out[p] = (r[0], r[1])
                out.setdefault(q, (r[2], r[3]))
                break
    return out
