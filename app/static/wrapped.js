/* Kino Wrapped viewer. Used inside Kino (own Wrapped, with sharing) and on the public share page (read only), one file for both so they always look the same.
   KinoWrapped.mount(root, data, { img(t, i), periods, onPeriod, onClose, share, tv }) */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const hrs = (secs) => { const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`; };
  const PARTS = [["morning", "Morning", "#ffd60a"], ["afternoon", "Afternoon", "#ff9f0a"], ["evening", "Evening", "#bf5af2"], ["night", "Late night", "#5e5ce6"]];
  const FUN_ICON = { ring: "💍", plane: "✈️", pizza: "🍕", tv: "📺" };
  const letters = (s) => String(s).split("").map((c, i) => `<span class="kw-l" style="--n:${i}">${esc(c)}</span>`).join("");
  const words = (s) => String(s).split(/\s+/).filter(Boolean).map((w, i) => `<span class="kw-w" style="--n:${i}">${esc(w)}</span>`).join(" ");
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Little sounds made in the browser (nothing to download): a tick, a whoosh between slides, a pop and a fanfare. Off with the speaker button, which is remembered
  const Snd = (() => {
    let ctx = null, muted = false;
    try { muted = localStorage.getItem("kino-sound") === "off"; } catch (_) {}
    const ac = () => {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    };
    const tone = (f, at, dur, type, vol, f2) => {
      const c = ac(); if (!c || muted) return;
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    };
    const noise = (at, dur, from, to, vol) => {
      const c = ac(); if (!c || muted) return;
      const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
      s.buffer = b; f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
    };
    return {
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem("kino-sound", muted ? "off" : "on"); } catch (_) {} if (window.KinoSound) KinoSound.set(!muted); if (!muted) this.tick(); return muted; },
      wake: ac,
      tick() { tone(880, 0, 0.07, "triangle", 0.07, 1180); },
      whoosh() { noise(0, 0.38, 400, 2600, 0.07); },
      pop() { tone(540, 0, 0.14, "sine", 0.12, 180); tone(1080, 0, 0.06, "triangle", 0.05); },
      chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, "sine", 0.1)); },
      fanfare() { [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3], [1319, 0.45]].forEach(([f, a]) => { tone(f, a, 0.7, "triangle", 0.1); tone(f / 2, a, 0.7, "sine", 0.06); }); noise(0.3, 0.9, 3000, 7000, 0.05); },
    };
  })();

  // Confetti on a canvas over the slides, from the bottom corners and raining from the top, gone after a few seconds
  function Confetti(host) {
    const cv = document.createElement("canvas"); cv.className = "kw-confetti"; host.appendChild(cv);
    const cx = cv.getContext("2d"), cols = ["#ff375f", "#ff9f0a", "#ffd60a", "#30d158", "#64d2ff", "#0a84ff", "#bf5af2", "#ffffff"];
    let ps = [], raf = 0;
    const size = () => { cv.width = host.clientWidth * (devicePixelRatio > 1 ? 2 : 1); cv.height = host.clientHeight * (devicePixelRatio > 1 ? 2 : 1); };
    const k = () => cv.width / (host.clientWidth || 1);
    const add = (x, y, vx, vy, big) => ps.push({ x, y, vx, vy, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: (big ? 9 : 6) * (0.6 + Math.random()) * k(), h: (big ? 14 : 9) * (0.6 + Math.random()) * k(), c: cols[(Math.random() * cols.length) | 0], life: 1 });
    const tick = () => {
      cx.clearRect(0, 0, cv.width, cv.height);
      ps = ps.filter((p) => p.life > 0 && p.y < cv.height + 40);
      ps.forEach((p) => {
        p.vy += 0.22 * k(); p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.0035;
        cx.save(); cx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.r * 2)); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
      });
      raf = ps.length ? requestAnimationFrame(tick) : 0;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    return {
      cannons(n) {
        if (still()) return; size();
        for (let i = 0; i < n; i++) {
          const left = i % 2 === 0, dir = left ? 1 : -1;
          add(left ? 0 : cv.width, cv.height * 0.95, dir * (3 + Math.random() * 8) * k(), -(13 + Math.random() * 11) * k(), true);
        }
        go();
      },
      rain(n) { if (still()) return; size(); for (let i = 0; i < n; i++) add(Math.random() * cv.width, -20 - Math.random() * 200, (Math.random() - 0.5) * 3 * k(), (1 + Math.random() * 3) * k(), false); go(); },
      at(x, y, n) { if (still()) return; size(); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (3 + Math.random() * 7) * k(); add(x * k(), y * k(), Math.cos(a) * v, Math.sin(a) * v - 4 * k(), false); } go(); },
      stop() { cancelAnimationFrame(raf); ps = []; cv.remove(); },
    };
  }
  const code4 = (c) => (c || "").replace(/^(.{4})(.{4})$/, "$1-$2");

  function slides(d, o) {
    const out = [];
    const who = d.name ? esc(d.name) : "";
    const prev = d.prev;
    out.push(["intro", `
      <div class="kw-eyebrow rv" style="--i:0">Kino Wrapped</div>
      <h1 class="kw-month" style="--i:1">${letters(d.month)}</h1>
      <div class="kw-h rv" style="--i:2">${esc(d.year)}</div>
      <p class="kw-p rv" style="--i:3">${who ? `${who}'s month` : "A month"} of watching, in numbers.</p>
      ${o.periods && o.periods.length > 1 ? `<div class="kw-periods rv" style="--i:4">${o.periods.map((p) => `<button data-period="${esc(p.period)}" class="${p.period === d.period ? "on" : ""}">${esc(p.label)}</button>`).join("")}</div>` : ""}`]);
    out.push(["time", `
      <div class="kw-eyebrow rv" style="--i:0">You watched for</div>
      <div class="kw-big rv" style="--i:1" data-count="${d.hours}" data-dec="1">0</div>
      <div class="kw-h rv" style="--i:2">hours</div>
      <p class="kw-p rv" style="--i:3">${esc(d.words)} across <b>${d.active_days}</b> day${d.active_days === 1 ? "" : "s"}, ${d.titles} different title${d.titles === 1 ? "" : "s"}.</p>
      ${prev && prev.pct != null ? `<div class="kw-chip ${prev.pct >= 0 ? "up" : "down"} rv" style="--i:4">${prev.pct >= 200 ? `▲ ${(1 + prev.pct / 100).toFixed(1)}× last month` : `${prev.pct >= 0 ? "▲" : "▼"} ${Math.abs(prev.pct)}% ${prev.pct >= 0 ? "more" : "less"} than last month`}</div>` : ""}
      ${d.fun && d.fun[0] ? `<p class="kw-p rv" style="--i:5">${FUN_ICON[d.fun[0].icon] || "✨"} ${esc(d.fun[0].text)}</p>` : ""}`]);
    if (d.top && d.top.length) {
      const t0 = d.top[0], img = (t, i) => (t.poster && o.img ? o.img(t, i) : "");
      out.push(["top", `
        <div class="kw-eyebrow rv" style="--i:0">Your number one</div>
        ${img(t0, 0) ? `<img class="kw-poster rv" style="--i:1" src="${esc(img(t0, 0))}" alt="${esc(t0.name)}" data-fb="poster">` : `<div class="kw-poster kw-ph rv" style="--i:1">${esc(t0.name)}</div>`}
        <h2 class="kw-h rv" style="--i:2">${esc(t0.name)}</h2>
        <p class="kw-p rv" style="--i:3">${esc(t0.words)} of your month${t0.days > 1 ? `, over ${t0.days} different days` : ""}.</p>
        ${d.top.length > 1 ? `<ol class="kw-rank rv" style="--i:4">${d.top.slice(1).map((t, i) => `<li><b>${i + 2}</b>${img(t, i + 1) ? `<img src="${esc(img(t, i + 1))}" alt="" loading="lazy" data-fb="rm">` : ""}<span class="t">${esc(t.name)}</span><span class="m">${esc(t.words)}</span></li>`).join("")}</ol>` : ""}`]);
    }
    if (d.genres && d.genres.length) {
      const mx = Math.max(...d.genres.map((g) => g.pct), 1);
      out.push(["genres", `
        <div class="kw-eyebrow rv" style="--i:0">Your taste</div>
        <h2 class="kw-h rv" style="--i:1">${esc(d.genres[0].name)} ruled the month</h2>
        <div class="kw-bars rv" style="--i:2">${d.genres.map((g, i) => `<div class="kw-bar" style="--i:${i};--w:${Math.max(6, Math.round((g.pct / mx) * 100))}%"><span>${esc(g.name)}</span><i></i><span>${g.pct}%</span></div>`).join("")}</div>`]);
    }
    const mxw = Math.max(...d.weekdays.map((w) => w.secs), 1);
    out.push(["when", `
      <div class="kw-eyebrow rv" style="--i:0">When you watch</div>
      <h2 class="kw-h rv" style="--i:1">${esc(d.busiest_day)}s are your day</h2>
      <div class="kw-cols rv" style="--i:2">${d.weekdays.map((w, i) => `<div class="kw-col ${w.day === d.busiest_day ? "hot" : ""}" style="--i:${i};--h:${Math.max(4, Math.round((w.secs / mxw) * 100))}%"><i></i>${esc(w.day.slice(0, 3))}</div>`).join("")}</div>
      <div class="kw-parts rv" style="--i:3">${PARTS.map(([k, , c]) => `<i style="--w:${d.parts[k] || 0}%;background:${c}"></i>`).join("")}</div>
      <div class="kw-legend rv" style="--i:4">${PARTS.filter(([k]) => d.parts[k]).map(([k, l, c]) => `<span style="--c:${c}">${l} ${d.parts[k]}%</span>`).join("")}</div>`]);
    const cards = [
      [`Biggest day`, esc(d.big_day.words), esc(d.big_day.date)],
      [`Longest sitting`, esc(d.sitting.words), "without a proper break"],
      d.streak > 1 ? [`Longest streak`, `${d.streak} days`, "in a row"] : null,
      d.binge ? [`Biggest binge`, `${d.binge.episodes} episodes`, esc(d.binge.name)] : null,
      [`First watch`, esc(d.first.name), esc(d.first.date)],
      [`Last watch`, esc(d.last.name), esc(d.last.date)],
      d.rewatch ? [`On repeat`, esc(d.rewatch.name), `${d.rewatch.days} different days`] : null,
      d.loved ? [`Loved`, `${d.loved} title${d.loved === 1 ? "" : "s"}`, "got a love from you"] : null,
    ].filter(Boolean).slice(0, 6);
    out.push(["moments", `
      <div class="kw-eyebrow rv" style="--i:0">Moments</div>
      <h2 class="kw-h rv" style="--i:1">The highlights</h2>
      <div class="kw-cards">${cards.map((c, i) => `<div class="kw-card rv" style="--i:${i + 2}"><small>${c[0]}</small><b>${c[1]}</b><span>${c[2]}</span></div>`).join("")}</div>`]);
    out.push(["mix", `
      <div class="kw-eyebrow rv" style="--i:0">Films or series?</div>
      <div class="kw-donut rv" style="--i:1;--m:${d.mix.movie}%"><div>${d.mix.movie}%</div></div>
      <h2 class="kw-h rv" style="--i:2">${d.mix.movie >= 60 ? "A film person" : d.mix.movie <= 40 ? "A series person" : "A bit of both"}</h2>
      <div class="kw-stats rv" style="--i:3"><div class="kw-stat"><b data-count="${d.movies}">0</b><span>films</span></div><div class="kw-stat"><b data-count="${d.episodes}">0</b><span>episodes</span></div><div class="kw-stat"><b data-count="${d.titles}">0</b><span>titles</span></div></div>
      ${d.devices && d.devices.length ? `<p class="kw-p rv" style="--i:4">Mostly on ${d.devices.map((x) => `${esc(x.name)} (${x.pct}%)`).join(", ")}</p>` : ""}`]);
    if (d.fun && d.fun.length) {
      out.push(["fun", `
        <div class="kw-eyebrow rv" style="--i:0">Just for fun</div>
        <h2 class="kw-h rv" style="--i:1">That's the same as...</h2>
        <div class="kw-fun">${d.fun.map((f, i) => `<div class="rv" style="--i:${i + 2}"><em>${FUN_ICON[f.icon] || "✨"}</em><span>${esc(f.text)}</span></div>`).join("")}</div>`]);
    }
    const ps = d.persona;
    out.push(["persona", `
      <div class="kw-eyebrow rv" style="--i:0">Your ${esc(d.month)} personality</div>
      <h2 class="kw-title" style="--i:1">${words(ps.title)}</h2>
      <p class="kw-p rv" style="--i:2">${esc(ps.blurb)}</p>
      <ul class="kw-lines">${(ps.lines || []).map((l, i) => `<li class="rv" style="--i:${i + 3}">${esc(l)}</li>`).join("")}</ul>
      ${ps.forecast ? `<p class="kw-p rv" style="--i:7">🔮 ${esc(ps.forecast)}</p>` : ""}
      ${ps.source === "claude" ? `<div class="kw-ai rv" style="--i:8"><span>Written by Claude</span><a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Claude's privacy policy</a></div>` : ""}`]);
    if (o.share) out.push(["share", `<div id="kwShare" class="kw-sharebox"></div>`]);
    else out.push(["end", `
      <div class="kw-eyebrow rv" style="--i:0">That's the wrap</div>
      <h2 class="kw-title" style="--i:1">${words(`${d.month} ${d.year}`)}</h2>
      <p class="kw-p rv" style="--i:2">${who ? `Thanks for watching, ${who}.` : "Thanks for watching."}</p>`]);
    return out;
  }

  function countUp(el, done) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const to = Number(el.dataset.count) || 0, dec = Number(el.dataset.dec) || 0, t0 = performance.now(), dur = 1400;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = to.toFixed(dec); return; }
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(tick); else if (done) done(); };
    requestAnimationFrame(tick);
  }

  // The share slide inside Kino: make a link, show it (to read out on a tv, to copy on anything else), change it, stop sharing
  function shareUI(box, d, o) {
    const s = o.share;
    const draw = () => {
      if (!s.can) { box.innerHTML = `<div class="kw-eyebrow">Share</div><h2 class="kw-h">Sharing is off on kids profiles</h2><p class="kw-p">Ask a grown up to share theirs.</p>`; return; }
      const st = s.state;
      if (!st) {
        box.innerHTML = `<div class="kw-eyebrow">Share your Wrapped</div><h2 class="kw-title">Show it off</h2>
          <p class="kw-p">Make a link anyone can open, they don't need to sign in or be on this network.</p>
          <label class="kw-check"><input type="checkbox" id="kwName" checked> Show my name on it</label>
          <div class="kw-actions"><button class="kw-btn" id="kwMake">Make a share link</button></div>
          <p class="kw-small">It shows ${esc(d.month)} as it is right now. You can stop sharing any time.</p>`;
        box.querySelector("#kwMake").onclick = async (e) => { e.target.disabled = true; try { s.state = await s.create(!box.querySelector("#kwName").checked); Snd.fanfare(); o.fx.cannons(70); } catch (err) { s.error = err.message; } draw(); };
        return;
      }
      const canShare = !o.tv && navigator.share, canCopy = !o.tv;
      box.innerHTML = `<div class="kw-eyebrow">Your share link</div>
        <div class="kw-link" id="kwLink">${esc(st.url.replace(/^https?:\/\//, ""))}</div>
        <div class="kw-code">${esc(code4(st.code))}</div>
        <p class="kw-p">${o.tv ? "Send this link in a text message, or read out the code. Anyone can open it." : "Anyone with this link can see it, no sign in needed."}</p>
        <div class="kw-actions">${canCopy ? `<button class="kw-btn" id="kwCopy">Copy link</button>` : ""}${canShare ? `<button class="kw-btn ghost" id="kwSend">Share…</button>` : ""}<button class="kw-btn ghost" id="kwStop">Stop sharing</button></div>
        <label class="kw-check"><input type="checkbox" id="kwName" ${st.hide_name ? "" : "checked"}> Show my name</label>
        <p class="kw-small">${st.views ? `Opened ${st.views} time${st.views === 1 ? "" : "s"}. ` : ""}It shows ${esc(d.month)} as it was when you made the link.</p>`;
      const c = box.querySelector("#kwCopy");
      if (c) c.onclick = async () => {
        try { await navigator.clipboard.writeText(st.url); c.textContent = "Copied"; Snd.pop(); o.fx.at(c.getBoundingClientRect().left + c.offsetWidth / 2, c.getBoundingClientRect().top, 28); } catch (_) {
          const r = document.createRange(); r.selectNodeContents(box.querySelector("#kwLink")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); c.textContent = "Press and hold the link to copy";
        }
        setTimeout(() => { c.textContent = "Copy link"; }, 2500);
      };
      const sn = box.querySelector("#kwSend"); if (sn) sn.onclick = () => navigator.share({ title: `${d.month} on Kino`, text: `My ${d.month} on Kino`, url: st.url }).catch(() => {});
      box.querySelector("#kwStop").onclick = async () => { await s.remove(); s.state = null; draw(); };
      box.querySelector("#kwName").onchange = async (e) => { try { s.state = await s.create(!e.target.checked); } catch (_) {} draw(); };
    };
    draw();
  }

  function mount(root, d, o) {
    o = o || {};
    const list = slides(d, o);
    root.innerHTML = `<div class="kw"><div class="kw-top"><div class="kw-segs">${list.map((_, i) => `<button class="kw-seg${i ? "" : " on"}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`).join("")}</div>${o.onClose ? `<button class="kw-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ""}</div>
      <div class="kw-track" tabindex="-1">${list.map(([p, h]) => `<section class="kw-s" data-p="${p}">${h}</section>`).join("")}</div><button class="kw-next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>`;
    // A picture that doesn't load: the big one becomes a coloured name tile, the small ones go (no inline handlers, the page's policy doesn't allow them)
    root.querySelectorAll("img[data-fb]").forEach((im) => im.addEventListener("error", () => {
      if (im.dataset.fb === "rm") { im.remove(); return; }
      const d2 = document.createElement("div"); d2.className = "kw-poster kw-ph rv in-now"; d2.textContent = im.alt; im.replaceWith(d2);
    }));
    const kw = root.querySelector(".kw"), track = root.querySelector(".kw-track"), segs = [...root.querySelectorAll(".kw-seg")], secs = [...root.querySelectorAll(".kw-s")], next = root.querySelector(".kw-next");
    let cur = 0;
    const fx = Confetti(kw);
    o.fx = fx;
    const mute = document.createElement("button");
    mute.className = "kw-mute"; mute.setAttribute("aria-label", "Sound");
    const SPK = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/>', mdraw = () => { mute.innerHTML = SPK + (Snd.muted ? '<path d="M17 9l5 6M22 9l-5 6"/></svg>' : '<path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>'); mute.setAttribute("aria-pressed", String(!Snd.muted)); };
    mdraw(); mute.onclick = () => { Snd.toggle(); mdraw(); };
    root.querySelector(".kw-top").insertBefore(mute, root.querySelector(".kw-close"));
    // Sound needs a tap or key first, the first one wakes it up
    const wake = () => Snd.wake();
    kw.addEventListener("pointerdown", wake, { once: true }); document.addEventListener("keydown", wake, { once: true, capture: true });
    kw.addEventListener("click", (e) => { if (e.target.closest(".kw-btn, .kw-seg, .kw-next, .kw-periods button, .kw-close, .kw-check")) Snd.tick(); });
    const go = (i) => { i = Math.max(0, Math.min(secs.length - 1, i)); track.scrollTo({ top: i * track.clientHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
    const first = {};
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in"); e.target.querySelectorAll("[data-count]").forEach((el) => countUp(el, () => { Snd.pop(); const r = el.getBoundingClientRect(); fx.at(r.left + r.width / 2, r.top + r.height / 2, 36); }));
      const p = e.target.dataset.p;
      if (!first[p]) {
        first[p] = 1;
        if (p === "persona") { Snd.fanfare(); fx.cannons(70); setTimeout(() => fx.rain(60), 500); }
        else if (p === "top") Snd.chime();
        else if (p === "intro") { fx.rain(40); Snd.chime(); }
      }
    }), { root: track, threshold: 0.55 });
    secs.forEach((s) => io.observe(s));
    const sync = () => { const i = Math.round(track.scrollTop / (track.clientHeight || 1)); if (i === cur) return; cur = i; Snd.whoosh(); segs.forEach((s, k) => s.classList.toggle("on", k <= i)); next.hidden = i >= secs.length - 1; };
    track.addEventListener("scroll", sync, { passive: true });
    segs.forEach((s) => (s.onclick = () => go(Number(s.dataset.i))));
    next.onclick = () => go(cur + 1);
    root.querySelectorAll("[data-period]").forEach((b) => (b.onclick = () => o.onPeriod && o.onPeriod(b.dataset.period)));
    const x = root.querySelector(".kw-close"); if (x) x.onclick = () => o.onClose();
    if (o.share) shareUI(root.querySelector("#kwShare"), d, o);
    // Keys: down, space and page down go on, up goes back, left and right move between the buttons of the share slide (or go on and back), Back closes
    const key = (e) => {
      if (!document.body.contains(kw)) return;
      const k = e.key, act = document.activeElement, inBtn = act && act.matches && act.matches("button, input, a") && !act.matches(".kw-next, .kw-seg");
      if (["Escape", "BrowserBack", "GoBack", "Backspace"].includes(k)) { if (o.onClose) { e.preventDefault(); e.stopPropagation(); o.onClose(); } return; }
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !inBtn)) { e.preventDefault(); e.stopPropagation(); go(cur + 1); }
      else if (k === "ArrowUp" || k === "PageUp") { e.preventDefault(); e.stopPropagation(); go(cur - 1); }
      else if (k === "ArrowRight" || k === "ArrowLeft") {
        const bs = [...secs[cur].querySelectorAll("button, input")].filter((b) => !b.disabled);
        if (inBtn && bs.length > 1 && bs.includes(act)) { e.preventDefault(); e.stopPropagation(); bs[(bs.indexOf(act) + (k === "ArrowRight" ? 1 : bs.length - 1)) % bs.length].focus(); }
        else { e.preventDefault(); e.stopPropagation(); go(cur + (k === "ArrowRight" ? 1 : -1)); }
      } else if (k === "Enter" && act && act.matches && act.matches("input[type=checkbox]")) { e.preventDefault(); e.stopPropagation(); act.click();
      } else if (k === "Enter" && !inBtn) { e.preventDefault(); e.stopPropagation(); go(cur + 1); }
    };
    document.addEventListener("keydown", key, true);
    // On a tv the remote needs something to be on: the next button, or on the share slide its first button
    track.addEventListener("scrollend", () => { if (o.tv) { const b = secs[cur].querySelector("button.kw-btn, .kw-periods button") || secs[cur].querySelector("button, input"); (b || next).focus({ preventScroll: true }); } });
    if (o.tv) next.focus({ preventScroll: true }); else track.focus({ preventScroll: true });
    sync();
    return { destroy() { fx.stop(); document.removeEventListener("keydown", key, true); io.disconnect(); root.innerHTML = ""; }, go };
  }

  window.KinoWrapped = { mount };
})();
