// kino frontend, plain javascript no build step so its easy to edit on the server
(() => {
  "use strict";

  // ---------------------------------------------------------- icons, simple sf symbols lookalikes
  const P = {
    play: "M8 5.14v13.72c0 .8.87 1.3 1.56.88l11.04-6.86a1.03 1.03 0 000-1.76L9.56 4.26A1.03 1.03 0 008 5.14z",
    pause: "M7 4h3.5a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zm6.5 0H17a1 1 0 011 1v14a1 1 0 01-1 1h-3.5a1 1 0 01-1-1V5a1 1 0 011-1z",
    stop: "M7 6h10a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1z",
    close: "M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z",
    back10: "M12 5V2L7 6l5 4V7a6 6 0 11-6 6H4a8 8 0 108-8zm-1.6 10.7h-1v-3.3l-1 .3v-.8l1.9-.6h.1v4.4zm4.6-1.8c0 .6-.1 1.1-.4 1.4-.3.3-.6.5-1.1.5-.5 0-.8-.2-1.1-.5-.3-.3-.4-.8-.4-1.4v-.8c0-.6.1-1.1.4-1.4.3-.3.6-.5 1.1-.5s.8.2 1.1.5c.3.3.4.8.4 1.4v.8zm-1-.9c0-.4 0-.6-.1-.8-.1-.2-.2-.3-.4-.3s-.3.1-.4.3c-.1.2-.1.4-.1.8v1c0 .4 0 .6.1.8.1.2.2.3.4.3s.3-.1.4-.3c.1-.2.1-.4.1-.8v-1z",
    fwd10: "M12 5V2l5 4-5 4V7a6 6 0 106 6h2a8 8 0 11-8-8zm-1.6 10.7h-1v-3.3l-1 .3v-.8l1.9-.6h.1v4.4zm4.6-1.8c0 .6-.1 1.1-.4 1.4-.3.3-.6.5-1.1.5-.5 0-.8-.2-1.1-.5-.3-.3-.4-.8-.4-1.4v-.8c0-.6.1-1.1.4-1.4.3-.3.6-.5 1.1-.5s.8.2 1.1.5c.3.3.4.8.4 1.4v.8zm-1-.9c0-.4 0-.6-.1-.8-.1-.2-.2-.3-.4-.3s-.3.1-.4.3c-.1.2-.1.4-.1.8v1c0 .4 0 .6.1.8.1.2.2.3.4.3s.3-.1.4-.3c.1-.2.1-.4.1-.8v-1z",
    full: "M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z",
    exitfull: "M8 5h2v5H5V8h3V5zm6 0h2v3h3v2h-5V5zM5 14h5v5H8v-3H5v-2zm9 0h5v2h-3v3h-2v-5z",
    vol: "M4 9h4l5-4v14l-5-4H4V9zm12.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z",
    mute: "M4 9h4l5-4v14l-5-4H4V9zm12.6.2l1.4-1.4 2 2 2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2-2-2z",
    cc: "M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm1.5 5v4c0 .8.7 1.5 1.5 1.5h2.5V14H7v-4h2.5V8.5H7c-.8 0-1.5.7-1.5 1.5zm7 0v4c0 .8.7 1.5 1.5 1.5h2.5V14H14v-4h2.5V8.5H14c-.8 0-1.5.7-1.5 1.5z",
    audio: "M12 3a9 9 0 00-9 9v6a3 3 0 003 3h2v-8H5v-1a7 7 0 0114 0v1h-3v8h2a3 3 0 003-3v-6a9 9 0 00-9-9z",
    download: "M11 4h2v8.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3V4zM5 18h14v2H5z",
    search: "M10 3a7 7 0 015.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1110 3zm0 2a5 5 0 100 10 5 5 0 000-10z",
    refresh: "M12 5V2L8 6l4 4V7a5 5 0 11-5 5H5a7 7 0 107-7z",
    check: "M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.4z",
    plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
    link: "M10.6 13.4a1 1 0 001.4 1.4l3.5-3.5a3 3 0 00-4.2-4.2l-1.8 1.7 1.4 1.4 1.8-1.7a1 1 0 011.4 1.4l-3.5 3.5zm2.8-2.8a1 1 0 00-1.4-1.4l-3.5 3.5a3 3 0 004.2 4.2l1.8-1.7-1.4-1.4-1.8 1.7a1 1 0 01-1.4-1.4l3.5-3.5z",
    up: "M2 10h4v11H2zm6 11h9.2c.9 0 1.6-.6 1.9-1.4l2.6-7.2c.3-1-.4-2.1-1.5-2.1H14l.9-4.5c.2-.9-.2-1.8-1-2.2L13 3 8 9v12z",
    down: "M22 14h-4V3h4zM16 3H6.8c-.9 0-1.6.6-1.9 1.4L2.3 11.6c-.3 1 .4 2.1 1.5 2.1H10l-.9 4.5c-.2.9.2 1.8 1 2.2l.9.6 5-6V3z",
    love: "M1 11h3v9H1zm5 9h7.4c.8 0 1.4-.5 1.7-1.2l2-5.6c.3-.9-.4-1.9-1.4-1.9H12l.7-3.6c.1-.7-.2-1.4-.8-1.7L11 5.6 6 11v9zm8.6-14.7L19 1l.6.4c.6.4.9 1.1.8 1.7L19.8 6H23c1 0 1.7 1 1.4 1.9l-1.7 4.8-2-2 .6-1.6H16.6z",
    pencil: "M4 17.2V20h2.8l8.3-8.3-2.8-2.8L4 17.2zM19.7 7a1 1 0 000-1.4l-1.3-1.3a1 1 0 00-1.4 0L15.9 5.4l2.8 2.8L19.7 7z",
    gear: "M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.4-2.5 1a7 7 0 00-1.7-1L15 3.4h-4l-.4 2.6a7 7 0 00-1.7 1l-2.5-1-2 3.4L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.4 2.5-1a7 7 0 001.7 1l.4 2.6h4l.4-2.6a7 7 0 001.7-1l2.5 1 2-3.4zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z",
    trash: "M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7z",
    wand: "M3 19.6L13.6 9l1.4 1.4L4.4 21zM15 3l.9 2.1L18 6l-2.1.9L15 9l-.9-2.1L12 6l2.1-.9zm5 6l.6 1.4L22 11l-1.4.6L20 13l-.6-1.4L18 11l1.4-.6z",
    airplay: "M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2h-2.2l-1.6-2H19V6H5v9h3.8l-1.6 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm7 9l6 7H6z",
    pip: "M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h16V7zm7 4h8v5h-8z",
    speed: "M12 4a9 9 0 00-7.8 13.5l1.7-1A7 7 0 1119 12h2a9 9 0 00-9-8zm4.2 4.3l-5.6 4.1a1.8 1.8 0 102.5 2.5z",
    skip: "M5 5.5v13l9-6.5zm10 0v13h3v-13z",
    lock: "M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0z",
    more: "M6 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z",
    flag: "M5 3h2v18H5zm3 1h10l-2 4 2 4H8z",
    mic: "M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11z",
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

  // Profile icons, made for kino. The order matters, profiles store the number
  const AV = [
    ["Popcorn", "#ff5f6d", "#ffc371", '<path d="M18 28h28l-4 26H22z" fill="#fff"/><path d="M24.5 28l1.8 26M32 28v26M39.5 28l-1.8 26" stroke="#ff5f6d" stroke-width="3"/><circle cx="22" cy="24" r="6" fill="#fff"/><circle cx="32" cy="19" r="7.5" fill="#fff"/><circle cx="42" cy="24" r="6" fill="#fff"/>'],
    ["Rocket", "#4facfe", "#5e5ce6", '<path d="M32 9c8.5 6.5 12.5 15.5 12.5 27L39 42H25l-5.5-6C19.5 24.5 23.5 15.5 32 9z" fill="#fff"/><circle cx="32" cy="27" r="5" fill="#5e5ce6"/><path d="M20 35l-6 11 9-3zM44 35l6 11-9-3z" fill="#fff" opacity=".8"/><path d="M27 44h10l-5 11z" fill="#ffd166"/>'],
    ["Ghost", "#8e2de2", "#4a00e0", '<path d="M18 52V30a14 14 0 0128 0v22l-5-4-4.5 4-4.5-4-4.5 4-4.5-4z" fill="#fff"/><circle cx="26.5" cy="30" r="3.2" fill="#4a00e0"/><circle cx="37.5" cy="30" r="3.2" fill="#4a00e0"/><ellipse cx="32" cy="39" rx="3" ry="2.2" fill="#4a00e0"/>'],
    ["Cat", "#f7971e", "#ffd200", '<path d="M15 27l4-15 11 8h4l11-8 4 15v9c0 9.4-7.6 17-17 17s-17-7.6-17-17z" fill="#fff"/><ellipse cx="25" cy="34" rx="3" ry="4" fill="#333"/><ellipse cx="39" cy="34" rx="3" ry="4" fill="#333"/><path d="M29.5 41h5L32 43.6z" fill="#ff7aa2"/>'],
    ["Planet", "#11998e", "#38ef7d", '<circle cx="32" cy="32" r="13" fill="#fff"/><ellipse cx="32" cy="32" rx="25" ry="7.5" fill="none" stroke="#fff" stroke-width="3.2" transform="rotate(-20 32 32)" opacity=".85"/><circle cx="27" cy="28" r="2.6" fill="#11998e" opacity=".5"/>'],
    ["Bolt", "#f12711", "#f5af19", '<path d="M36 7L15 36h14l-4 21 23-31H34z" fill="#fff"/>'],
    ["Star", "#fc5c7d", "#6a82fb", '<path d="M32 9l6.8 14.5 15.7 1.8-11.6 10.8 3.2 15.6L32 44l-14.1 7.7 3.2-15.6L9.5 25.3l15.7-1.8z" fill="#fff"/>'],
    ["Moon", "#141e30", "#3a6073", '<path d="M40 11a21 21 0 1013 31A17 17 0 0140 11z" fill="#fff"/><circle cx="48" cy="15" r="2" fill="#fff"/><circle cx="54" cy="25" r="1.4" fill="#fff"/>'],
    ["Wave", "#2193b0", "#6dd5ed", '<path d="M6 41c6.5-8 13-8 19.5 0s13 8 19.5 0 13-8 13-4v16H6z" fill="#fff"/><path d="M6 29c6.5-8 13-8 19.5 0s13 8 19.5 0 9-5.5 13-4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>'],
    ["Peak", "#355c7d", "#c06c84", '<path d="M5 51l19-28 9 12 7-9 19 25z" fill="#fff"/><path d="M24 23l-4.4 6.5 4.4-1.5 4 2.5z" fill="#355c7d" opacity=".35"/><circle cx="47" cy="15" r="5" fill="#fff" opacity=".85"/>'],
    ["Flame", "#ee0979", "#ff6a00", '<path d="M32 7c4.5 10.5 14.5 14.5 14.5 29a14.5 14.5 0 01-29 0c0-7.5 4.2-11.6 6.4-14.6 1 5.2 4 7.5 6.2 7.5-2-8.4 0-14.9 1.9-21.9z" fill="#fff"/><path d="M32 33c2.5 4 6 6 6 11a6 6 0 01-12 0c0-4 3.5-6 6-11z" fill="#ff6a00"/>'],
    ["Gamer", "#00b09b", "#96c93d", '<path d="M20 21h24a10 10 0 0110 10l2.2 13a6.2 6.2 0 01-10.5 4.6L40.5 43h-17l-5.2 5.6A6.2 6.2 0 017.8 44L10 31a10 10 0 0110-10z" fill="#fff"/><path d="M21 28v9M16.5 32.5h9" stroke="#00b09b" stroke-width="3.4" stroke-linecap="round"/><circle cx="42" cy="30" r="2.7" fill="#00b09b"/><circle cx="47" cy="35.5" r="2.7" fill="#00b09b"/>'],
    ["Tune", "#c471f5", "#fa71cd", '<path d="M25 15l23-5.5v31.5a7.5 7.5 0 11-4.4-6.8V18.6L29.4 21.9v24.6a7.5 7.5 0 11-4.4-6.8z" fill="#fff"/>'],
    ["Director", "#232526", "#636b72", '<rect x="11" y="27" width="42" height="26" rx="3.5" fill="#fff"/><path d="M11 19.5l39-8.5 2.2 9.5-39 8.5z" fill="#fff"/><path d="M19 17.8l5.4 7.6M29 15.6l5.4 7.6M39 13.4l5.4 7.6" stroke="#3a3d40" stroke-width="3.2"/>'],
    ["Alien", "#56ab2f", "#a8e063", '<path d="M32 9c12.2 0 21 9 21 20.5C53 43 41.5 55 32 55S11 43 11 29.5C11 18 19.8 9 32 9z" fill="#fff"/><path d="M19.5 30c4.5 0 9.6 2.3 10.8 7.6-5.4 1-10.8-2.2-10.8-7.6zM44.5 30c-4.5 0-9.6 2.3-10.8 7.6 5.4 1 10.8-2.2 10.8-7.6z" fill="#2d5016"/>'],
    ["Crown", "#b8860b", "#ffd700", '<path d="M9 21l12 11 11-17 11 17 12-11-4.5 27h-37z" fill="#fff"/><rect x="13.5" y="50" width="37" height="4.5" rx="2.2" fill="#fff"/><circle cx="32" cy="38" r="3" fill="#b8860b"/>'],
    ["Leaf", "#134e5e", "#71b280", '<path d="M51 11C26 11 13 23.5 13 40.5c0 4.2 1 8.3 3.2 11.4 3.2-12.6 11.6-22 23-27.2C30 32 23.6 40.5 20.5 53c3 1.1 6.3 1.6 9.5 1.6C49 54.6 53.3 33.6 51 11z" fill="#fff"/>'],
    ["Dice", "#e53935", "#e35d5b", '<rect x="13" y="13" width="38" height="38" rx="9" fill="#fff"/><circle cx="23.5" cy="23.5" r="3.8" fill="#e53935"/><circle cx="32" cy="32" r="3.8" fill="#e53935"/><circle cx="40.5" cy="40.5" r="3.8" fill="#e53935"/><circle cx="40.5" cy="23.5" r="3.8" fill="#e53935"/><circle cx="23.5" cy="40.5" r="3.8" fill="#e53935"/>'],
  ];
  const avatar = (i, cls = "") => {
    const a = AV[i] || AV[0];
    return `<span class="av ${cls}" style="--a:${a[1]};--b:${a[2]}" aria-hidden="true"><svg viewBox="0 0 64 64">${a[3]}</svg></span>`;
  };

  // ---------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (u, trim) => (u ? "/api/img?u=" + encodeURIComponent(u) + (trim ? "&trim=1" : "") : "");
  const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bytes = (b, d = 1) => {
    if (b == null) return "–";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return `${b.toFixed(i < 2 ? 0 : d)} ${u[i]}`;
  };
  const rate = (b) => (b == null ? "–" : bytes(b) + "/s");
  const clock = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
  };
  const dur = (s) => {
    s = Math.round(s || 0);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d) return `${d} d ${h} hr`;
    if (h) return `${h} hr ${m} min`;
    if (m) return `${m} min`;
    return `${s} sec`;
  };
  const when = (ts) => {
    if (!ts) return "Not scheduled";
    const d = new Date(ts * 1000), now = new Date();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const day = Math.round((new Date(d.toDateString()) - new Date(now.toDateString())) / 86400000);
    if (day === 0) return `Today at ${time}`;
    if (day === 1) return `Tomorrow at ${time}`;
    if (day === -1) return `Yesterday at ${time}`;
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ` at ${time}`;
  };
  const ago = (ts) => {
    const s = Date.now() / 1000 - ts;
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} d ago`;
  };
  // Some episode names come in ALL CAPS from cinemeta, this makes them read normally
  const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs"]);
  const nice = (t) => {
    if (!t || t !== t.toUpperCase() || !/[A-Z]{3}/.test(t)) return t;
    return t.toLowerCase().split(" ").map((w, i) => (i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  };
  const epLabel = (s, e) => (s != null && e != null ? `S${s}, E${e}` : e != null ? `Episode ${e}` : "");

  let toastT;
  function toast(msg, ms = 3500) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.hidden = true), ms);
  }

  async function api(url, body, method) {
    const opt = { method: method || (body !== undefined ? "POST" : "GET"), headers: { "X-Kino": "1" }, credentials: "same-origin" };
    if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    let j = null;
    try { j = await r.json(); } catch (_) {}
    if (r.status === 409) { ME.profile = null; location.hash = "#/profiles"; throw new Error("pick profile"); }
    if (r.status === 401 && url.startsWith("/api/admin/") && !url.endsWith("/login")) {
      ME.admin = null;
      throw new Error((j && j.detail) || "Sign in as admin to do that");
    }
    if (!r.ok) { const e = new Error((j && j.detail) || `Request failed (${r.status})`); e.status = r.status; throw e; }
    if (r.status === 202) return { ...j, _pending: true };
    return j;
  }

  // Broken poster or logo images get swapped for a fallback, done here cause the csp blocks inline onerror
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName !== "IMG") return;
    if (el.dataset.alt && !el.dataset.altTried) { el.dataset.altTried = "1"; el.src = img(el.dataset.alt); return; }
    if (el.dataset.fallback === "text") {
      const s = document.createElement("h1");
      s.className = el.dataset.cls || "hero-name";
      s.textContent = el.alt;
      el.replaceWith(s);
    } else if (el.dataset.fallback === "hide") el.remove();
    else if (el.dataset.fallback === "ph") {
      const d = document.createElement("div");
      d.className = "ph"; d.style.setProperty("--h", hue(el.alt)); d.textContent = el.alt;
      el.replaceWith(d);
    }
  }, true);

  // ---------------------------------------------------------- sheets, the in app popups (no browser alerts)
  let sheetClose = null;
  function sheet(html, { wide = false, onClose } = {}) {
    closeSheet();
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const prev = document.activeElement;
    const close = () => { wrap.remove(); sheetClose = null; document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); onClose && onClose(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    $$("[data-close]", wrap).forEach((b) => (b.onclick = close));
    sheetClose = close;
    const f = wrap.querySelector("input, button:not([data-close]), select");
    if (f) setTimeout(() => f.focus(), 30);
    return { el: wrap.firstElementChild, close };
  }
  const closeSheet = () => sheetClose && sheetClose();

  function confirmSheet(title, text, action, danger = true) {
    return new Promise((res) => {
      let done = false;
      const s = sheet(`<h2>${esc(title)}</h2><p class="secondary">${esc(text)}</p>
        <div class="actions end"><button class="btn secondary small" data-close>Cancel</button>
        <button class="btn ${danger ? "danger-solid" : "primary"} small" id="cfOk">${esc(action)}</button></div>`, { onClose: () => !done && res(false) });
      $("#cfOk", s.el).onclick = () => { done = true; s.close(); res(true); };
    });
  }

  // ---------------------------------------------------------- state
  const ME = { profile: null, admin: null, ip: null };
  let POLL = null, SYNC = null, HERO_T = null;
  const isAdmin = () => !!ME.admin;

  // ---------------------------------------------------------- shell
  function topbar(active) {
    const tabs = [["home", "Home"], ["movies", "Movies"], ["shows", "Shows"], ["search", "Search"]];
    if (isAdmin()) tabs.push(["sync", "Sync"], ["server", "Server"]);
    const p = ME.profile;
    return `<header class="topbar" id="topbar">
      <a class="brand" href="#/home" aria-label="Kino home"><span class="brand-dot">${ic("play")}</span><span>Kino</span></a>
      <nav class="tabs glass" aria-label="Sections">${tabs.map(([k, l]) => `<a class="tab" href="#/${k}" ${k === active ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div class="top-right">
        ${isAdmin() ? `<a href="#/sync" class="sync-chip glass" id="syncChip"><span class="dot"></span><span class="txt">Sync</span></a>` : ""}
        <div class="menu-wrap">
          <button class="avatar-btn" id="avatarBtn" aria-haspopup="true" aria-label="Profile menu">${avatar(p.icon, "sm")}</button>
          <div class="menu drop" id="avatarMenu" hidden>
            <div class="menu-head">${avatar(p.icon, "xs")}<span>${esc(p.name)}</span></div>
            <a href="#/profiles" class="mi">Switch Profile</a>
            <a href="#/settings" class="mi">Settings</a>
            ${isAdmin() ? `<button class="mi" id="adminOut">Sign Out of Admin</button>` : `<button class="mi" id="adminIn">${ic("lock")} Admin Sign In</button>`}
          </div>
        </div>
      </div>
    </header>`;
  }

  function wireTopbar() {
    const b = $("#avatarBtn"), m = $("#avatarMenu");
    b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; };
    const ai = $("#adminIn"); if (ai) ai.onclick = () => adminLogin(() => route());
    const ao = $("#adminOut"); if (ao) ao.onclick = async () => { await api("/api/admin/logout", {}); ME.admin = null; toast("Signed out of admin"); route(); };
    const tb = $("#topbar");
    const onScroll = () => tb.classList.toggle("solid", window.scrollY > 40);
    window.onscroll = onScroll; onScroll();
    updateSyncChip();
  }
  document.addEventListener("click", () => { const m = $("#avatarMenu"); if (m) m.hidden = true; });

  function syncState(s) {
    if (!s) return { cls: "", text: "Sync" };
    if (s.paused) return { cls: "paused", text: "Paused" };
    const st = s.service.state;
    if (st === "active" || st === "activating") {
      const c = s.current;
      if (c && c.total) return { cls: "running", text: `${Math.floor((c.bytes / c.total) * 100)}%` };
      return { cls: "running", text: "Syncing" };
    }
    if (s.status && s.status.last_run && s.status.last_run.result === "error") return { cls: "error", text: "Error" };
    return { cls: "", text: "Idle" };
  }
  function updateSyncChip() {
    const c = $("#syncChip");
    if (!c || !SYNC) return;
    const s = syncState(SYNC);
    c.className = `sync-chip glass ${s.cls}`;
    c.querySelector(".txt").textContent = s.text;
  }

  // ---------------------------------------------------------- admin sign in
  function adminLogin(then) {
    const s = sheet(`<form id="adminForm" autocomplete="on">
      <div class="sheet-icon">${ic("lock")}</div>
      <h2>Admin Sign In</h2>
      <p class="secondary">For the sync, server and settings. Watching doesn't need this.</p>
      <label class="field"><span class="sr">Username</span><input name="username" autocomplete="username" placeholder="Username" required autocapitalize="none" spellcheck="false"></label>
      <label class="field"><span class="sr">Password</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" required></label>
      <div class="form-err" id="adminErr" role="alert"></div>
      <div class="actions end"><button type="button" class="btn secondary small" data-close>Cancel</button><button class="btn primary small" type="submit">Sign In</button></div>
      </form>`);
    const f = $("#adminForm", s.el);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const r = await api("/api/admin/login", { username: f.username.value, password: f.password.value });
        ME.admin = r.admin;
        s.close();
        toast(`Signed in as ${r.admin}`);
        then && then();
      } catch (er) {
        $("#adminErr", s.el).textContent = er.message;
        btn.disabled = false;
        f.password.value = "";
        f.password.focus();
      }
    };
  }

  // ---------------------------------------------------------- who's watching
  async function pageProfiles(manage) {
    stopPoll();
    window.onscroll = null;
    const r = await api("/api/profiles");
    ME.admin = r.admin;
    app.innerHTML = `<main class="who">
      <div class="who-corner">${isAdmin()
        ? `<span class="secondary">Signed in as ${esc(ME.admin)}</span><button class="btn secondary small" id="adminOut2">Sign Out</button>`
        : `<button class="btn secondary small" id="adminIn2">${ic("lock")} Admin</button>`}</div>
      <h1 class="who-title">${manage ? "Manage Profiles" : "Who's Watching?"}</h1>
      <div class="who-grid ${manage ? "managing" : ""}">
        ${r.profiles.map((p) => `<button class="who-tile" data-pid="${p.id}" aria-label="${manage ? "Edit" : "Watch as"} ${esc(p.name)}">
          <span class="who-av">${avatar(p.icon, "lg")}${manage ? `<span class="who-edit">${ic("pencil")}</span>` : ""}</span>
          <span class="who-name">${esc(p.name)}</span></button>`).join("")}
        ${isAdmin() ? `<button class="who-tile add" id="addProfile" aria-label="Add a profile"><span class="who-av"><span class="av lg addav">${ic("plus")}</span></span><span class="who-name">Add Profile</span></button>` : ""}
      </div>
      <div class="who-actions">${manage ? `<button class="btn primary" id="doneManage">Done</button>` : `<button class="btn outline" id="manageBtn">Manage Profiles</button>`}</div>
    </main>`;
    $$(".who-tile[data-pid]").forEach((b) => (b.onclick = async () => {
      const p = r.profiles.find((x) => x.id === Number(b.dataset.pid));
      if (manage) return editProfile(p, () => pageProfiles(true));
      const res = await api(`/api/profiles/${p.id}/select`, {});
      ME.profile = res.profile;
      location.hash = "#/home";
      if (location.hash === "#/home") route();
    }));
    const add = $("#addProfile"); if (add) add.onclick = () => editProfile(null, () => pageProfiles(manage));
    const mb = $("#manageBtn"); if (mb) mb.onclick = () => pageProfiles(true);
    const dm = $("#doneManage"); if (dm) dm.onclick = () => pageProfiles(false);
    const ai = $("#adminIn2"); if (ai) ai.onclick = () => adminLogin(() => pageProfiles(manage));
    const ao = $("#adminOut2"); if (ao) ao.onclick = async () => { await api("/api/admin/logout", {}); ME.admin = null; pageProfiles(manage); };
    const first = $(".who-tile"); if (first) first.focus();
  }

  // Edit or add a profile: name and icon. Editing your own works for everyone, adding and deleting is admin only
  function editProfile(p, done) {
    const isNew = !p;
    let icon = p ? p.icon : Math.floor(Math.random() * AV.length);
    const s = sheet(`<h2>${isNew ? "Add Profile" : "Edit Profile"}</h2>
      <div class="edit-top"><span id="epPreview">${avatar(icon, "lg")}</span>
        <label class="field grow"><span class="sr">Name</span><input id="epName" maxlength="24" placeholder="Name" value="${esc(p ? p.name : "")}"></label></div>
      <h3 class="sheet-sub">Choose an Icon</h3>
      <div class="icon-grid" role="radiogroup" aria-label="Profile icon">${AV.map((a, i) => `<button class="icon-pick" role="radio" aria-checked="${i === icon}" data-i="${i}" aria-label="${a[0]}">${avatar(i, "md")}</button>`).join("")}</div>
      <div class="form-err" id="epErr" role="alert"></div>
      <div class="actions between">
        ${!isNew && isAdmin() ? `<button class="btn danger small" id="epDel">${ic("trash")} Delete Profile</button>` : "<span></span>"}
        <div class="actions"><button class="btn secondary small" data-close>Cancel</button><button class="btn primary small" id="epSave">Save</button></div>
      </div>`, { wide: true });
    $$(".icon-pick", s.el).forEach((b) => (b.onclick = () => {
      icon = Number(b.dataset.i);
      $$(".icon-pick", s.el).forEach((x) => x.setAttribute("aria-checked", x === b));
      $("#epPreview", s.el).innerHTML = avatar(icon, "lg");
    }));
    $("#epSave", s.el).onclick = async () => {
      const name = $("#epName", s.el).value;
      try {
        if (isNew) await api("/api/admin/profiles", { name, icon });
        else if (ME.profile && ME.profile.id === p.id) { const r = await api("/api/profile", { name, icon }, "PUT"); ME.profile = r.profile; }
        else if (isAdmin()) await api(`/api/admin/profiles/${p.id}`, { name, icon }, "PUT");
        else {
          // Not admin and not your own profile, switch to it first then save
          const sel = await api(`/api/profiles/${p.id}/select`, {});
          ME.profile = sel.profile;
          const r = await api("/api/profile", { name, icon }, "PUT"); ME.profile = r.profile;
        }
        s.close(); toast(isNew ? "Profile added" : "Profile saved"); done && done();
      } catch (e) { $("#epErr", s.el).textContent = e.message; }
    };
    const del = $("#epDel", s.el);
    if (del) del.onclick = async () => {
      s.close();
      if (!(await confirmSheet(`Delete ${p.name}?`, "Their watch history, ratings and settings are deleted too. This can't be undone.", "Delete Profile"))) return editProfile(p, done);
      try { await api(`/api/admin/profiles/${p.id}`, undefined, "DELETE"); if (ME.profile && ME.profile.id === p.id) ME.profile = null; toast("Profile deleted"); done && done(); }
      catch (e) { toast(e.message, 5000); }
    };
  }

  // ---------------------------------------------------------- tiles
  function posterTile(t) {
    const art = t.poster
      ? `<img loading="lazy" src="${img(t.poster)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const sub = t.kind === "series" ? `${t.count} episode${t.count === 1 ? "" : "s"}` : t.releaseInfo || "";
    const mark = t.watched ? `<span class="tile-check" title="Watched">${ic("check")}</span>` : "";
    return `<a class="tile poster" href="#/title/${t.id}"><div class="art">${art}${mark}</div><div class="cap">${esc(t.name)}</div><div class="sub">${esc(sub)}</div></a>`;
  }
  function wideTile(t, opts = {}) {
    const bg = t.background
      ? `<img loading="lazy" src="${img(t.background)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const logo = t.logo && t.background && opts.progress == null ? `<img class="logo-over" loading="lazy" src="${img(t.logo, 1)}" alt="" data-fallback="hide">` : "";
    const bar = opts.progress != null && opts.progress > 0 ? `<div class="bar"><i style="width:${Math.min(100, opts.progress * 100)}%"></i></div>` : "";
    const href = opts.href || `#/title/${t.id}`;
    return `<a class="tile landscape" href="${href}" ${opts.play ? `data-play="${opts.play}" data-tid="${t.id}"` : ""}><div class="art">${bg}${logo}${bar}${opts.play ? `<span class="tile-play">${ic("play")}</span>` : ""}</div>
      <div class="cap">${esc(t.name)}</div><div class="sub">${esc(opts.sub || t.genres?.slice(0, 2).join(", ") || t.releaseInfo || "")}</div></a>`;
  }
  const metaLine = (t) => [t.kind === "series" ? "TV Show" : "Movie", t.releaseInfo, t.genres?.slice(0, 2).join(", "), t.runtime, t.rating ? `IMDb ${t.rating}` : ""].filter(Boolean);

  // ---------------------------------------------------------- home
  async function pageHome() {
    const h = await api("/api/home");
    if (h.empty) {
      app.innerHTML = topbar("home") + `<main class="page"><div class="empty">
        <h2>${h.scanning ? "Scanning your Storage Box" : !h.mounted ? "The Storage Box isn't connected" : "Nothing here yet"}</h2>
        <p>${h.error ? esc(h.error) : h.scanning ? "This takes a moment the first time." : "Videos show up here once the sync has downloaded them."}</p>
        ${isAdmin() ? `<a class="btn secondary small" href="#/sync">Open Sync</a>` : ""}</div></main>`;
      wireTopbar();
      if (h.scanning) setTimeout(() => location.hash === "#/home" && route(), 4000);
      return;
    }
    const heroes = h.hero;
    app.innerHTML = topbar("home") + `
      ${!h.mounted ? `<div class="banner" role="status">The Storage Box isn't connected right now, it's being reconnected automatically.</div>` : ""}
      <section class="hero" id="hero" aria-roledescription="carousel" aria-label="Featured">
        ${heroes.map((t, i) => `<div class="hero-slide ${i === 0 ? "on" : ""}" data-i="${i}" ${i ? 'aria-hidden="true"' : ""}>
          <div class="hero-bg">${t.background ? `<img ${i ? "loading=\"lazy\"" : ""} src="${img(t.background.replace("/medium/", "/large/"))}" data-alt="${esc(t.background)}" alt="" data-fallback="hide">` : ""}</div>
          <div class="hero-content">
            ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
            <div class="hero-meta">${metaLine(t).map((m, j) => `<span class="${j ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
            ${t.description ? `<p class="hero-desc">${esc(t.description)}</p>` : ""}
            <div class="actions">
              <button class="btn primary" data-heroplay="${t.id}" ${i ? 'tabindex="-1"' : ""}>${ic("play")} Play</button>
              <a class="btn secondary" href="#/title/${t.id}" ${i ? 'tabindex="-1"' : ""}>More Info</a>
            </div>
          </div></div>`).join("")}
        ${heroes.length > 1 ? `<div class="hero-dots" role="tablist">${heroes.map((t, i) => `<button role="tab" aria-selected="${i === 0}" aria-label="Show ${esc(t.name)}" data-dot="${i}"></button>`).join("")}</div>` : ""}
        ${isAdmin() ? `<a class="hero-live glass" id="heroLive" href="#/sync" hidden></a>` : ""}
      </section>
      <main class="page" style="padding-top:8px">
        ${h.shelves.map((s) => `<section class="shelf" aria-label="${esc(s.title)}"><h2 class="section-title">${esc(s.title)}${s.more ? ` <a href="${s.more}">See All</a>` : ""}</h2>
          <div class="row ${s.style === "poster" ? "posters" : "wide"}">${s.items.map((t) => s.style === "poster" ? posterTile(t)
            : s.style === "continue" ? wideTile(t, { progress: t.dur ? t.pos / t.dur : 0, play: t.file_id,
                sub: t.kind === "series" ? `${epLabel(t.season, t.episode)}${t.next_episode ? " · Next episode" : t.dur ? ` · ${clock(t.dur - t.pos)} left` : ""}` : `${clock(t.dur - t.pos)} left` })
            : wideTile(t)).join("")}</div></section>`).join("")}
      </main>`;
    wireTopbar();
    startHero(heroes.length);

    app.querySelectorAll("[data-play]").forEach((a) => a.addEventListener("click", async (e) => {
      e.preventDefault();
      const t = await api(`/api/title/${a.dataset.tid}`);
      const f = t.files.find((x) => x.id === a.dataset.play);
      playFile(a.dataset.play, { title: t, from: f && f.progress ? f.progress.pos : 0 });
    }));
    app.querySelectorAll("[data-heroplay]").forEach((b) => (b.onclick = async () => {
      const t = await api(`/api/title/${b.dataset.heroplay}`);
      const f = nextUp(t);
      if (f) playFile(f.id, { title: t, from: f.progress ? f.progress.pos : 0 });
    }));
    if (isAdmin()) startPoll(pollHomeSync, 5000);
  }

  // Rotating hero, slow crossfade every 9 seconds, stops when you hover or focus it
  function startHero(n) {
    clearInterval(HERO_T);
    if (n < 2) return;
    let i = 0, paused = false;
    const hero = $("#hero");
    const show = (k) => {
      i = (k + n) % n;
      $$(".hero-slide", hero).forEach((s, j) => {
        s.classList.toggle("on", j === i);
        s.setAttribute("aria-hidden", j !== i);
        $$("a,button", s).forEach((b) => (j === i ? b.removeAttribute("tabindex") : b.setAttribute("tabindex", "-1")));
      });
      $$("[data-dot]", hero).forEach((d, j) => d.setAttribute("aria-selected", j === i));
    };
    $$("[data-dot]", hero).forEach((d) => (d.onclick = () => show(Number(d.dataset.dot))));
    ["mouseenter", "focusin"].forEach((ev) => hero.addEventListener(ev, () => (paused = true)));
    ["mouseleave", "focusout"].forEach((ev) => hero.addEventListener(ev, () => (paused = false)));
    if (reduceMotion()) return;
    HERO_T = setInterval(() => { if (!paused && !document.hidden && $("#hero")) show(i + 1); else if (!$("#hero")) clearInterval(HERO_T); }, 9000);
  }

  async function pollHomeSync() {
    SYNC = await api("/api/admin/sync");
    updateSyncChip();
    const el = $("#heroLive");
    if (!el) return;
    const c = SYNC.current;
    if (!c) { el.hidden = true; return; }
    const pct = c.total ? c.bytes / c.total : 0;
    el.hidden = false;
    el.innerHTML = `${SYNC.poster ? `<img src="${img(SYNC.poster)}" alt="" data-fallback="hide">` : ""}
      <div class="grow"><div class="lbl">Downloading to your Storage Box</div>
      <div class="nm">${esc(c.title || c.name)}${c.episode != null ? ` ${esc(epLabel(c.season, c.episode))}` : ""}</div>
      <div class="progress thin"><i style="width:${pct * 100}%"></i></div>
      <div class="lbl">${Math.floor(pct * 100)}% · ${rate(c.speed)}</div></div>`;
  }

  // Picks what Play should start, the first unfinished episode or the movie
  function nextUp(t) {
    const files = t.files;
    if (!files.length) return null;
    if (t.kind === "series") {
      const started = files.filter((f) => f.progress);
      if (started.length) return started.sort((a, b) => b.progress.updated - a.progress.updated)[0];
      const firstUnwatched = files.find((f) => !f.watched);
      return firstUnwatched || files[0];
    }
    return files[0];
  }

  // ---------------------------------------------------------- movies and shows
  async function pageBrowse(kind) {
    const lib = await api("/api/library");
    const list = lib.titles.filter((t) => t.kind === kind);
    const genres = [...new Set(list.flatMap((t) => t.genres || []))].sort();
    app.innerHTML = topbar(kind === "movie" ? "movies" : "shows") + `<main class="page">
      <h1 class="large-title">${kind === "movie" ? "Movies" : "TV Shows"}</h1>
      <div class="toolbar">
        <label class="search">${ic("search")}<span class="sr">Filter</span><input id="q" type="search" placeholder="Filter ${kind === "movie" ? "movies" : "shows"}"></label>
        <select class="plain" id="sort" aria-label="Sort"><option value="added">Recently Added</option><option value="name">Name</option><option value="year">Year</option><option value="rating">Rating</option></select>
        <select class="plain" id="genre" aria-label="Genre"><option value="">All Genres</option>${genres.map((g) => `<option>${esc(g)}</option>`).join("")}</select>
        <select class="plain" id="seen" aria-label="Watched"><option value="">Watched and Unwatched</option><option value="no">Unwatched</option><option value="yes">Watched</option></select>
        <span class="secondary" id="count" style="font-size:15px"></span>
      </div>
      <div class="grid" id="grid"></div></main>`;
    wireTopbar();
    const draw = () => {
      const q = $("#q").value.trim().toLowerCase(), g = $("#genre").value, s = $("#sort").value, w = $("#seen").value;
      let r = list.filter((t) => (!q || t.name.toLowerCase().includes(q)) && (!g || (t.genres || []).includes(g)) && (!w || (w === "yes") === t.watched));
      r = r.slice().sort((a, b) => s === "name" ? a.name.localeCompare(b.name) : s === "year" ? String(b.releaseInfo || "").localeCompare(String(a.releaseInfo || ""))
        : s === "rating" ? (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) : b.added - a.added);
      $("#grid").innerHTML = r.length ? r.map(posterTile).join("") : `<div class="empty" style="grid-column:1/-1"><h2>No matches</h2><p>Try a different filter or genre.</p></div>`;
      $("#count").textContent = `${r.length} ${kind === "movie" ? "movie" : "show"}${r.length === 1 ? "" : "s"}`;
    };
    ["q", "genre", "sort", "seen"].forEach((id) => $("#" + id).addEventListener("input", draw));
    draw();
  }

  // ---------------------------------------------------------- search
  async function pageSearch() {
    const start = decodeURIComponent((location.hash.split("?q=")[1] || ""));
    app.innerHTML = topbar("search") + `<main class="page">
      <div class="search big">${ic("search")}<label class="sr" for="sq">Search</label><input id="sq" type="search" placeholder="Films, shows, actors and more" value="${esc(start)}" autocomplete="off">
        <button class="mic-btn" id="micBtn" type="button" aria-label="Search by Voice" title="Search by Voice" hidden>${ic("mic")}</button></div>
      <div id="sres"></div></main>`;
    wireTopbar();
    const input = $("#sq");
    input.focus();
    setupMic(input, () => run());
    let t, seq = 0;
    const run = async () => {
      const q = input.value.trim();
      history.replaceState(null, "", "#/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
      const box = $("#sres");
      if (!q) { box.innerHTML = `<div class="empty"><h2>Search Kino</h2><p>Find films and shows by name, actor, genre or episode title.</p></div>`; return; }
      const my = ++seq;
      const r = await api("/api/search?q=" + encodeURIComponent(q));
      if (my !== seq || !$("#sres")) return;
      box.innerHTML = (r.titles.length ? `<h2 class="section-title" style="margin-top:28px">Films and Shows</h2><div class="grid">${r.titles.map(posterTile).join("")}</div>` : "")
        + (r.episodes.length ? `<h2 class="section-title" style="margin-top:36px">Episodes</h2><div class="grid wide-grid">${r.episodes.map((e) => `
          <a class="tile landscape" href="#/title/${e.title_id}" data-play="${e.file_id}" data-tid="${e.title_id}"><div class="art">${e.thumbnail ? `<img loading="lazy" src="${img(e.thumbnail)}" alt="${esc(e.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(e.show)}">${esc(e.name)}</div>`}<span class="tile-play">${ic("play")}</span></div>
          <div class="cap">${esc(nice(e.name))}</div><div class="sub">${esc(e.show)} · ${esc(epLabel(e.season, e.episode))}</div></a>`).join("")}</div>` : "")
        || `<div class="empty"><h2>Nothing found for “${esc(q)}”</h2><p>Check the spelling or try an actor or genre.</p></div>`;
      $$("[data-play]", box).forEach((a) => a.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const tt = await api(`/api/title/${a.dataset.tid}`);
        playFile(a.dataset.play, { title: tt, from: 0 });
      }));
    };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 220); });
    run();
  }

  // Voice search with the browsers own speech recognition, the button only shows where the browser has it
  function setupMic(input, onDone) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $("#micBtn");
    if (!SR || !btn) return;
    btn.hidden = false;
    let rec = null;
    btn.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = navigator.language || "en-GB";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      btn.classList.add("listening");
      btn.setAttribute("aria-label", "Stop Listening");
      input.placeholder = "Listening…";
      rec.onresult = (e) => {
        input.value = Array.from(e.results).map((r) => r[0].transcript).join("").replace(/[.?!]$/, "");
        input.dispatchEvent(new Event("input"));
      };
      rec.onerror = (e) => toast(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone access is blocked, allow it in your browser settings" : e.error === "no-speech" ? "Didn't catch that, try again" : "Voice search isn't working right now");
      rec.onend = () => {
        rec = null;
        btn.classList.remove("listening");
        btn.setAttribute("aria-label", "Search by Voice");
        input.placeholder = "Films, shows, actors and more";
        onDone && onDone();
      };
      try { rec.start(); } catch (_) { rec = null; btn.classList.remove("listening"); }
    };
  }

  // ---------------------------------------------------------- title detail
  async function pageTitle(id) {
    const t = await api(`/api/title/${id}`);
    const up = nextUp(t);
    const allBadges = [...new Set(t.files.flatMap((f) => f.badges))];
    const resume = up && up.progress && up.progress.dur && up.progress.pos > 30;
    const playLabel = resume ? `Resume${t.kind === "series" ? " " + epLabel(up.season, up.episode) : ""}` : t.kind === "series" && up ? `Play ${epLabel(up.season, up.episode)}` : "Play";
    const seasons = [...new Set(t.files.map((f) => f.season ?? 0))].sort((a, b) => a - b);
    const curSeason = up ? up.season ?? 0 : seasons[0];
    const rateBtn = (v, icon, label) => `<button class="round-btn ${t.my_rating === v ? "on" : ""}" data-rate="${v}" aria-pressed="${t.my_rating === v}" aria-label="${label}" title="${label}">${ic(icon)}</button>`;

    app.innerHTML = topbar(t.kind === "series" ? "shows" : "movies") + `
      <section class="detail-hero">
        <div class="hero-bg">${t.background ? `<img src="${img(t.background.replace("/medium/", "/large/"))}" data-alt="${esc(t.background)}" alt="" data-fallback="hide" style="width:100%;height:100%;object-fit:cover;object-position:center 20%">` : ""}</div>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo, 1)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
          <div class="hero-meta">${metaLine(t).map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${allBadges.length ? `<div class="badges" style="margin-bottom:16px">${allBadges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>` : ""}
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:4">${esc(t.description)}</p>` : ""}
          <div class="actions">
            ${up ? `<button class="btn primary" id="playMain">${ic("play")} ${esc(playLabel)}</button>` : ""}
            ${resume ? `<button class="btn secondary" id="playStart">Start Over</button>` : ""}
            <button class="round-btn ${t.watched ? "on" : ""}" id="watchedBtn" aria-pressed="${t.watched}" aria-label="${t.watched ? "Mark as unwatched" : "Mark as watched"}" title="${t.watched ? "Watched" : "Mark as watched"}">${ic(t.watched ? "check" : "plus")}</button>
            <span class="rate-group" role="group" aria-label="Rate this">${rateBtn(-1, "down", "Not for me")}${rateBtn(1, "up", "I like this")}${rateBtn(2, "love", "Love this")}</span>
            ${t.kind === "movie" && up ? `<button class="round-btn" id="dlMain" aria-label="Download" title="Download">${ic("download")}</button>` : ""}
            ${t.is_admin ? `<div class="menu-wrap"><button class="round-btn" id="adminMore" aria-haspopup="true" aria-label="Admin options" title="Admin options">${ic("more")}</button>
              <div class="menu drop up-left" id="adminMenu" hidden>
                <button class="mi" id="fixMatch">${ic("wand")} Fix Match</button>
                <button class="mi" id="rescanT">${ic("refresh")} Rescan Library</button>
                <button class="mi danger" id="delTitle">${ic("trash")} Delete from Library</button>
              </div></div>` : ""}
          </div>
          ${resume ? `<div class="progress thin" style="max-width:280px;margin-top:16px"><i style="width:${(up.progress.pos / up.progress.dur) * 100}%"></i></div>
            <div class="note">${clock(up.progress.dur - up.progress.pos)} left</div>` : ""}
        </div>
      </section>
      <main class="page" style="padding-top:12px">
        ${t.kind === "series" ? `<section class="section" style="margin-top:0">
          <div class="seasons" role="group" aria-label="Seasons">${seasons.map((s) => `<button class="seg" data-season="${s}" aria-pressed="${s === curSeason}">${s ? `Season ${s}` : "Extras"}</button>`).join("")}</div>
          <div class="episodes" id="eps"></div></section>` : ""}
        ${t.kind === "movie" && t.files.length > 1 ? `<section class="section"><h2 class="section-title">Versions</h2><div class="versions">${t.files.map((f) => `
          <div class="v"><div class="grow"><div class="badges">${f.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div><div class="nm">${esc(f.name)}</div></div>
          <span class="secondary" style="font-size:14px">${bytes(f.size)}</span><button class="btn secondary small" data-playfile="${f.id}">${ic("play")} Play</button>
          ${t.is_admin ? `<button class="round-btn sm" data-delfile="${f.id}" aria-label="Delete this version" title="Delete this version">${ic("trash")}</button>` : ""}</div>`).join("")}</div></section>` : ""}
        ${t.cast?.length ? `<section class="section"><h2 class="section-title">Cast</h2><div class="cast">${t.cast.map((c) => `<a href="#/search?q=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div></section>` : ""}
        <section class="section"><div class="facts">
          ${t.director ? `<div><h4>Director</h4><p>${esc([].concat(t.director).join(", "))}</p></div>` : ""}
          <div><h4>In Your Library</h4><p>${t.files.length} file${t.files.length === 1 ? "" : "s"}, ${bytes(t.size)}</p></div>
          ${t.genres?.length ? `<div><h4>Genres</h4><p>${esc(t.genres.join(", "))}</p></div>` : ""}
          ${!t.matched ? `<div><h4>Info</h4><p>Couldn't find this title on Cinemeta, so its shown with the file name.${t.is_admin ? " Use Fix match to pick the right one." : ""}</p></div>` : ""}
        </div></section>
      </main>`;
    wireTopbar();
    window.scrollTo(0, 0);

    const drawEps = (season) => {
      const eps = t.files.filter((f) => (f.season ?? 0) === season);
      $("#eps").innerHTML = eps.map((f) => {
        const p = f.progress && f.progress.dur ? f.progress.pos / f.progress.dur : null;
        const art = f.thumbnail ? `<img loading="lazy" src="${img(f.thumbnail)}" alt="${esc(f.ep_name || f.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(f.season, f.episode))}</div>`;
        return `<div class="ep"><button class="tile landscape" data-playfile="${f.id}" aria-label="Play ${esc(epLabel(f.season, f.episode))} ${esc(f.ep_name || "")}"><div class="art">${art}${p != null ? `<div class="bar"><i style="width:${Math.min(100, p * 100)}%"></i></div>` : ""}${f.watched ? `<span class="tile-check">${ic("check")}</span>` : ""}<span class="tile-play">${ic("play")}</span></div></button>
          <div class="ep-row"><div class="num">${esc(epLabel(f.season, f.episode) || "Extra")}${f.duration ? ` · ${Math.max(1, Math.round(f.duration / 60))} min` : ""}</div>
            <button class="ep-mark" data-epwatch="${f.id}" data-state="${f.watched ? 1 : 0}" aria-label="${f.watched ? "Mark as unwatched" : "Mark as watched"}" title="${f.watched ? "Watched, click to unmark" : "Mark as watched"}">${ic(f.watched ? "check" : "plus")}</button>
            ${t.is_admin ? `<button class="ep-mark" data-delfile="${f.id}" aria-label="Delete this episode" title="Delete this episode">${ic("trash")}</button>` : ""}</div>
          <div class="cap">${esc(nice(f.ep_name) || f.name)}</div>${f.ep_overview ? `<div class="ov">${esc(f.ep_overview)}</div>` : ""}</div>`;
      }).join("");
      wireFileButtons();
    };
    const wireFileButtons = () => {
      $$("[data-playfile]").forEach((b) => (b.onclick = () => {
        const f = t.files.find((x) => x.id === b.dataset.playfile);
        playFile(f.id, { title: t, from: f.progress ? f.progress.pos : 0 });
      }));
      $$("[data-epwatch]").forEach((b) => (b.onclick = async () => {
        await api("/api/watched", { file_id: b.dataset.epwatch, watched: b.dataset.state !== "1" });
        route();
      }));
      $$("[data-delfile]").forEach((b) => (b.onclick = async () => {
        const f = t.files.find((x) => x.id === b.dataset.delfile);
        if (!(await confirmSheet("Delete this file?", `${f.name} (${bytes(f.size)}) is removed from the Storage Box for everyone. The sync won't download it again.`, "Delete"))) return;
        try { await api(`/api/admin/file/${f.id}`, undefined, "DELETE"); toast("Deleted"); t.files.length > 1 ? route() : (location.hash = "#/home"); }
        catch (e) { toast(e.message, 5000); }
      }));
    };
    if (t.kind === "series") {
      $$("[data-season]").forEach((b) => (b.onclick = () => {
        $$("[data-season]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        drawEps(Number(b.dataset.season));
      }));
      drawEps(curSeason);
    } else wireFileButtons();

    const pm = $("#playMain");
    if (pm) pm.onclick = () => playFile(up.id, { title: t, from: resume ? up.progress.pos : 0 });
    const ps = $("#playStart");
    if (ps) ps.onclick = () => playFile(up.id, { title: t, from: 0 });
    $("#watchedBtn").onclick = async () => { await api("/api/watched", { title_id: t.id, watched: !t.watched }); toast(t.watched ? "Marked as unwatched" : "Marked as watched"); route(); };
    $$("[data-rate]").forEach((b) => (b.onclick = async () => {
      const v = Number(b.dataset.rate);
      const nv = t.my_rating === v ? 0 : v;
      await api("/api/rate", { title_id: t.id, value: nv });
      t.my_rating = nv;
      $$("[data-rate]").forEach((x) => { const on = Number(x.dataset.rate) === nv; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      toast(nv === 2 ? "Glad you love it, more like this coming up" : nv === 1 ? "Thanks, we'll show more like this" : nv === -1 ? "Got it, we'll show less like this" : "Rating removed");
    }));
    const dl = $("#dlMain");
    if (dl) dl.onclick = async () => {
      const info = await api(`/api/file/${up.id}`);
      const a = document.createElement("a");
      a.href = info.download + "&save=1";
      a.click();
      toast("Download started");
    };
    const am = $("#adminMore");
    if (am) {
      am.onclick = (e) => { e.stopPropagation(); $("#adminMenu").hidden = !$("#adminMenu").hidden; };
      document.addEventListener("click", () => { const m = $("#adminMenu"); if (m) m.hidden = true; }, { once: true });
      $("#fixMatch").onclick = () => fixMatch(t);
      $("#rescanT").onclick = async () => { await api("/api/admin/rescan", {}); toast("Rescanning the library"); };
      $("#delTitle").onclick = async () => {
        if (!(await confirmSheet(`Delete ${t.name}?`, `All ${t.files.length} file${t.files.length === 1 ? "" : "s"} (${bytes(t.size)}) are removed from the Storage Box for everyone. The sync won't download them again.`, "Delete"))) return;
        try { const r = await api(`/api/admin/title/${t.id}`, undefined, "DELETE"); toast(`Deleted, ${bytes(r.freed)} freed`); location.hash = "#/home"; }
        catch (e) { toast(e.message, 5000); }
      };
    }
  }

  // Fix match: search cinemeta and pick the right title, it sticks even after rescans
  function fixMatch(t) {
    const s = sheet(`<h2>Fix Match</h2><p class="secondary">The file is named <b>${esc(t.guess_name)}</b>. Search for the right film or show.</p>
      <div class="toolbar" style="margin:14px 0">
        <label class="search grow">${ic("search")}<input id="fmq" value="${esc(t.guess_name)}" placeholder="Title"></label>
        <select class="plain" id="fmk"><option value="movie" ${t.kind === "movie" ? "selected" : ""}>Movie</option><option value="series" ${t.kind === "series" ? "selected" : ""}>TV Show</option></select>
        <button class="btn secondary small" id="fmGo">Search</button>
      </div>
      <div class="fm-results" id="fmr"></div>
      <div class="actions end"><button class="btn secondary small" data-close>Close</button></div>`, { wide: true });
    const go = async () => {
      const box = $("#fmr", s.el);
      box.innerHTML = `<div class="secondary">Searching…</div>`;
      try {
        const r = await api(`/api/admin/match/search?kind=${$("#fmk", s.el).value}&q=${encodeURIComponent($("#fmq", s.el).value)}`);
        box.innerHTML = r.results.length ? r.results.map((m) => `<button class="fm-item" data-id="${m.id}" data-kind="${m.kind}">
          <span class="fm-post">${m.poster ? `<img src="${img(m.poster)}" alt="" data-fallback="hide">` : ""}</span>
          <span class="grow"><b>${esc(m.name)}</b><span class="secondary">${esc(m.releaseInfo || "")}</span></span>${m.id === t.imdb ? `<span class="badge">Current</span>` : ""}</button>`).join("")
          : `<div class="secondary">No results, try a different spelling or switch Movie and TV Show.</div>`;
        $$(".fm-item", box).forEach((b) => (b.onclick = async () => {
          b.disabled = true;
          try { await api("/api/admin/match", { title_id: t.id, imdb_id: b.dataset.id, kind: b.dataset.kind }); s.close(); toast("Match updated"); route(); }
          catch (e) { toast(e.message, 5000); b.disabled = false; }
        }));
      } catch (e) { box.innerHTML = `<div class="err-note">${esc(e.message)}</div>`; }
    };
    $("#fmGo", s.el).onclick = go;
    $("#fmq", s.el).addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    go();
  }

  // ---------------------------------------------------------- settings
  const LANG_OPTS = ["English", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese", "Russian", "Japanese", "Korean", "Chinese", "Swedish", "Danish", "Norwegian", "Finnish", "Turkish", "Arabic", "Hindi"];

  async function pageSettings() {
    const me = await api("/api/me");
    ME.profile = me.profile; ME.admin = me.admin; ME.ip = me.ip;
    const p = ME.profile, pr = p.prefs;
    const sel = (id, opts, val) => `<select class="plain" id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const toggle = (id, on, label, hint) => `<label class="set-row"><span><b>${label}</b>${hint ? `<span class="secondary">${hint}</span>` : ""}</span><input type="checkbox" class="switch" id="${id}" ${on ? "checked" : ""}></label>`;

    app.innerHTML = topbar("settings") + `<main class="page narrow">
      <h1 class="large-title">Settings</h1>
      <section class="card set-card">
        <h2 class="set-title">Profile</h2>
        <div class="set-profile">${avatar(p.icon, "lg")}<div class="grow"><div class="set-name">${esc(p.name)}</div><div class="secondary">Everyone on this profile shares the watch history and these settings.</div></div>
          <button class="btn secondary small" id="editMe">${ic("pencil")} Edit</button></div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Playback</h2>
        <div class="set-row"><span><b>Audio Language</b><span class="secondary">Picked automatically when a film has more than one</span></span>${sel("pAudioL", [["", "Original"], ...LANG_OPTS.map((l) => [l, l])], pr.audio_lang)}</div>
        <div class="set-row"><span><b>Subtitles</b><span class="secondary">Turned on automatically when the language is there</span></span>${sel("pSubL", [["", "Off"], ...LANG_OPTS.map((l) => [l, l])], pr.sub_lang)}</div>
        <div class="set-row"><span><b>Subtitle Size</b></span>${sel("pSubS", [["s", "Small"], ["m", "Medium"], ["l", "Large"]], pr.sub_size)}</div>
        ${toggle("pAuto", pr.autoplay, "Autoplay Next Episode", "Starts the next episode after a short countdown")}
        ${toggle("pSkip", pr.skip_intro, "Skip Intros Automatically", "Only works where Kino knows the intro")}
        <div class="actions end"><span class="secondary" id="prefSaved"></span></div>
      </section>
      ${isAdmin() ? `<div id="adminSettings"><div class="card skel" style="height:160px"></div></div>` : `
      <section class="card set-card"><h2 class="set-title">Admin</h2><div class="set-row"><span><b>Admin Tools</b><span class="secondary">Profiles, allowed networks, sync and server</span></span><button class="btn secondary small" id="setAdminIn">${ic("lock")} Sign In</button></div></section>`}
    </main>`;
    wireTopbar();
    $("#editMe").onclick = () => editProfile(p, () => route());
    const saveP = async () => {
      const prefs = { audio_lang: $("#pAudioL").value, sub_lang: $("#pSubL").value, sub_size: $("#pSubS").value, autoplay: $("#pAuto").checked, skip_intro: $("#pSkip").checked };
      const r = await api("/api/profile", { prefs }, "PUT");
      ME.profile = r.profile;
      $("#prefSaved").textContent = "Saved";
      setTimeout(() => $("#prefSaved") && ($("#prefSaved").textContent = ""), 1800);
    };
    ["pAudioL", "pSubL", "pSubS", "pAuto", "pSkip"].forEach((id) => $("#" + id).addEventListener("change", saveP));
    const si = $("#setAdminIn"); if (si) si.onclick = () => adminLogin(() => route());
    if (isAdmin()) drawAdminSettings();
  }

  async function drawAdminSettings() {
    const [pr, al] = await Promise.all([api("/api/profiles"), api("/api/admin/allowlist")]);
    const box = $("#adminSettings");
    if (!box) return;
    const mine = al.your_ip;
    const applied = al.applied;
    box.innerHTML = `
      <section class="card set-card">
        <h2 class="set-title">Profiles</h2>
        <div class="list">${pr.profiles.map((p) => `<div class="li">${avatar(p.icon, "xs")}<span class="grow">${esc(p.name)}</span><button class="btn secondary small" data-editp="${p.id}">${ic("pencil")} Edit</button></div>`).join("")}</div>
        <div class="actions end"><button class="btn secondary small" id="addP">${ic("plus")} Add Profile</button></div>
      </section>
      <section class="card set-card">
        <h2 class="set-title">Allowed Networks</h2>
        <p class="secondary set-hint">Only these internet addresses can open Kino. Add the home IP of each family member. Changes apply within a few seconds.</p>
        <div class="list">${al.entries.map((e) => `<div class="li"><span class="grow"><b>${esc(e.label)}</b> <span class="secondary mono">${esc(e.cidr)}</span></span>
          <span class="r">${e.added ? ago(e.added) : ""}</span><button class="round-btn sm" data-rmip="${esc(e.cidr)}" aria-label="Remove ${esc(e.label)}" title="Remove">${ic("trash")}</button></div>`).join("")}</div>
        <form class="ip-form" id="ipForm">
          <input id="ipLabel" placeholder="Name, like Mum's house" maxlength="40" required>
          <input id="ipCidr" placeholder="IP address, like 84.150.12.34" required spellcheck="false" autocapitalize="none">
          <button class="btn primary small" type="submit">${ic("plus")} Add</button>
        </form>
        <div class="note">Your current address is <b class="mono">${esc(mine)}</b>. <button class="linkish" id="fillMine">Use This Address</button>
          ${applied ? `<span class="${applied.ok ? "" : "err-note"}"> · nginx ${applied.ok ? `updated ${ago(applied.applied_at)}` : `not updated: ${esc(applied.error || "unknown error")}`}</span>` : ""}</div>
        <div class="form-err" id="ipErr" role="alert"></div>
      </section>`;
    $$("[data-editp]", box).forEach((b) => (b.onclick = () => editProfile(pr.profiles.find((x) => x.id === Number(b.dataset.editp)), () => drawAdminSettings())));
    $("#addP").onclick = () => editProfile(null, () => drawAdminSettings());
    $("#fillMine").onclick = () => { $("#ipCidr").value = mine; $("#ipLabel").focus(); };
    $("#ipForm").onsubmit = async (e) => {
      e.preventDefault();
      try { await api("/api/admin/allowlist", { cidr: $("#ipCidr").value, label: $("#ipLabel").value }); toast("Network added"); drawAdminSettings(); }
      catch (er) { $("#ipErr").textContent = er.message; }
    };
    $$("[data-rmip]", box).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Remove this network?", `${b.dataset.rmip} won't be able to open Kino anymore.`, "Remove"))) return;
      try { await api("/api/admin/allowlist?cidr=" + encodeURIComponent(b.dataset.rmip), undefined, "DELETE"); toast("Network removed"); drawAdminSettings(); }
      catch (er) { $("#ipErr").textContent = er.message; }
    }));
  }

  // ---------------------------------------------------------- sync page
  async function pageSync() {
    app.innerHTML = topbar("sync") + `<main class="page"><h1 class="large-title">Sync</h1><div id="syncBody"><div class="card skel" style="height:220px"></div></div></main>`;
    wireTopbar();
    startPoll(drawSync, 2000);
  }

  async function drawSync() {
    SYNC = await api("/api/admin/sync");
    updateSyncChip();
    const b = $("#syncBody");
    if (!b) return;
    const s = SYNC, st = s.status || {}, c = s.current, svc = s.service;
    const running = svc.state === "active" || svc.state === "activating";
    const ss = syncState(s);
    const pct = c && c.total ? c.bytes / c.total : 0;
    const eta = c && c.speed > 0 ? (c.total - c.bytes) / c.speed : null;
    const last = st.last_run;
    const failed = st.failed || [];
    const skipped = st.skipped || [];
    let headline, line;
    if (s.paused) {
      const forever = s.paused.until > 32000000000;
      headline = forever ? "Paused until you resume" : `Paused until ${when(s.paused.until)}`;
      line = "Scheduled syncs are skipped while paused.";
    } else if (running && c) {
      headline = c.title ? `${c.title}${c.episode != null ? " " + epLabel(c.season, c.episode) : ""}` : c.name;
      line = c.name;
    } else if (running) {
      headline = st.state === "listing" ? "Checking TorBox for new downloads" : "Starting";
      line = "";
    } else {
      headline = last ? (last.result === "ok" ? (last.new ? `Downloaded ${last.new} new file${last.new === 1 ? "" : "s"}` : "Everything is up to date")
        : last.result === "error" ? "The last sync failed" : last.result === "stopped" ? "The last sync was stopped" : "Waiting for the next sync") : "No sync has run yet";
      line = last ? `${last.message ? last.message + ". " : ""}Finished ${ago(last.finished)}.` : "";
    }
    const post = s.poster ? `<img src="${img(s.poster)}" alt="" data-fallback="hide">` : `<div class="ph" style="--h:${hue(headline)}"></div>`;

    b.innerHTML = `<div class="cards">
      <section class="card now-card span-12">
        ${c && c.background ? `<div class="bgblur" style="background-image:url('${img(c.background)}')"></div>` : ""}
        <div class="post">${post}</div>
        <div style="min-width:0">
          <div class="state-line ${ss.cls}"><span class="dot"></span>${running ? (c ? "Downloading" : "Running") : s.paused ? "Paused" : ss.cls === "error" ? "Needs attention" : "Idle"}</div>
          <div class="now-title">${esc(headline)}</div>
          ${line ? `<div class="secondary" style="font-size:14px;overflow-wrap:anywhere">${esc(line)}</div>` : ""}
          ${running && c ? `<div class="progress"><i style="width:${pct * 100}%"></i></div>
            <div class="kv"><span><b>${Math.floor(pct * 100)}%</b></span><span><b>${bytes(c.bytes)}</b> of ${bytes(c.total)}</span><span><b>${rate(c.speed)}</b></span>${eta != null ? `<span><b>${dur(eta)}</b> left</span>` : ""}
            ${st.queue_total ? `<span>File <b>${Math.min(st.queue_done + 1, st.queue_total)}</b> of ${st.queue_total}</span>` : ""}</div>` : ""}
          <div class="actions" style="margin-top:18px">
            ${running ? `<button class="btn danger small" data-act="stop">${ic("stop")} Stop Sync</button>`
              : `<button class="btn primary small" data-act="start">${ic("refresh")} Sync Now</button>`}
            ${s.paused ? `<button class="btn secondary small" data-act="resume">${ic("play")} Resume</button>` : ""}
          </div>
        </div>
      </section>
      <section class="card span-4"><h3>Next Sync</h3>
        <div class="big" style="font-size:26px">${s.paused ? "Paused" : esc(when(s.timer.next))}</div>
        <div class="note">${s.timer.last ? `Last started ${esc(when(s.timer.last))}` : "Runs every day on the timer"}${s.timer.state && s.timer.state !== "active" ? ". The timer is off, enable it with systemctl" : ""}</div></section>
      <section class="card span-4"><h3>Last Run</h3>
        <div class="big" style="font-size:26px">${last ? `${last.new} new` : "–"}</div>
        <div class="note ${last && last.result === "error" ? "err-note" : ""}">${last ? `${last.failed ? `${last.failed} failed, ` : ""}${last.skipped ? `${last.skipped} skipped, ` : ""}took ${dur(last.finished - last.started)}${last.result === "error" && last.message ? `. ${esc(last.message)}` : ""}` : "Nothing yet"}</div></section>
      <section class="card span-4"><h3>Service</h3>
        <div class="big" style="font-size:26px;text-transform:capitalize">${esc(svc.state || "unknown")}</div>
        <div class="note">${svc.error ? esc(svc.error) : `Result: ${esc(svc.result || "–")}`}</div></section>
      <section class="card span-6"><h3>Pause Syncing</h3>
        <div class="secondary" style="font-size:15px">Stops the current download and skips scheduled syncs until the time runs out.</div>
        <div class="presets">${[[24, "1 day"], [48, "2 days"], [72, "3 days"], [168, "1 week"], [336, "2 weeks"], [0, "Until I resume"]]
          .map(([h, l]) => `<button class="btn secondary small" data-pause="${h}">${l}</button>`).join("")}</div>
        <form class="custom-pause" id="customPause"><label for="ph">Or pause for</label><input id="ph" type="number" min="1" max="2000" step="1" value="6" inputmode="numeric"><span>hours</span>
          <button class="btn secondary small" type="submit">Pause</button></form></section>
      <section class="card span-6"><h3>Recently Downloaded</h3>
        <div class="list">${(st.recent || []).slice(0, 8).map((r) => `<div class="li"><span class="grow">${esc(r.name)}</span><span class="r">${bytes(r.size)}</span><span class="r">${ago(r.at)}</span></div>`).join("") || `<div class="secondary" style="font-size:15px;padding-top:8px">Finished downloads show up here.</div>`}</div>
      </section>
      ${failed.length ? `<section class="card span-6"><h3 style="display:flex;align-items:center">Failed Downloads<button class="btn secondary small" style="margin-left:auto" data-act="retry" ${running ? "disabled" : ""}>${ic("refresh")} Retry Failed</button></h3>
        <div class="list">${failed.slice(0, 8).map((f) => `<div class="li"><span class="grow" title="${esc(f.error)}">${esc(f.name)}</span><span class="r err-note">${esc((f.error || "Failed").slice(0, 40))}</span></div>`).join("")}</div>
        <div class="note">Failed files are tried again on every sync, Retry just does it now.</div></section>` : ""}
      ${skipped.length ? `<section class="card span-6"><h3>Skipped as Duplicates</h3>
        <div class="list">${skipped.slice(0, 8).map((f) => `<div class="li"><span class="grow" title="${esc(f.name)}">${esc(f.name)}</span><span class="r">${esc(f.reason)}</span></div>`).join("")}</div>
        <div class="note">Kino skips copies of something you already have in 1080p or better, and only keeps one copy when TorBox has several.</div></section>` : ""}
      <section class="card span-12" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px"><h3>Library</h3><div style="font-size:15px">${s.library.files} files, last scanned ${s.library.scanned_at ? ago(s.library.scanned_at) : "never"}</div></div>
        <button class="btn secondary small" id="rescan">${ic("refresh")} Rescan Library</button></section>
    </div>`;

    b.querySelectorAll("[data-act]").forEach((x) => (x.onclick = () => syncAction(x.dataset.act)));
    b.querySelectorAll("[data-pause]").forEach((x) => (x.onclick = () => syncAction("pause", { hours: Number(x.dataset.pause) })));
    $("#customPause").onsubmit = (e) => { e.preventDefault(); const h = Number($("#ph").value); if (h > 0) syncAction("pause", { hours: h }); };
    $("#rescan").onclick = async () => { await api("/api/admin/rescan", {}); toast("Rescanning the library"); };
  }

  async function syncAction(act, body = {}) {
    const msgs = { start: "Sync started", retry: "Retrying failed downloads", stop: "Stopping the sync", resume: "Sync resumed", pause: "Sync paused" };
    try {
      await api(`/api/admin/sync/${act}`, body);
      toast(msgs[act]);
      setTimeout(drawSync, 600);
    } catch (e) { toast(e.message, 6000); }
  }

  // ---------------------------------------------------------- server page
  function spark(vals, max, color, fill = true) {
    const w = 300, h = 64, n = vals.length;
    if (n < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"></svg>`;
    const m = max || Math.max(...vals, 1);
    const pts = vals.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - 2 - (Math.min(v, m) / m) * (h - 6)).toFixed(1)}`);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      ${fill ? `<polygon points="0,${h} ${pts.join(" ")} ${w},${h}" fill="${color}" opacity="0.18"/>` : ""}
      <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }
  function storageCard(title, d, color, sub) {
    if (!d) return `<section class="card span-6"><h3>${title}</h3><div class="big" style="font-size:24px">Not mounted</div><div class="note err-note">${sub || ""}</div></section>`;
    const p = d.used / d.total;
    const cls = p > 0.92 ? "red" : p > 0.8 ? "orange" : color;
    return `<section class="card span-6"><h3>${title}</h3>
      <div class="storage-big"><span class="big">${bytes(d.free)}</span><span class="secondary">free of ${bytes(d.total)}</span></div>
      <div class="progress ${cls}"><i style="width:${p * 100}%"></i></div>
      <div class="kv"><span><b>${bytes(d.used)}</b> used</span><span><b>${Math.round(p * 100)}%</b> full</span></div></section>`;
  }

  async function pageServer() {
    app.innerHTML = topbar("server") + `<main class="page"><h1 class="large-title">Server</h1><div id="srvBody"><div class="card skel" style="height:220px"></div></div></main>`;
    wireTopbar();
    startPoll(drawServer, 3000);
  }

  async function drawServer() {
    const s = await api("/api/admin/stats");
    const b = $("#srvBody");
    if (!b) return;
    const h = s.hist, last = h[h.length - 1] || { cpu: 0, mem: 0, rx: 0, tx: 0, rd: 0, wr: 0 };
    const netMax = Math.max(...h.map((x) => Math.max(x.rx, x.tx)), 1024);
    const ioMax = Math.max(...h.map((x) => Math.max(x.rd, x.wr)), 1024);
    const wd = s.watchdog;
    b.innerHTML = `<div class="cards">
      <section class="card span-3"><h3>CPU</h3><div class="big">${Math.round(last.cpu)}<small>%</small></div>${spark(h.map((x) => x.cpu), 100, "#0a84ff")}
        <div class="note">${s.cores} cores, load ${s.load.map((l) => l.toFixed(2)).join(" ")}</div></section>
      <section class="card span-3"><h3>Memory</h3><div class="big">${Math.round(s.mem.percent)}<small>%</small></div>${spark(h.map((x) => x.mem), 100, "#30d158")}
        <div class="note">${bytes(s.mem.used)} of ${bytes(s.mem.total)}${s.swap.total ? `, swap ${bytes(s.swap.used)}` : ""}</div></section>
      <section class="card span-3"><h3>Network</h3><div class="big" style="font-size:26px">${rate(last.rx)}</div>${spark(h.map((x) => x.rx), netMax, "#64d2ff")}
        <div class="legend"><span><i style="background:#64d2ff"></i>In ${rate(last.rx)}</span><span><i style="background:#bf5af2"></i>Out ${rate(last.tx)}</span></div></section>
      <section class="card span-3"><h3>Disk Activity</h3><div class="big" style="font-size:26px">${rate(last.rd + last.wr)}</div>${spark(h.map((x) => x.rd + x.wr), ioMax, "#ff9f0a")}
        <div class="legend"><span>Read ${rate(last.rd)}</span><span>Write ${rate(last.wr)}</span></div></section>
      ${storageCard("Storage Box", s.disks.box, "blue", "The watchdog reconnects it automatically within a minute.")}
      ${storageCard("VPS Disk", s.disks.vps, "")}
      <section class="card span-8"><h3>Busiest Processes</h3><div class="list">${s.procs.map((p) => `<div class="li"><span class="grow">${esc(p.name)} <span class="tertiary">${esc(p.user || "")}</span></span><span class="r">${p.cpu.toFixed(1)}% CPU</span><span class="r">${bytes(p.mem)}</span></div>`).join("")}</div></section>
      <section class="card span-4"><h3>Mount Watchdog</h3>
        ${wd ? `<div class="state-line ${wd.ok ? "running" : "error"}" style="margin-top:6px"><span class="dot"></span>${wd.ok ? "Storage Box connected" : "Reconnecting"}</div>
          <div class="note">Checked ${ago(wd.last_check)}. ${wd.remounts ? `Reconnected ${wd.remounts} time${wd.remounts === 1 ? "" : "s"}, last ${ago(wd.last_remount)}.` : "No reconnects needed."}${wd.last_error ? `<br><span class="err-note">${esc(wd.last_error)}</span>` : ""}</div>`
          : `<div class="note">The watchdog hasn't reported yet. It runs every minute once installed.</div>`}
        <h3 style="margin-top:18px">Uptime</h3><div class="big" style="font-size:22px">${dur(s.uptime)}</div>
        <div class="note">${s.players} active player${s.players === 1 ? "" : "s"}</div></section>
    </div>`;
  }

  // ---------------------------------------------------------- polling
  function startPoll(fn, ms) {
    stopPoll();
    const tick = async () => {
      try { await fn(); } catch (e) { if (e.message !== "pick profile") console.warn(e); }
      if (POLL) POLL.t = setTimeout(tick, document.hidden ? ms * 5 : ms);
    };
    POLL = { t: null };
    tick();
  }
  function stopPoll() { if (POLL) clearTimeout(POLL.t); POLL = null; }

  // ---------------------------------------------------------- player
  const pl = {
    el: $("#player"), v: $("#video"), info: null, mode: null, hls: null, sid: null, offset: 0, audio: 0,
    cues: null, subId: null, title: null, saveT: null, idleT: null, dragging: false, upNextT: null, upNextShown: false, introSkipped: false, rate: 1,
  };
  $("#pClose").innerHTML = ic("close");
  $("#pBack").innerHTML = ic("back10");
  $("#pFwd").innerHTML = ic("fwd10");
  $("#pFull").innerHTML = ic("full");
  $("#pMute").innerHTML = ic("vol");
  $("#pSpeed").innerHTML = ic("speed");
  $("#pAir").innerHTML = ic("airplay");
  $("#pPip").innerHTML = ic("pip");

  const pos = () => (pl.mode === "hls" ? pl.offset + pl.v.currentTime : pl.v.currentTime);
  const total = () => (pl.info && pl.info.duration) || pl.v.duration || 0;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

  function codecOk(codec) {
    const MS = window.ManagedMediaSource || window.MediaSource;
    const types = { h264: 'video/mp4; codecs="avc1.640028"', hevc: 'video/mp4; codecs="hvc1.1.6.L150.90"', av1: 'video/mp4; codecs="av01.0.08M.08"', vp9: 'video/mp4; codecs="vp09.00.40.08"' };
    const t = types[codec];
    if (!t) return true;
    return (MS && MS.isTypeSupported && MS.isTypeSupported(t)) || pl.v.canPlayType(t) !== "";
  }

  function showMsg(title, text, actions = "") {
    const m = $("#pMsg");
    m.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="actions" style="justify-content:center">${actions}</div>`;
    m.hidden = false;
    spinner(false);
  }
  const spinner = (on) => ($("#playerSpinner").hidden = !on);

  async function playFile(fid, opts = {}) {
    closePlayer(true);
    clearInterval(HERO_T);
    pl.el.hidden = false;
    document.body.style.overflow = "hidden";
    spinner(true);
    $("#pMsg").hidden = true;
    $("#upNext").hidden = true;
    $("#skipIntro").hidden = true;
    $("#subsLayer").innerHTML = "";
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) { showMsg("Can't play this file", e.message); return; }
    pl.info = info; pl.cues = null; pl.subId = null; pl.upNextShown = false; pl.introSkipped = false;
    pl.title = opts.title || null;
    const prefs = info.prefs || {};
    $("#subsLayer").dataset.size = prefs.sub_size || "m";

    // Picks the audio and subtitles from the profile settings
    pl.audio = info.default_audio;
    if (prefs.audio_lang) { const a = info.audio.find((x) => x.lang === prefs.audio_lang); if (a) pl.audio = a.n; }
    const t = opts.title;
    $("#pTitle").textContent = t ? t.name : info.name;
    const f = t && t.files.find((x) => x.id === fid);
    $("#pSub").textContent = t && t.kind === "series" && f ? `${epLabel(f.season, f.episode)}${f.ep_name ? "  " + nice(f.ep_name) : ""}` : (info.badges || []).join("  ");
    buildMenus();
    setupDeviceButtons();
    const start = opts.from != null ? opts.from : 0;
    const vcodec = info.video && info.video.codec;
    const dlBtn = `<a class="btn secondary small" href="${esc(info.download)}&save=1">${ic("download")} Download</a>
      <button class="btn secondary small" id="copyLink">${ic("link")} Copy link for VLC</button>`;

    if (info.direct && codecOk(vcodec) && pl.audio === info.default_audio) {
      pl.mode = "direct";
      pl.v.src = `/api/stream/${fid}/direct`;
      pl.v.addEventListener("loadedmetadata", () => { if (start) pl.v.currentTime = start; }, { once: true });
      pl.v.play().catch(() => {});
    } else if (!codecOk(vcodec)) {
      showMsg("This browser can't play this video", `It uses ${String(vcodec).toUpperCase()} video. Safari or Chrome on a Mac usually can, or you can download it and use VLC.`, dlBtn);
      wireCopy(info);
      return;
    } else {
      await startHls(start);
    }
    pl.v.playbackRate = pl.rate;
    if (prefs.sub_lang) {
      const s = info.subs.find((x) => !x.forced && (x.lang === prefs.sub_lang || x.label.startsWith(prefs.sub_lang)));
      if (s) loadSubs(s.id, true);
    }
    pl.saveT = setInterval(saveProgress, 10000);
    wakeUi();
  }

  function wireCopy(info) {
    const b = $("#copyLink");
    if (b) b.onclick = async () => {
      try { await navigator.clipboard.writeText(location.origin + info.download); toast("Link copied, it works for 6 hours"); }
      catch (_) { toast("Couldn't copy, your browser blocked it"); }
    };
  }

  async function startHls(t) {
    spinner(true);
    $("#pMsg").hidden = true;
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    let r;
    try {
      r = await api(`/api/play/${pl.info.id}`, { t, audio: pl.audio });
    } catch (e) {
      showMsg("Playback couldn't start", e.message, `<a class="btn secondary small" href="${esc(pl.info.download)}&save=1">${ic("download")} Download instead</a>`);
      return;
    }
    if (pl.el.hidden) { api(`/api/play/${r.sid}/stop`, {}).catch(() => {}); return; }
    pl.mode = "hls"; pl.sid = r.sid; pl.offset = r.offset;
    // Safari plays the stream itself which keeps AirPlay working, everyone else uses hls.js
    if (isSafari && pl.v.canPlayType("application/vnd.apple.mpegurl")) {
      pl.v.src = r.url;
    } else if (window.Hls && Hls.isSupported()) {
      // startPosition 0 cause the playlist is still growing and hls.js would otherwise jump to the end
      const h = new Hls({ startPosition: 0, maxBufferLength: 60, backBufferLength: 120, manifestLoadingMaxRetry: 6, levelLoadingMaxRetry: 6, fragLoadingMaxRetry: 6 });
      pl.hls = h;
      h.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError();
        else {
          showMsg("Playback stopped", "The stream was interrupted. Try again, or download the file instead.", `<button class="btn primary small" id="retry">Try Again</button>`);
          $("#retry").onclick = () => startHls(pos());
        }
      });
      h.loadSource(r.url);
      h.attachMedia(pl.v);
    } else {
      pl.v.src = r.url;
    }
    pl.v.play().catch(() => {});
    pl.v.playbackRate = pl.rate;
  }

  function seekTo(target) {
    target = Math.max(0, Math.min(target, total() - 1));
    if (pl.mode === "direct") { pl.v.currentTime = target; return; }
    const rel = target - pl.offset;
    const se = pl.v.seekable.length ? pl.v.seekable.end(pl.v.seekable.length - 1) : 0;
    // Inside what the server already made we just jump there, further ahead it restarts the stream from that point
    if (rel >= 0 && rel < se - 2) pl.v.currentTime = rel;
    else startHls(target);
    renderSubs(true);
  }

  function saveProgress() {
    if (!pl.info || !total()) return;
    api("/api/progress", { file_id: pl.info.id, pos: pos(), dur: total() }).catch(() => {});
  }

  function closePlayer(keepOpen) {
    const wasOpen = !pl.el.hidden;
    if (pl.info) saveProgress();
    clearInterval(pl.saveT);
    clearInterval(pl.upNextT);
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    if (pl.sid) { api(`/api/play/${pl.sid}/stop`, {}).catch(() => {}); pl.sid = null; }
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    pl.v.pause();
    pl.v.removeAttribute("src");
    pl.v.load();
    pl.info = null; pl.mode = null;
    if (!keepOpen && wasOpen) {
      pl.el.hidden = true;
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Redraws the page behind so resume bars and watched ticks are up to date
      if (ME.profile && (location.hash.startsWith("#/title/") || location.hash === "#/home" || !location.hash)) setTimeout(route, 400);
    }
  }

  function setupDeviceButtons() {
    // Only shows AirPlay and picture in picture when this device can actualy do them
    const air = $("#pAir"), pip = $("#pPip");
    air.hidden = true;
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      pl.v.addEventListener("webkitplaybacktargetavailabilitychanged", (e) => { air.hidden = e.availability !== "available"; });
      air.onclick = () => pl.v.webkitShowPlaybackTargetPicker && pl.v.webkitShowPlaybackTargetPicker();
    }
    const canPip = (document.pictureInPictureEnabled && !pl.v.disablePictureInPicture) || (pl.v.webkitSupportsPresentationMode && pl.v.webkitSupportsPresentationMode("picture-in-picture"));
    pip.hidden = !canPip;
    pip.onclick = async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else if (pl.v.requestPictureInPicture) await pl.v.requestPictureInPicture();
        else pl.v.webkitSetPresentationMode("picture-in-picture");
      } catch (_) { toast("Picture in picture isn't available right now"); }
    };
  }

  function buildMenus() {
    const info = pl.info;
    $("#pAudio").innerHTML = ic("audio");
    $("#pAudio").hidden = info.audio.length < 2;
    $("#mAudio").innerHTML = info.audio.map((a) => `<button data-a="${a.n}"><span class="chk">${a.n === pl.audio ? ic("check") : ""}</span>${esc(a.label)}</button>`).join("");
    $("#pSubs").innerHTML = ic("cc");
    $("#pSubs").hidden = !info.subs.length;
    $("#mSubs").innerHTML = `<button data-s=""><span class="chk">${!pl.subId ? ic("check") : ""}</span>Off</button>` +
      info.subs.map((s) => `<button data-s="${s.id}"><span class="chk">${s.id === pl.subId ? ic("check") : ""}</span>${esc(s.label)}${s.kind === "embedded" && !s.ready ? ' <span class="tertiary">(prepares first)</span>' : ""}</button>`).join("");
    $("#mSpeed").innerHTML = [0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => `<button data-r="${r}"><span class="chk">${r === pl.rate ? ic("check") : ""}</span>${r === 1 ? "Normal" : r + "×"}</button>`).join("");
    $("#pSpeed").innerHTML = ic("speed") + (pl.rate === 1 ? "" : `<span class="rate-badge">${pl.rate}×</span>`);
    $("#mAudio").querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      pl.audio = Number(b.dataset.a); hideMenus(); buildMenus();
      startHls(pos());  // A different audio track needs a fresh stream from the server
    }));
    $("#mSubs").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { hideMenus(); loadSubs(b.dataset.s); }));
    $("#mSpeed").querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { pl.rate = Number(b.dataset.r); pl.v.playbackRate = pl.rate; hideMenus(); buildMenus(); }));
    const ad = $("#pAdminIntro");
    ad.hidden = !(info.is_admin && info.season != null);
    $("#mIntro").innerHTML = `<button data-intro="start">Intro Starts Here</button><button data-intro="end">Intro Ends Here</button>
      ${info.intro && info.intro.source === "marked" ? `<button data-intro="clear">Clear Marked Intro</button>` : ""}`;
    $$("#mIntro [data-intro]").forEach((b) => (b.onclick = () => markIntro(b.dataset.intro)));
  }
  const hideMenus = () => $$(".player .menu").forEach((m) => (m.hidden = true));

  // Admin marks the intro once and it works for the whole season
  let introDraft = {};
  async function markIntro(which) {
    hideMenus();
    const info = pl.info;
    if (which === "clear") {
      await api(`/api/admin/intro/${info.title_id}/${info.season}`, undefined, "DELETE");
      info.intro = null; toast("Marked intro cleared"); buildMenus(); return;
    }
    introDraft[which] = pos();
    if (which === "start") { toast(`Intro start set at ${clock(pos())}. Now go to where it ends.`); return; }
    if (introDraft.start == null) { toast("Set where the intro starts first"); return; }
    try {
      await api("/api/admin/intro", { title_id: info.title_id, season: info.season, start: introDraft.start, end: introDraft.end });
      info.intro = { start: introDraft.start, end: introDraft.end, source: "marked" };
      toast(`Intro saved for season ${info.season}`); introDraft = {}; buildMenus();
    } catch (e) { toast(e.message, 5000); }
  }

  async function loadSubs(id, quiet) {
    pl.subId = id || null; pl.cues = null;
    $("#subsLayer").innerHTML = "";
    buildMenus();
    if (!id) return;
    const fid = pl.info.id;
    for (let i = 0; i < 120; i++) {
      const r = await fetch(`/api/subs/${fid}/${id}`, { credentials: "same-origin" });
      if (!pl.info || pl.info.id !== fid || pl.subId !== id) return;
      if (r.status === 202) {
        if (i === 0) toast("Preparing subtitles. For big files this can take a few minutes.", 6000);
        await new Promise((res) => setTimeout(res, 5000));
        continue;
      }
      if (!r.ok) { toast("Those subtitles couldn't be loaded"); return; }
      pl.cues = parseVtt(await r.text());
      if (!quiet) toast("Subtitles on");
      return;
    }
  }

  function parseVtt(txt) {
    const ts = (s) => { const p = s.trim().split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    const cues = [];
    for (const block of txt.replace(/\r/g, "").split(/\n\n+/)) {
      const lines = block.split("\n");
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) continue;
      const [a, b] = lines[i].split("-->");
      const text = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();
      if (text) cues.push({ s: ts(a), e: ts(b.trim().split(/\s/)[0]), text });
    }
    return cues;
  }

  let lastSubText = null;
  function renderSubs(force) {
    if (!pl.cues) return;
    const t = pos();
    const active = pl.cues.filter((c) => c.s <= t && c.e >= t).map((c) => c.text).join("\n");
    if (active === lastSubText && !force) return;
    lastSubText = active;
    $("#subsLayer").innerHTML = active ? `<span>${esc(active)}</span>` : "";
  }

  // Skip intro button, shows while the intro is playing. With the setting on it skips by itself
  function checkIntro() {
    const info = pl.info, btn = $("#skipIntro");
    if (!info || !info.intro) { btn.hidden = true; return; }
    const p = pos(), inIntro = p >= info.intro.start - 1 && p < info.intro.end - 2;
    if (inIntro && info.prefs && info.prefs.skip_intro && !pl.introSkipped) { pl.introSkipped = true; seekTo(info.intro.end); toast("Intro skipped"); return; }
    btn.hidden = !inIntro;
  }

  // Up next card with a countdown like netflix, during the credits or the last 25 seconds
  function checkUpNext() {
    const info = pl.info;
    if (!info || !info.next || pl.upNextShown) return;
    const d = total(), p = pos();
    const at = info.credits || d - 25;
    if (!d || p < at || p < d * 0.5) return;
    pl.upNextShown = true;
    const n = info.next, box = $("#upNext");
    const auto = !info.prefs || info.prefs.autoplay !== false;
    let left = 10;
    box.innerHTML = `<div class="un-thumb">${n.thumbnail ? `<img src="${img(n.thumbnail)}" alt="" data-fallback="hide">` : ""}${auto ? `<svg class="un-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" /></svg>` : ""}</div>
      <div class="un-body"><div class="lbl">Next episode${auto ? ` in <b id="unLeft">${left}</b>` : ""}</div><div class="nm">${esc(epLabel(n.season, n.episode))}${n.name ? "  " + esc(nice(n.name)) : ""}</div>
      <div class="actions"><button class="btn primary small" id="unPlay">${ic("play")} Play Now</button><button class="btn secondary small" id="unHide">${auto ? "Cancel" : "Hide"}</button></div></div>`;
    box.hidden = false;
    const go = () => { clearInterval(pl.upNextT); box.hidden = true; saveProgress(); playFile(n.id, { title: pl.title, from: 0 }); };
    $("#unPlay").onclick = go;
    $("#unHide").onclick = () => { clearInterval(pl.upNextT); box.hidden = true; };
    if (auto) {
      const ring = $(".un-ring circle", box);
      if (ring) { ring.style.transition = "none"; ring.style.strokeDashoffset = "0"; requestAnimationFrame(() => { ring.style.transition = "stroke-dashoffset 10s linear"; ring.style.strokeDashoffset = "100.5"; }); }
      pl.upNextT = setInterval(() => {
        if (pl.v.paused) return;
        left -= 1;
        const el = $("#unLeft"); if (el) el.textContent = left;
        if (left <= 0) go();
      }, 1000);
    }
  }

  // controls
  const v = pl.v;
  function drawTime() {
    const d = total(), p = pos();
    $("#tNow").textContent = clock(p);
    $("#tLeft").textContent = "-" + clock(d - p);
    if (!pl.dragging && d) {
      $("#scrubFill").style.width = `${(p / d) * 100}%`;
      $("#scrubKnob").style.left = `${(p / d) * 100}%`;
    }
    let bufEnd = 0;
    if (v.buffered.length) bufEnd = v.buffered.end(v.buffered.length - 1) + (pl.mode === "hls" ? pl.offset : 0);
    if (d) $("#scrubBuf").style.width = `${Math.min(100, (bufEnd / d) * 100)}%`;
    $("#scrub").setAttribute("aria-valuemax", Math.round(d));
    $("#scrub").setAttribute("aria-valuenow", Math.round(p));
    $("#scrub").setAttribute("aria-valuetext", `${clock(p)} of ${clock(d)}`);
    renderSubs();
    checkIntro();
    checkUpNext();
  }
  v.addEventListener("timeupdate", drawTime);
  v.addEventListener("progress", drawTime);
  v.addEventListener("waiting", () => spinner(true));
  v.addEventListener("playing", () => { spinner(false); $("#pMsg").hidden = true; });
  v.addEventListener("canplay", () => spinner(false));
  const playIcon = () => { $("#pPlay").innerHTML = ic(v.paused ? "play" : "pause"); $("#pPlay").setAttribute("aria-label", v.paused ? "Play" : "Pause"); };
  v.addEventListener("play", playIcon);
  v.addEventListener("pause", () => { playIcon(); wakeUi(); });
  playIcon();
  v.addEventListener("ended", () => {
    if (pl.mode === "hls" && pos() < total() - 30) return;
    saveProgress();
    if (pl.info && pl.info.next && (!pl.info.prefs || pl.info.prefs.autoplay !== false)) {
      const n = pl.info.next;
      clearInterval(pl.upNextT);
      playFile(n.id, { title: pl.title, from: 0 });
      return;
    }
    closePlayer();
  });
  v.addEventListener("error", () => {
    if (pl.mode === "direct" && pl.info) startHls(pos());  // If direct play fails the server converts it instead
  });

  const toggle = () => (v.paused ? v.play().catch(() => {}) : v.pause());
  $("#pPlay").onclick = toggle;
  $("#pBack").onclick = () => seekTo(pos() - 10);
  $("#pFwd").onclick = () => seekTo(pos() + 10);
  $("#pClose").onclick = () => closePlayer();
  $("#skipIntro").onclick = () => { if (pl.info && pl.info.intro) { pl.introSkipped = true; seekTo(pl.info.intro.end); $("#skipIntro").hidden = true; } };
  $("#pFull").onclick = () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (pl.el.requestFullscreen) return pl.el.requestFullscreen();
    if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();  // iPhone only does fullscreen on the video itself
  };
  document.addEventListener("fullscreenchange", () => ($("#pFull").innerHTML = ic(document.fullscreenElement ? "exitfull" : "full")));
  $("#pMute").onclick = () => { v.muted = !v.muted; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  $("#pVol").oninput = (e) => { v.volume = Number(e.target.value); v.muted = v.volume === 0; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  const menuBtn = (btn, menu) => ($(btn).onclick = (e) => { e.stopPropagation(); const m = $(menu); const was = m.hidden; hideMenus(); m.hidden = !was; });
  menuBtn("#pAudio", "#mAudio"); menuBtn("#pSubs", "#mSubs"); menuBtn("#pSpeed", "#mSpeed"); menuBtn("#pAdminIntro", "#mIntro");
  $("#pAdminIntro").innerHTML = ic("flag");
  pl.el.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) hideMenus();
    if (e.target === v || e.target.id === "playerUi") toggle();
  });
  v.addEventListener("dblclick", () => $("#pFull").click());

  // scrubbing
  const scrub = $("#scrub");
  const frac = (e) => { const r = scrub.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  scrub.addEventListener("pointerdown", (e) => {
    pl.dragging = true; scrub.classList.add("drag"); scrub.setPointerCapture(e.pointerId);
    const f = frac(e); $("#scrubFill").style.width = $("#scrubKnob").style.left = `${f * 100}%`;
  });
  scrub.addEventListener("pointermove", (e) => {
    const f = frac(e), tip = $("#scrubTip");
    tip.hidden = false; tip.style.left = `${f * 100}%`; tip.textContent = clock(f * total());
    if (pl.dragging) $("#scrubFill").style.width = $("#scrubKnob").style.left = `${f * 100}%`;
  });
  scrub.addEventListener("pointerleave", () => ($("#scrubTip").hidden = true));
  scrub.addEventListener("pointerup", (e) => {
    if (!pl.dragging) return;
    pl.dragging = false; scrub.classList.remove("drag");
    seekTo(frac(e) * total());
  });
  scrub.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { seekTo(pos() - 10); e.preventDefault(); }
    if (e.key === "ArrowRight") { seekTo(pos() + 10); e.preventDefault(); }
  });

  function wakeUi() {
    pl.el.classList.remove("idle");
    clearTimeout(pl.idleT);
    pl.idleT = setTimeout(() => { if (!v.paused && !pl.dragging && $$(".player .menu").every((m) => m.hidden)) pl.el.classList.add("idle"); }, 3000);
  }
  ["mousemove", "pointerdown", "keydown"].forEach((ev) => pl.el.addEventListener(ev, wakeUi));

  document.addEventListener("keydown", (e) => {
    if (pl.el.hidden || e.target.tagName === "INPUT" || sheetClose) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowLeft" && e.target !== scrub) seekTo(pos() - 10);
    else if (e.key === "ArrowRight" && e.target !== scrub) seekTo(pos() + 10);
    else if (e.key === "f") $("#pFull").click();
    else if (e.key === "m") $("#pMute").click();
    else if (e.key === "s" && !$("#skipIntro").hidden) $("#skipIntro").click();
    else if (e.key === "Escape" && !document.fullscreenElement) closePlayer();
  });
  window.addEventListener("pagehide", saveProgress);

  // ---------------------------------------------------------- router
  async function route() {
    stopPoll();
    clearInterval(HERO_T);
    closeSheet();
    const [, page, arg] = (location.hash || "#/").split("?")[0].split("/");
    try {
      if (!ME.profile || page === "profiles" || !page) {
        if (!ME.profile && page !== "profiles") {
          const me = await api("/api/me");
          ME.profile = me.profile; ME.admin = me.admin; ME.ip = me.ip;
        }
        if (!ME.profile || page === "profiles") return pageProfiles(false);
        if (!page) { location.hash = "#/home"; return; }
      }
      if (page === "movies") await pageBrowse("movie");
      else if (page === "shows") await pageBrowse("series");
      else if (page === "title" && arg) await pageTitle(arg);
      else if (page === "search") await pageSearch();
      else if (page === "settings") await pageSettings();
      else if (page === "sync" && isAdmin()) await pageSync();
      else if (page === "server" && isAdmin()) await pageServer();
      else await pageHome();
      if (isAdmin() && page !== "sync" && page !== "home") api("/api/admin/sync").then((s) => { SYNC = s; updateSyncChip(); }).catch(() => {});
    } catch (e) {
      if (e.message === "pick profile") return;
      if (e.status === 403 && /allow list/.test(e.message)) {
        app.innerHTML = `<main class="page"><div class="empty"><h2>This network isn't allowed</h2><p>Ask Reece to add your internet address to Kino.</p></div></main>`;
        return;
      }
      app.innerHTML = (ME.profile ? topbar("") : "") + `<main class="page"><div class="empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p>
        <a class="btn secondary small" href="#/home">Go Home</a></div></main>`;
      if (ME.profile) wireTopbar();
    }
  }
  window.addEventListener("hashchange", route);
  route();

  // Installable app, the service worker only caches the app shell, never videos or api calls
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
})();
