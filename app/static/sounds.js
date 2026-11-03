/* Interface sounds for Kino: soft clicks and chimes made in the browser (nothing to download). On or off per device in Settings, remembered here. KinoSound.play(name) */
(function () {
  "use strict";
  const KEY = "kino-sound";
  let on = true, ctx = null, last = 0;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (_) {}
  let out = null;
  const ac = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Everything goes through one gentle compressor so the louder levels can't crackle
        out = ctx.createDynamicsCompressor(); out.threshold.value = -14; out.ratio.value = 6;
        out.connect(ctx.destination);
      } catch (_) { return null; }
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx;
  };
  const VOL = 3.2;  // the sounds below are written quiet, this brings them up to something a phone speaker can be heard on
  const tone = (f, at, dur, type, vol, f2) => {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(0.6, vol * VOL), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  };
  const noise = (at, dur, from, to, vol) => {
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
    s.buffer = b; f.type = "bandpass"; f.Q.value = 1.1; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(Math.min(0.5, vol * VOL), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t);
  };
  // All quiet on purpose, these play under everything else
  const SOUNDS = {
    move: () => tone(560, 0, 0.035, "triangle", 0.035, 640),
    tick: () => tone(880, 0, 0.06, "triangle", 0.06, 1180),
    select: () => { tone(660, 0, 0.08, "sine", 0.07); tone(880, 0.05, 0.1, "sine", 0.06); },
    confirm: () => { tone(523, 0, 0.12, "sine", 0.08); tone(784, 0.07, 0.14, "sine", 0.08); tone(1047, 0.14, 0.26, "sine", 0.07); },
    back: () => tone(520, 0, 0.09, "triangle", 0.06, 360),
    open: () => { noise(0, 0.16, 500, 1800, 0.035); tone(700, 0.03, 0.09, "sine", 0.05, 900); },
    close: () => { noise(0, 0.14, 1800, 500, 0.03); tone(760, 0, 0.08, "sine", 0.045, 520); },
    on: () => { tone(600, 0, 0.08, "triangle", 0.07, 900); tone(900, 0.07, 0.1, "sine", 0.06); },
    off: () => { tone(900, 0, 0.08, "triangle", 0.06, 600); tone(600, 0.07, 0.1, "sine", 0.05); },
    notify: () => { tone(988, 0, 0.1, "sine", 0.06); tone(1318, 0.09, 0.16, "sine", 0.05); },
    success: () => { [660, 880, 1175].forEach((f, i) => tone(f, i * 0.07, 0.18, "sine", 0.07)); },
    whoosh: () => noise(0, 0.38, 400, 2600, 0.07),
    pop: () => { tone(540, 0, 0.14, "sine", 0.12, 180); tone(1080, 0, 0.06, "triangle", 0.05); },
    chime: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, "sine", 0.1)); },
    fanfare: () => { [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3], [1319, 0.45]].forEach(([f, a]) => { tone(f, a, 0.7, "triangle", 0.1); tone(f / 2, a, 0.7, "sine", 0.06); }); noise(0.3, 0.9, 3000, 7000, 0.05); },
    error: () => { tone(300, 0, 0.12, "triangle", 0.07, 240); tone(240, 0.11, 0.16, "triangle", 0.07, 190); },
  };
  window.KinoSound = {
    get on() { return on; },
    set(v) { on = !!v; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (_) {} },
    wake: ac,
    // What the browser says the sound is doing: "running" is good, "suspended" means it is still waiting for a tap, "none" it can't make sound at all
    state() { return ctx ? ctx.state : "none"; },
    // A loud-ish chime for the Settings button, and what state it is in, so a silent device can say why
    test() { if (!ac()) return "none"; SOUNDS.chime(); return ctx.state; },
    play(name) {
      if (!SOUNDS[name] || (!on && name !== "chime")) return;
      const now = performance.now();
      if (now - last < 35) return;  // never a machine gun
      last = now;
      try { SOUNDS[name](); } catch (_) {}
    },
  };
  // Browsers only allow sound after a tap or key, the first one wakes it up
  // iPhones only unlock it from a finished tap (touchend or click), not from the start of one, so every kind is tried until it is running
  const EVS = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
  const wake = () => { ac(); if (ctx && ctx.state === "running") EVS.forEach((e) => removeEventListener(e, wake, true)); };
  EVS.forEach((e) => addEventListener(e, wake, true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx && ctx.state !== "running") ctx.resume().catch(() => {}); });
})();
