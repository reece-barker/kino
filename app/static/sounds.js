/* Sounds for Kino. The little interface sounds are recorded ones (Kenney's Interface Sounds, CC0, in /static/sfx), with a synthesised version of each as the
   backup if a file doesn't load. The background music for Wrapped is made live in the browser (a chord pad, a bass, a soft beat and a plucked arpeggio),
   so there is no music file and no licence to carry. On or off per device in Settings. KinoSound.play(name), KinoSound.music.start() / stop() */
(function () {
  "use strict";
  const KEY = "kino-sound";
  let on = true, ctx = null, out = null, last = 0, duckT = 0;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (_) {}
  const ac = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Everything goes through one gentle compressor so it can't crackle
        out = ctx.createDynamicsCompressor(); out.threshold.value = -14; out.ratio.value = 6;
        out.connect(ctx.destination);
        load();
      } catch (_) { return null; }
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    return ctx;
  };

  // ---- recorded sounds: name -> file and how loud (0 to 1)
  const FILES = {
    tick: ["click_003", 1], move: ["tick_002", 0.5], select: ["select_001", 0.9], confirm: ["confirmation_001", 0.8], back: ["back_001", 0.9],
    open: ["open_001", 0.8], close: ["close_001", 0.8], on: ["maximize_001", 0.7], off: ["minimize_001", 0.7], notify: ["bong_001", 0.8],
    success: ["confirmation_002", 0.8], error: ["error_001", 0.8], whoosh: ["maximize_001", 0.35], pop: ["pluck_001", 0.9], chime: ["glass_001", 0.9],
  };
  const BUF = {};
  const load = () => {
    Object.values(FILES).forEach(([f]) => {
      if (BUF[f] !== undefined) return;
      BUF[f] = null;
      fetch(`/static/sfx/${f}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).then((d) => { BUF[f] = d; }).catch(() => {});
    });
  };
  const clip = (name, gain) => {
    const e = FILES[name], b = e && BUF[e[0]];
    if (!b || !ctx) return false;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; g.gain.value = (gain == null ? 1 : gain) * e[1];
    s.connect(g); g.connect(out); s.start();
    return true;
  };

  // ---- synthesised backups (and the bits recorded sounds can't do, the fanfare)
  const tone = (f, at, dur, type, vol, f2) => {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.min(0.6, vol * 3.2), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  };
  const noise = (at, dur, from, to, vol) => {
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
    s.buffer = b; f.type = "bandpass"; f.Q.value = 1.1; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(Math.min(0.5, vol * 3.2), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t);
  };
  const SYNTH = {
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
    error: () => { tone(300, 0, 0.12, "triangle", 0.07, 240); tone(240, 0.11, 0.16, "triangle", 0.07, 190); },
    whoosh: () => noise(0, 0.38, 400, 2600, 0.07),
    pop: () => { tone(540, 0, 0.14, "sine", 0.12, 180); tone(1080, 0, 0.06, "triangle", 0.05); },
    chime: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, "sine", 0.1)),
  };
  // The celebration: a bright rising chord with a sparkle on top, plus the recorded success and glass sounds underneath when they have loaded
  const fanfare = () => {
    clip("success", 1); setTimeout(() => clip("chime", 0.8), 120);
    [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3], [1319, 0.45]].forEach(([f, a]) => { tone(f, a, 0.8, "triangle", 0.07); tone(f / 2, a, 0.8, "sine", 0.05); });
    noise(0.3, 0.9, 3000, 7000, 0.04);
  };

  // ---- the background music for Wrapped: Am, F, C, G over a slow beat, around 96 beats a minute
  const BPM = 96, STEP = 60 / BPM / 2;
  const CH = [[57, 60, 64, 45], [53, 57, 60, 41], [48, 52, 55, 36], [55, 59, 62, 43]];  // three chord notes and the bass note, as midi numbers
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const M = { gain: null, delay: null, timer: 0, step: 0, next: 0, playing: false, level: 0.5 };
  const mnote = (f, t, dur, type, vol, dest) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  };
  const schedule = () => {
    while (M.next < ctx.currentTime + 0.5) {
      const s = M.step % 32, bar = (s / 8) | 0, i = s % 8, ch = CH[bar], t = M.next;
      // the pad, once a bar: the chord notes slightly detuned through a low pass, swelling in and out
      if (i === 0) ch.slice(0, 3).forEach((m) => [-4, 4].forEach((d) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = d; f.type = "lowpass"; f.frequency.value = 700;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + STEP * 8);
        o.connect(f); f.connect(g); g.connect(M.gain); o.start(t); o.stop(t + STEP * 8 + 0.1);
      }));
      // bass and a soft kick on the beat
      if (i === 0 || i === 4) { mnote(hz(ch[3]), t, STEP * 3.2, "sine", 0.16, M.gain);
        const k = ctx.createOscillator(), kg = ctx.createGain(); k.frequency.setValueAtTime(130, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        kg.gain.setValueAtTime(0.18, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); k.connect(kg); kg.connect(M.gain); k.start(t); k.stop(t + 0.25); }
      // a light hat on the off beats
      if (i % 2 === 1) { const n = ctx.createBufferSource(), b = ctx.createBuffer(1, 800, ctx.sampleRate), d = b.getChannelData(0), g = ctx.createGain(), f = ctx.createBiquadFilter();
        for (let k = 0; k < 800; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / 800); n.buffer = b; f.type = "highpass"; f.frequency.value = 7000; g.gain.value = 0.05;
        n.connect(f); f.connect(g); g.connect(M.gain); n.start(t); }
      // the plucked arpeggio, up an octave, a little echo on it
      const pat = [0, 2, 1, 2, 0, 2, 1, 2][i];
      mnote(hz(ch[pat] + 12), t, STEP * 1.6, "triangle", 0.06, M.delay);
      M.next += STEP; M.step++;
    }
  };
  const music = {
    get playing() { return M.playing; },
    start() {
      if (!on || M.playing || !ac()) return;
      if (!M.gain) {
        M.gain = ctx.createGain(); M.gain.connect(out);
        M.delay = ctx.createGain(); const dl = ctx.createDelay(1), fb = ctx.createGain();
        dl.delayTime.value = STEP * 3; fb.gain.value = 0.32; M.delay.connect(M.gain); M.delay.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(M.gain);
      }
      M.playing = true; M.step = 0; M.next = ctx.currentTime + 0.1;
      M.gain.gain.cancelScheduledValues(ctx.currentTime); M.gain.gain.setValueAtTime(0.0001, ctx.currentTime); M.gain.gain.linearRampToValueAtTime(M.level, ctx.currentTime + 2.5);
      schedule(); M.timer = setInterval(schedule, 120);
    },
    stop(fade) {
      if (!M.playing) return;
      M.playing = false; clearInterval(M.timer);
      const f = fade == null ? 1.2 : fade;
      try { M.gain.gain.cancelScheduledValues(ctx.currentTime); M.gain.gain.setValueAtTime(Math.max(0.0001, M.gain.gain.value), ctx.currentTime); M.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + f); } catch (_) {}
    },
    // The music steps down for a moment while a sound effect plays over it
    duck(secs) {
      if (!M.playing) return;
      const t = ctx.currentTime; M.gain.gain.cancelScheduledValues(t); M.gain.gain.setValueAtTime(M.gain.gain.value, t); M.gain.gain.linearRampToValueAtTime(M.level * 0.35, t + 0.15);
      clearTimeout(duckT); duckT = setTimeout(() => { if (M.playing) { const n = ctx.currentTime; M.gain.gain.setValueAtTime(M.gain.gain.value, n); M.gain.gain.linearRampToValueAtTime(M.level, n + 1.2); } }, (secs || 1.5) * 1000);
    },
  };

  window.KinoSound = {
    get on() { return on; },
    set(v) { on = !!v; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (_) {} if (!on) music.stop(0.3); },
    wake: ac,
    music,
    // What the browser says the sound is doing: "running" is good, "suspended" means it is still waiting for a tap, "none" it can't make sound at all
    state() { return ctx ? ctx.state : "none"; },
    // A chime for the Settings button, and what state it is in, so a silent device can say why
    test() { if (!ac()) return "none"; if (!clip("chime", 1)) SYNTH.chime(); return ctx.state; },
    play(name) {
      if (!(name === "fanfare" || SYNTH[name]) || !on) return;
      const now = performance.now();
      if (now - last < 35) return;  // never a machine gun
      last = now;
      if (!ac()) return;
      try {
        if (name === "fanfare") { fanfare(); music.duck(2.2); } else if (!clip(name)) SYNTH[name]();
      } catch (_) {}
    },
  };
  // Browsers only allow sound after a tap or key, and iPhones only unlock it from a finished tap (touchend or click), not the start of one,
  // so every kind is tried until it is running
  const EVS = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
  const wake = () => { ac(); if (ctx && ctx.state === "running") EVS.forEach((e) => removeEventListener(e, wake, true)); };
  EVS.forEach((e) => addEventListener(e, wake, true));
  document.addEventListener("visibilitychange", () => { if (ctx && !document.hidden && ctx.state !== "running") ctx.resume().catch(() => {}); });
})();
