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

  // The sounds come from sounds.js (the same engine and the same on/off switch as the rest of Kino)
  const KS = () => window.KinoSound;
  const Snd = {
    get muted() { return !(KS() && KS().on); },
    toggle() { if (!KS()) return true; KS().set(!KS().on); if (KS().on) KS().play("tick"); return !KS().on; },
    wake() { if (KS()) KS().wake(); },
    tick() { KS() && KS().play("tick"); }, whoosh() { KS() && KS().play("whoosh"); }, pop() { KS() && KS().play("pop"); },
    chime() { KS() && KS().play("chime"); }, fanfare() { KS() && KS().play("fanfare"); },
  };

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
      ${o.periods && o.periods.length > 1 ? `<div class="kw-periods rv" style="--i:4">${o.periods.slice(0, 2).map((p) => `<button data-period="${esc(p.period)}" class="${p.period === d.period ? "on" : ""}">${esc(p.label)}</button>`).join("")}</div>` : ""}`]);
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

  // The picture a share link shows in WhatsApp, iMessage, Discord and so on (1200 x 630), drawn on a canvas here in the person's own browser so it can use their
  // profile picture and the real posters. o.avatar is { svg, a, b } (an icon), { img, bg } (a picture), or null; o.img(t, i) gives a poster address
  async function card(d, o) {
    o = o || {};
    const W = 1200, H = 630, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d"), FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const PAL = [["#5e5ce6", "#ff375f"], ["#0a84ff", "#64d2ff"], ["#ff9f0a", "#ff453a"], ["#30d158", "#64d2ff"], ["#bf5af2", "#0a84ff"], ["#ff375f", "#ff9f0a"]];
    const [c1, c2] = PAL[(Number(String(d.period).slice(5, 7)) || 1) % PAL.length];
    const load = (src) => new Promise((ok) => { if (!src) return ok(null); const im = new Image(); const t = setTimeout(() => ok(null), 5000); im.onload = () => { clearTimeout(t); ok(im); }; im.onerror = () => { clearTimeout(t); ok(null); }; im.src = src; });
    const rr = (px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
    const posters = await Promise.all((d.top || []).slice(0, 3).map((tt, i) => load(tt.poster && o.img ? o.img(tt, i) : null)));
    let av = null;
    if (o.avatar && o.avatar.svg) av = await load("data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${o.avatar.svg}</svg>`));
    else if (o.avatar && o.avatar.img) av = await load(o.avatar.img);
    // Background: dark with two soft glows in the month's colours
    x.fillStyle = "#08080d"; x.fillRect(0, 0, W, H);
    const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col + "cc"); g.addColorStop(1, col + "00"); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    glow(150, 40, 620, c1); glow(1100, 640, 640, c2);
    // Posters, overlapping and tilted, on the right
    const tiles = posters.length ? posters : [null];
    const slots = [{ cx: 905, cy: 330, w: 250, rot: 0.0, z: 3 }, { cx: 1030, cy: 345, w: 210, rot: 0.1, z: 2 }, { cx: 790, cy: 350, w: 210, rot: -0.1, z: 1 }];
    tiles.map((im, i) => ({ im, i, s: slots[i] })).sort((a, b) => a.s.z - b.s.z).forEach(({ im, i, s: sl }) => {
      const w = sl.w, h = w * 1.5;
      x.save(); x.translate(sl.cx, sl.cy); x.rotate(sl.rot);
      x.shadowColor = "rgba(0,0,0,0.55)"; x.shadowBlur = 40; x.shadowOffsetY = 16;
      rr(-w / 2, -h / 2, w, h, 18); x.fillStyle = "#1c1c1e"; x.fill(); x.shadowColor = "transparent";
      x.save(); rr(-w / 2, -h / 2, w, h, 18); x.clip();
      if (im) x.drawImage(im, -w / 2, -h / 2, w, h);
      else { const g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(-w / 2, -h / 2, w, h); x.fillStyle = "#fff"; x.font = `800 26px ${FONT}`; x.textAlign = "center"; x.fillText(((d.top[i] || {}).name || "").slice(0, 18), 0, 8); }
      x.restore(); x.lineWidth = 2; x.strokeStyle = "rgba(255,255,255,0.22)"; rr(-w / 2, -h / 2, w, h, 18); x.stroke(); x.restore();
    });
    // Left: who, which month, the personality, the numbers
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    const fit = (txt, px, weight, maxW) => { let f = px; do { x.font = `${weight} ${f}px ${FONT}`; f -= 2; } while (x.measureText(txt).width > maxW && f > 18); };
    let top = 64;
    if (d.name || av) {
      if (av) {
        const ar = 46, ax = 70 + ar, ay = 66 + ar;
        x.save(); x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI * 2); x.clip();
        const a = o.avatar || {}, g = x.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar); g.addColorStop(0, a.a || a.bg || c1); g.addColorStop(1, a.b || a.bg || c2); x.fillStyle = g; x.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
        const sc = a.svg ? 1.5 : 1.7, sw = ar * sc, sh = (av.height / (av.width || 1)) * sw; x.drawImage(av, ax - (a.svg ? ar : sw / 2), ay - (a.svg ? ar : sh / 2), a.svg ? ar * 2 : sw, a.svg ? ar * 2 : sh);
        x.restore(); x.lineWidth = 3; x.strokeStyle = "rgba(255,255,255,0.5)"; x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI * 2); x.stroke();
      }
      x.fillStyle = "#fff"; fit(d.name ? `${d.name}'s` : "", 40, 800, 420); x.fillText(d.name ? `${d.name}'s` : "", av ? 190 : 70, 66 + 40);
      x.fillStyle = "rgba(255,255,255,0.7)"; x.font = `800 22px ${FONT}`; if ("letterSpacing" in x) x.letterSpacing = "4px"; x.fillText("KINO WRAPPED", av ? 190 : 70, 66 + 78); if ("letterSpacing" in x) x.letterSpacing = "0px";
      top = 190;
    } else { x.fillStyle = "rgba(255,255,255,0.7)"; x.font = `800 24px ${FONT}`; if ("letterSpacing" in x) x.letterSpacing = "4px"; x.fillText("KINO WRAPPED", 70, 100); if ("letterSpacing" in x) x.letterSpacing = "0px"; top = 150; }
    x.fillStyle = "#fff"; fit(d.month, 150, 850, 560); x.fillText(d.month, 66, top + 130);
    x.fillStyle = "rgba(255,255,255,0.85)"; x.font = `800 52px ${FONT}`; x.fillText(String(d.year), 72, top + 190);
    const gr = x.createLinearGradient(70, 0, 640, 0); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#ffd1e8");
    x.fillStyle = gr; fit(d.persona.title, 62, 850, 580); x.fillText(d.persona.title, 70, top + 280);
    x.fillStyle = "rgba(255,255,255,0.9)"; x.font = `700 32px ${FONT}`;
    x.fillText(`${Math.round(d.hours)} hours  ·  ${d.active_days} days  ·  ${d.titles} titles`, 70, top + 335);
    x.fillStyle = "rgba(255,255,255,0.55)"; x.font = `800 26px ${FONT}`; x.fillText("Kino", 70, H - 36);
    return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("no picture"))), "image/jpeg", 0.88));
  }

  function mount(root, d, o) {
    o = o || {};
    const list = slides(d, o);
    root.innerHTML = `<div class="kw"><div class="kw-top">${o.onClose ? `<button class="kw-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ""}<div class="kw-segs">${list.map((_, i) => `<button class="kw-seg${i ? "" : " on"}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`).join("")}</div></div>
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
    root.querySelector(".kw-top").appendChild(mute);
    // Sound needs a tap or key first, the first one wakes it up
    const wake = () => Snd.wake();
    kw.addEventListener("pointerdown", wake, { once: true }); document.addEventListener("keydown", wake, { once: true, capture: true });
    kw.addEventListener("click", (e) => { if (e.target.closest(".kw-btn, .kw-seg, .kw-next, .kw-periods button, .kw-close, .kw-check")) Snd.tick(); });
    const go = (i) => { i = Math.max(0, Math.min(secs.length - 1, i)); track.scrollTo({ top: i * track.clientHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
    // The big month name shrinks to fit the width instead of breaking onto a second line (September, November, December are long)
    const fitMonth = () => { const m = root.querySelector(".kw-month"); if (!m) return; m.style.fontSize = ""; const room = Math.min(m.parentElement.clientWidth - 8, 740); let f = parseFloat(getComputedStyle(m).fontSize); if (m.scrollWidth > room) m.style.fontSize = Math.floor(f * room / m.scrollWidth) + "px"; };
    fitMonth(); addEventListener("resize", fitMonth);
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
    // The slides start animating once the person has tapped to open (see the gate below), so the intro isn't spent behind it
    const begin = () => secs.forEach((s) => io.observe(s));
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
      if (kw.querySelector(".kw-gate") && !["Escape", "BrowserBack", "GoBack", "Backspace", "Enter", " "].includes(e.key)) { e.preventDefault(); return; }
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
    // Browsers only let a page make sound after the person has deliberately tapped something, and a phone may need that tap to be the last thing before the
    // sound starts. So unless sound is already awake (or switched off), the Wrapped opens on a "Tap to open" screen, and that tap wakes it and plays the first chime
    const ks = window.KinoSound, gated = !!ks && ks.on && ks.state() !== "running";
    if (gated) {
      const g = document.createElement("div");
      g.className = "kw-gate";
      g.innerHTML = `<div class="kw-eyebrow">Kino Wrapped</div><div class="kw-gmonth">${esc(d.month)}</div>${d.name ? `<div class="kw-p">${esc(d.name)}'s month is ready</div>` : `<div class="kw-p">Your month is ready</div>`}
        <button class="kw-go" aria-label="Tap to open"><svg viewBox="0 0 24 24"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l11.04-6.86a1.03 1.03 0 000-1.76L9.56 4.26A1.03 1.03 0 008 5.14z"/></svg></button>
        <div class="kw-p">Tap to open, with sound</div>
        <button class="kw-btn ghost kw-nosound">Open without sound</button>`;
      kw.appendChild(g);
      const open = (sound) => {
        if (!sound) ks.set(false); else { ks.wake(); ks.play("chime"); }
        g.classList.add("out"); setTimeout(() => g.remove(), 500);
        begin();
        if (o.tv) next.focus({ preventScroll: true }); else track.focus({ preventScroll: true });
      };
      g.querySelector(".kw-go").onclick = () => open(true);
      g.querySelector(".kw-nosound").onclick = () => open(false);
      g.querySelector(".kw-go").focus({ preventScroll: true });
    } else {
      begin();
      if (o.tv) next.focus({ preventScroll: true }); else track.focus({ preventScroll: true });
    }
    sync();
    return { destroy() { fx.stop(); removeEventListener("resize", fitMonth); document.removeEventListener("keydown", key, true); io.disconnect(); root.innerHTML = ""; }, go };
  }

  window.KinoWrapped = { mount, card };
})();
