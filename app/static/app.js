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
    link: "M10.6 13.4a1 1 0 001.4 1.4l3.5-3.5a3 3 0 00-4.2-4.2l-1.8 1.7 1.4 1.4 1.8-1.7a1 1 0 011.4 1.4l-3.5 3.5zm2.8-2.8a1 1 0 00-1.4-1.4l-3.5 3.5a3 3 0 004.2 4.2l1.8-1.7-1.4-1.4-1.8 1.7a1 1 0 01-1.4-1.4l3.5-3.5z",
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

  // ---------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (u) => (u ? "/api/img?u=" + encodeURIComponent(u) : "");
  const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

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
    if (r.status === 401 && !url.endsWith("/login")) { ME = null; showLogin(); throw new Error("signed out"); }
    let j = null;
    try { j = await r.json(); } catch (_) {}
    if (!r.ok) { const e = new Error((j && j.detail) || `Request failed (${r.status})`); e.status = r.status; throw e; }
    if (r.status === 202) return { ...j, _pending: true };
    return j;
  }

  // Broken poster or logo images get swapped for a fallback, done here cause the csp blocks inline onerror
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName !== "IMG") return;
    if (el.dataset.alt && el.src.indexOf(encodeURIComponent(el.dataset.alt)) === -1) { el.src = img(el.dataset.alt); return; }
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

  // ---------------------------------------------------------- state
  let ME = null, LIBRARY = null, POLL = null, SYNC = null;
  const isAdmin = () => ME && ME.role === "admin";

  async function loadLibrary(force) {
    if (!LIBRARY || force) LIBRARY = await api("/api/library");
    return LIBRARY;
  }

  // ---------------------------------------------------------- shell
  function topbar(active) {
    const tabs = [["home", "Home"], ["movies", "Movies"], ["shows", "Shows"]];
    if (isAdmin()) tabs.push(["sync", "Sync"], ["server", "Server"]);
    return `<header class="topbar" id="topbar">
      <a class="brand" href="#/home" aria-label="Kino home"><span class="brand-dot">${ic("play")}</span><span>Kino</span></a>
      <nav class="tabs glass" aria-label="Sections">${tabs.map(([k, l]) => `<a class="tab" href="#/${k}" ${k === active ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div class="top-right">
        ${isAdmin() ? `<a href="#/sync" class="sync-chip glass" id="syncChip"><span class="dot"></span><span class="txt">Sync</span></a>` : ""}
        <div class="menu-wrap">
          <button class="avatar" id="avatarBtn" aria-haspopup="true" aria-label="Account">${esc((ME.username || "?")[0])}</button>
          <div class="menu" id="avatarMenu" hidden style="right:0;left:auto;top:44px;bottom:auto">
            <div style="padding:8px 12px 10px;font-size:13px" class="secondary">Signed in as ${esc(ME.username)}</div>
            <button id="logoutBtn">Sign out</button>
          </div>
        </div>
      </div>
    </header>`;
  }

  function wireTopbar() {
    const b = $("#avatarBtn"), m = $("#avatarMenu");
    b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; };
    $("#logoutBtn").onclick = async () => { await api("/api/logout", {}); ME = null; LIBRARY = null; location.hash = "#/home"; showLogin(); };
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

  // ---------------------------------------------------------- login
  function showLogin(err) {
    stopPoll();
    closePlayer();
    window.onscroll = null;
    const tiles = Array.from({ length: 90 }, (_, i) => `<div style="--h:${(i * 47) % 360}"></div>`).join("");
    app.innerHTML = `<main class="login-wrap">
      <div class="login-bg" aria-hidden="true">${tiles}</div>
      <form class="login-card glass" id="loginForm" autocomplete="on">
        <div class="mark">${ic("play")}</div>
        <h1>Kino</h1>
        <p>Sign in to watch your library.</p>
        <label class="field"><span class="sr">Username</span><input name="username" autocomplete="username" placeholder="Username" required autocapitalize="none" spellcheck="false"></label>
        <label class="field"><span class="sr">Password</span><input name="password" type="password" autocomplete="current-password" placeholder="Password" required></label>
        <button class="btn primary" type="submit">Sign In</button>
        <div class="form-err" id="loginErr" role="alert">${esc(err || "")}</div>
      </form></main>`;
    const f = $("#loginForm");
    f.username.focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button");
      btn.disabled = true;
      $("#loginErr").textContent = "";
      try {
        await api("/api/login", { username: f.username.value, password: f.password.value });
        ME = await api("/api/me");
        route();
      } catch (er) {
        $("#loginErr").textContent = er.message;
        btn.disabled = false;
        f.password.value = "";
        f.password.focus();
      }
    };
  }

  // ---------------------------------------------------------- tiles
  function posterTile(t) {
    const art = t.poster
      ? `<img loading="lazy" src="${img(t.poster)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const sub = t.kind === "series" ? `${t.count} episode${t.count === 1 ? "" : "s"}` : t.releaseInfo || "";
    return `<a class="tile poster" href="#/title/${t.id}"><div class="art">${art}</div><div class="cap">${esc(t.name)}</div><div class="sub">${esc(sub)}</div></a>`;
  }
  function wideTile(t, opts = {}) {
    const bg = t.background
      ? `<img loading="lazy" src="${img(t.background)}" alt="${esc(t.name)}" data-fallback="ph">`
      : `<div class="ph" style="--h:${hue(t.name)}">${esc(t.name)}</div>`;
    const logo = t.logo && t.background ? `<img class="logo-over" loading="lazy" src="${img(t.logo)}" alt="" data-fallback="hide">` : "";
    const bar = opts.progress != null ? `<div class="bar"><i style="width:${Math.min(100, opts.progress * 100)}%"></i></div>` : "";
    const href = opts.href || `#/title/${t.id}`;
    return `<a class="tile landscape" href="${href}" ${opts.play ? `data-play="${opts.play}"` : ""}><div class="art">${bg}${opts.progress == null ? logo : ""}${bar}</div>
      <div class="cap">${esc(t.name)}</div><div class="sub">${esc(opts.sub || t.genres?.slice(0, 2).join(", ") || t.releaseInfo || "")}</div></a>`;
  }

  // ---------------------------------------------------------- home
  async function pageHome() {
    const lib = await loadLibrary(true);
    const titles = lib.titles;
    if (!titles.length) {
      app.innerHTML = topbar("home") + `<main class="page"><div class="empty">
        <h2>${lib.scanning ? "Scanning your Storage Box" : "Nothing here yet"}</h2>
        <p>${lib.error ? esc(lib.error) : lib.scanning ? "This takes a moment the first time." : "Videos show up here once the sync has downloaded them."}</p>
        ${isAdmin() ? `<a class="btn secondary small" href="#/sync">Open Sync</a>` : ""}</div></main>`;
      wireTopbar();
      if (lib.scanning) setTimeout(() => location.hash === "#/home" && route(), 4000);
      return;
    }
    const hero = titles.find((t) => t.background && t.matched) || titles[0];
    const movies = titles.filter((t) => t.kind === "movie");
    const shows = titles.filter((t) => t.kind === "series");
    const meta = [hero.kind === "series" ? "TV Show" : "Movie", hero.releaseInfo, hero.genres?.slice(0, 2).join(", "), hero.runtime, hero.rating ? `IMDb ${hero.rating}` : ""].filter(Boolean);

    app.innerHTML = topbar("home") + `
      <section class="hero">
        <div class="hero-bg">${hero.background ? `<img src="${img(hero.background.replace("/medium/", "/large/"))}" data-alt="${esc(hero.background)}" alt="" data-fallback="hide">` : ""}</div>
        <div class="hero-content">
          ${hero.logo ? `<img class="hero-logo" src="${img(hero.logo)}" alt="${esc(hero.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(hero.name)}</h1>`}
          <div class="hero-meta">${meta.map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${hero.description ? `<p class="hero-desc">${esc(hero.description)}</p>` : ""}
          <div class="actions">
            <a class="btn primary" href="#/title/${hero.id}" data-autoplay="1">${ic("play")} Play</a>
            <a class="btn secondary" href="#/title/${hero.id}">Details</a>
          </div>
        </div>
        ${isAdmin() ? `<a class="hero-live glass" id="heroLive" href="#/sync" hidden></a>` : ""}
      </section>
      <main class="page" style="padding-top:8px">
        ${lib.continue.length ? `<section class="shelf"><h2 class="section-title">Continue Watching</h2>
          <div class="row wide">${lib.continue.map((c) => wideTile(c, { progress: c.pos / c.dur, play: c.file_id, href: `#/title/${c.id}`,
            sub: c.kind === "series" ? `${epLabel(c.season, c.episode)} · ${clock(c.dur - c.pos)} left` : `${clock(c.dur - c.pos)} left` })).join("")}</div></section>` : ""}
        <section class="shelf"><h2 class="section-title">Recently Added</h2>
          <div class="row wide">${titles.slice(0, 14).map((t) => wideTile(t)).join("")}</div></section>
        ${movies.length ? `<section class="shelf"><h2 class="section-title">Movies <a href="#/movies">See All</a></h2>
          <div class="row posters">${movies.slice(0, 24).map(posterTile).join("")}</div></section>` : ""}
        ${shows.length ? `<section class="shelf"><h2 class="section-title">TV Shows <a href="#/shows">See All</a></h2>
          <div class="row posters">${shows.slice(0, 24).map(posterTile).join("")}</div></section>` : ""}
      </main>`;
    wireTopbar();

    // The play button on the hero and continue watching start playback straight away
    app.querySelectorAll("[data-play]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      playFile(a.dataset.play, {});
    }));
    const autoplay = app.querySelector("[data-autoplay]");
    autoplay.addEventListener("click", async (e) => {
      e.preventDefault();
      const t = await api(`/api/title/${hero.id}`);
      const f = nextUp(t);
      if (f) playFile(f.id, { title: t, from: f.progress ? f.progress.pos : 0 });
    });
    if (isAdmin()) startPoll(pollHomeSync, 5000);
  }

  async function pollHomeSync() {
    SYNC = await api("/api/sync");
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
      if (started.length) {
        const last = started.sort((a, b) => b.progress.updated - a.progress.updated)[0];
        const done = last.progress.dur && last.progress.pos / last.progress.dur > 0.93;
        if (!done) return last;
        const i = files.indexOf(last);
        return files[i + 1] || files[0];
      }
    }
    return files[0];
  }

  // ---------------------------------------------------------- movies and shows
  async function pageBrowse(kind) {
    const lib = await loadLibrary();
    const list = lib.titles.filter((t) => t.kind === kind);
    const genres = [...new Set(list.flatMap((t) => t.genres || []))].sort();
    app.innerHTML = topbar(kind === "movie" ? "movies" : "shows") + `<main class="page">
      <h1 class="large-title">${kind === "movie" ? "Movies" : "TV Shows"}</h1>
      <div class="toolbar">
        <label class="search">${ic("search")}<span class="sr">Search</span><input id="q" type="search" placeholder="Search ${kind === "movie" ? "movies" : "shows"}"></label>
        <select class="plain" id="sort" aria-label="Sort"><option value="added">Recently added</option><option value="name">Name</option><option value="year">Year</option><option value="rating">Rating</option></select>
        <select class="plain" id="genre" aria-label="Genre"><option value="">All genres</option>${genres.map((g) => `<option>${esc(g)}</option>`).join("")}</select>
        <span class="secondary" id="count" style="font-size:15px"></span>
      </div>
      <div class="grid" id="grid"></div></main>`;
    wireTopbar();
    const draw = () => {
      const q = $("#q").value.trim().toLowerCase(), g = $("#genre").value, s = $("#sort").value;
      let r = list.filter((t) => (!q || t.name.toLowerCase().includes(q)) && (!g || (t.genres || []).includes(g)));
      r = r.slice().sort((a, b) => s === "name" ? a.name.localeCompare(b.name) : s === "year" ? String(b.releaseInfo || "").localeCompare(String(a.releaseInfo || ""))
        : s === "rating" ? (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) : b.added - a.added);
      $("#grid").innerHTML = r.length ? r.map(posterTile).join("") : `<div class="empty" style="grid-column:1/-1"><h2>No matches</h2><p>Try a different search or genre.</p></div>`;
      $("#count").textContent = `${r.length} ${kind === "movie" ? "movie" : "show"}${r.length === 1 ? "" : "s"}`;
    };
    ["q", "genre", "sort"].forEach((id) => $("#" + id).addEventListener("input", draw));
    draw();
  }

  // ---------------------------------------------------------- title detail
  async function pageTitle(id) {
    const t = await api(`/api/title/${id}`);
    const up = nextUp(t);
    const meta = [t.kind === "series" ? "TV Show" : "Movie", t.releaseInfo, t.genres?.slice(0, 3).join(", "), t.runtime, t.rating ? `IMDb ${t.rating}` : ""].filter(Boolean);
    const allBadges = [...new Set(t.files.flatMap((f) => f.badges))];
    const resume = up && up.progress && up.progress.dur && up.progress.pos / up.progress.dur < 0.93 && up.progress.pos > 30;
    const playLabel = resume ? `Resume${t.kind === "series" ? " " + epLabel(up.season, up.episode) : ""}` : t.kind === "series" && up ? `Play ${epLabel(up.season, up.episode)}` : "Play";
    const seasons = [...new Set(t.files.map((f) => f.season ?? 0))].sort((a, b) => a - b);
    const curSeason = up ? up.season ?? 0 : seasons[0];

    app.innerHTML = topbar(t.kind === "series" ? "shows" : "movies") + `
      <section class="detail-hero">
        <div class="hero-bg">${t.background ? `<img src="${img(t.background.replace("/medium/", "/large/"))}" data-alt="${esc(t.background)}" alt="" data-fallback="hide" style="width:100%;height:100%;object-fit:cover;object-position:center 20%">` : ""}</div>
        <div class="hero-content" style="z-index:2">
          ${t.logo ? `<img class="hero-logo" src="${img(t.logo)}" alt="${esc(t.name)}" data-fallback="text">` : `<h1 class="hero-name">${esc(t.name)}</h1>`}
          <div class="hero-meta">${meta.map((m, i) => `<span class="${i ? "dot-sep" : ""}">${esc(m)}</span>`).join("")}</div>
          ${allBadges.length ? `<div class="badges" style="margin-bottom:16px">${allBadges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>` : ""}
          ${t.description ? `<p class="hero-desc" style="-webkit-line-clamp:4">${esc(t.description)}</p>` : ""}
          <div class="actions">
            ${up ? `<button class="btn primary" id="playMain">${ic("play")} ${esc(playLabel)}</button>` : ""}
            ${resume ? `<button class="btn secondary" id="playStart">Start Over</button>` : ""}
            ${t.kind === "movie" && up ? `<button class="btn secondary round" id="dlMain" aria-label="Download">${ic("download")}</button>` : ""}
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
          <span class="secondary" style="font-size:14px">${bytes(f.size)}</span><button class="btn secondary small" data-playfile="${f.id}">${ic("play")} Play</button></div>`).join("")}</div></section>` : ""}
        ${t.cast?.length ? `<section class="section"><h2 class="section-title">Cast</h2><div class="cast">${t.cast.map((c) => `<span>${esc(c)}</span>`).join("")}</div></section>` : ""}
        <section class="section"><div class="facts">
          ${t.director ? `<div><h4>Director</h4><p>${esc([].concat(t.director).join(", "))}</p></div>` : ""}
          <div><h4>In your library</h4><p>${t.files.length} file${t.files.length === 1 ? "" : "s"}, ${bytes(t.size)}</p></div>
          ${t.genres?.length ? `<div><h4>Genres</h4><p>${esc(t.genres.join(", "))}</p></div>` : ""}
          ${!t.matched ? `<div><h4>Info</h4><p>Couldnt find this title on Cinemeta, so its shown with the file name.</p></div>` : ""}
        </div></section>
      </main>`;
    wireTopbar();
    window.scrollTo(0, 0);

    const drawEps = (season) => {
      const eps = t.files.filter((f) => (f.season ?? 0) === season);
      $("#eps").innerHTML = eps.map((f) => {
        const p = f.progress && f.progress.dur ? f.progress.pos / f.progress.dur : null;
        const art = f.thumbnail ? `<img loading="lazy" src="${img(f.thumbnail)}" alt="${esc(f.ep_name || f.name)}" data-fallback="ph">` : `<div class="ph" style="--h:${hue(t.name)}">${esc(epLabel(f.season, f.episode))}</div>`;
        return `<button class="tile landscape ep" data-playfile="${f.id}"><div class="art">${art}${p != null ? `<div class="bar"><i style="width:${Math.min(100, p * 100)}%"></i></div>` : ""}</div>
          <div class="num">${esc(epLabel(f.season, f.episode) || "Extra")}${f.duration ? ` · ${Math.max(1, Math.round(f.duration / 60))} min` : ""}</div>
          <div class="cap">${esc(f.ep_name || f.name)}</div>${f.ep_overview ? `<div class="ov">${esc(f.ep_overview)}</div>` : ""}</button>`;
      }).join("");
      wirePlayButtons();
    };
    const wirePlayButtons = () => app.querySelectorAll("[data-playfile]").forEach((b) => (b.onclick = () => {
      const f = t.files.find((x) => x.id === b.dataset.playfile);
      playFile(f.id, { title: t, from: f.progress && f.progress.pos / (f.progress.dur || 1) < 0.93 ? f.progress.pos : 0 });
    }));
    if (t.kind === "series") {
      app.querySelectorAll("[data-season]").forEach((b) => (b.onclick = () => {
        app.querySelectorAll("[data-season]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        drawEps(Number(b.dataset.season));
      }));
      drawEps(curSeason);
    } else wirePlayButtons();
    const pm = $("#playMain");
    if (pm) pm.onclick = () => playFile(up.id, { title: t, from: resume ? up.progress.pos : 0 });
    const ps = $("#playStart");
    if (ps) ps.onclick = () => playFile(up.id, { title: t, from: 0 });
    const dl = $("#dlMain");
    if (dl) dl.onclick = async () => {
      const info = await api(`/api/file/${up.id}`);
      const a = document.createElement("a");
      a.href = info.download + "&save=1";
      a.click();
      toast("Download started");
    };
  }

  // ---------------------------------------------------------- sync page
  async function pageSync() {
    app.innerHTML = topbar("sync") + `<main class="page"><h1 class="large-title">Sync</h1><div id="syncBody"><div class="card skel" style="height:220px"></div></div></main>`;
    wireTopbar();
    startPoll(drawSync, 2000);
  }

  async function drawSync() {
    SYNC = await api("/api/sync");
    updateSyncChip();
    const b = $("#syncBody");
    if (!b) return;
    const s = SYNC, st = s.status || {}, c = s.current, svc = s.service;
    const running = svc.state === "active" || svc.state === "activating";
    const ss = syncState(s);
    const pct = c && c.total ? c.bytes / c.total : 0;
    const eta = c && c.speed > 0 ? (c.total - c.bytes) / c.speed : null;
    const last = st.last_run;
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
    const post = s.poster ? `<img src="${img(s.poster)}" alt="" data-fallback="hide">` : `<div class="ph" style="--h:${hue(headline)};font-size:13px">${running ? "" : ""}</div>`;

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
      <section class="card span-4"><h3>Next sync</h3>
        <div class="big" style="font-size:26px">${s.paused ? "Paused" : esc(when(s.timer.next))}</div>
        <div class="note">${s.timer.last ? `Last started ${esc(when(s.timer.last))}` : "Runs every day on the timer"}${s.timer.state && s.timer.state !== "active" ? ". The timer is off, enable it with systemctl" : ""}</div></section>
      <section class="card span-4"><h3>Last run</h3>
        <div class="big" style="font-size:26px">${last ? `${last.new} new` : "–"}</div>
        <div class="note ${last && last.result === "error" ? "err-note" : ""}">${last ? `${last.failed ? `${last.failed} failed, ` : ""}took ${dur(last.finished - last.started)}${last.result === "error" && last.message ? `. ${esc(last.message)}` : ""}` : "Nothing yet"}</div></section>
      <section class="card span-4"><h3>Service</h3>
        <div class="big" style="font-size:26px;text-transform:capitalize">${esc(svc.state || "unknown")}</div>
        <div class="note">${svc.error ? esc(svc.error) : `Result: ${esc(svc.result || "–")}`}</div></section>
      <section class="card span-6"><h3>Pause syncing</h3>
        <div class="secondary" style="font-size:15px">Stops the current download and skips scheduled syncs until the time runs out.</div>
        <div class="presets">${[[24, "1 day"], [48, "2 days"], [72, "3 days"], [168, "1 week"], [336, "2 weeks"], [0, "Until I resume"]]
          .map(([h, l]) => `<button class="btn secondary small" data-pause="${h}">${l}</button>`).join("")}</div>
        <form class="custom-pause" id="customPause"><label for="ph">Or pause for</label><input id="ph" type="number" min="1" max="2000" step="1" value="6" inputmode="numeric"><span>hours</span>
          <button class="btn secondary small" type="submit">Pause</button></form></section>
      <section class="card span-6"><h3>Recently downloaded</h3>
        <div class="list">${(st.recent || []).slice(0, 8).map((r) => `<div class="li"><span class="grow">${esc(r.name)}</span><span class="r">${bytes(r.size)}</span><span class="r">${ago(r.at)}</span></div>`).join("") || `<div class="secondary" style="font-size:15px;padding-top:8px">Finished downloads show up here.</div>`}</div>
        ${(st.failed || []).length ? `<h3 style="margin-top:18px">Failed this run</h3><div class="list">${st.failed.slice(0, 5).map((f) => `<div class="li"><span class="grow">${esc(f.name)}</span><span class="r err-note" title="${esc(f.error)}">Failed</span></div>`).join("")}</div>` : ""}
      </section>
      <section class="card span-12" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px"><h3>Library</h3><div style="font-size:15px">${LIBRARY ? `${LIBRARY.files} files, last scanned ${LIBRARY.scanned_at ? ago(LIBRARY.scanned_at) : "never"}` : "Scans the Storage Box every 10 minutes."}</div></div>
        <button class="btn secondary small" id="rescan">${ic("refresh")} Rescan Library</button></section>
    </div>`;

    b.querySelectorAll("[data-act]").forEach((x) => (x.onclick = () => syncAction(x.dataset.act)));
    b.querySelectorAll("[data-pause]").forEach((x) => (x.onclick = () => syncAction("pause", { hours: Number(x.dataset.pause) })));
    $("#customPause").onsubmit = (e) => { e.preventDefault(); const h = Number($("#ph").value); if (h > 0) syncAction("pause", { hours: h }); };
    $("#rescan").onclick = async () => { await api("/api/library/rescan", {}); toast("Rescanning the library"); setTimeout(() => loadLibrary(true), 4000); };
  }

  async function syncAction(act, body = {}) {
    const msgs = { start: "Sync started", stop: "Stopping the sync", resume: "Sync resumed", pause: "Sync paused" };
    try {
      await api(`/api/sync/${act}`, body);
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
    const s = await api("/api/stats");
    const b = $("#srvBody");
    if (!b) return;
    const h = s.hist, last = h[h.length - 1] || { cpu: 0, mem: 0, rx: 0, tx: 0, rd: 0, wr: 0 };
    const netMax = Math.max(...h.map((x) => Math.max(x.rx, x.tx)), 1024);
    const ioMax = Math.max(...h.map((x) => Math.max(x.rd, x.wr)), 1024);
    b.innerHTML = `<div class="cards">
      <section class="card span-3"><h3>CPU</h3><div class="big">${Math.round(last.cpu)}<small>%</small></div>${spark(h.map((x) => x.cpu), 100, "#0a84ff")}
        <div class="note">${s.cores} cores, load ${s.load.map((l) => l.toFixed(2)).join(" ")}</div></section>
      <section class="card span-3"><h3>Memory</h3><div class="big">${Math.round(s.mem.percent)}<small>%</small></div>${spark(h.map((x) => x.mem), 100, "#30d158")}
        <div class="note">${bytes(s.mem.used)} of ${bytes(s.mem.total)}${s.swap.total ? `, swap ${bytes(s.swap.used)}` : ""}</div></section>
      <section class="card span-3"><h3>Network</h3><div class="big" style="font-size:26px">${rate(last.rx)}</div>${spark(h.map((x) => x.rx), netMax, "#64d2ff")}
        <div class="legend"><span><i style="background:#64d2ff"></i>In ${rate(last.rx)}</span><span><i style="background:#bf5af2"></i>Out ${rate(last.tx)}</span></div></section>
      <section class="card span-3"><h3>Disk activity</h3><div class="big" style="font-size:26px">${rate(last.rd + last.wr)}</div>${spark(h.map((x) => x.rd + x.wr), ioMax, "#ff9f0a")}
        <div class="legend"><span>Read ${rate(last.rd)}</span><span>Write ${rate(last.wr)}</span></div></section>
      ${storageCard("Storage Box", s.disks.box, "blue", "Run mount -a on the VPS and check /etc/fstab.")}
      ${storageCard("VPS disk", s.disks.vps, "")}
      <section class="card span-8"><h3>Busiest processes</h3><div class="list">${s.procs.map((p) => `<div class="li"><span class="grow">${esc(p.name)} <span class="tertiary">${esc(p.user || "")}</span></span><span class="r">${p.cpu.toFixed(1)}% CPU</span><span class="r">${bytes(p.mem)}</span></div>`).join("")}</div></section>
      <section class="card span-4"><h3>Uptime</h3><div class="big" style="font-size:26px">${dur(s.uptime)}</div>
        <div class="note">${s.players} active player${s.players === 1 ? "" : "s"}</div></section>
    </div>`;
  }

  // ---------------------------------------------------------- polling
  function startPoll(fn, ms) {
    stopPoll();
    const tick = async () => {
      try { await fn(); } catch (e) { if (e.message !== "signed out") console.warn(e); }
      if (POLL) POLL.t = setTimeout(tick, document.hidden ? ms * 5 : ms);
    };
    POLL = { t: null };
    tick();
  }
  function stopPoll() { if (POLL) clearTimeout(POLL.t); POLL = null; }

  // ---------------------------------------------------------- player
  const pl = {
    el: $("#player"), v: $("#video"), info: null, mode: null, hls: null, sid: null, offset: 0, audio: 0,
    cues: null, subId: null, title: null, saveT: null, idleT: null, files: null, dragging: false,
  };
  $("#pClose").innerHTML = ic("close");
  $("#pBack").innerHTML = ic("back10");
  $("#pFwd").innerHTML = ic("fwd10");
  $("#pFull").innerHTML = ic("full");
  $("#pMute").innerHTML = ic("vol");

  const pos = () => (pl.mode === "hls" ? pl.offset + pl.v.currentTime : pl.v.currentTime);
  const total = () => (pl.info && pl.info.duration) || pl.v.duration || 0;

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
    pl.el.hidden = false;
    document.body.style.overflow = "hidden";
    spinner(true);
    $("#pMsg").hidden = true;
    $("#subsLayer").innerHTML = "";
    let info;
    try { info = await api(`/api/file/${fid}`); } catch (e) { showMsg("Cant play this file", e.message); return; }
    pl.info = info; pl.audio = info.default_audio; pl.cues = null; pl.subId = null;
    pl.title = opts.title || null;
    pl.files = opts.title ? opts.title.files : null;
    const t = opts.title;
    $("#pTitle").textContent = t ? t.name : info.name;
    const f = t && t.files.find((x) => x.id === fid);
    $("#pSub").textContent = t && t.kind === "series" && f ? `${epLabel(f.season, f.episode)}${f.ep_name ? "  " + f.ep_name : ""}` : (info.badges || []).join("  ");
    buildMenus();
    const start = opts.from != null ? opts.from : 0;
    const vcodec = info.video && info.video.codec;
    const dlBtn = `<a class="btn secondary small" href="${esc(info.download)}&save=1">${ic("download")} Download</a>
      <button class="btn secondary small" id="copyLink">${ic("link")} Copy link for VLC</button>`;

    if (info.direct && codecOk(vcodec)) {
      pl.mode = "direct";
      pl.v.src = `/api/stream/${fid}/direct`;
      pl.v.addEventListener("loadedmetadata", () => { if (start) pl.v.currentTime = start; }, { once: true });
      pl.v.play().catch(() => {});
    } else if (!codecOk(vcodec)) {
      showMsg("This browser cant play this video", `It uses ${String(vcodec).toUpperCase()} video. Safari or Chrome on a Mac usually can, or you can download it and use VLC.`, dlBtn);
      wireCopy(info);
      return;
    } else {
      await startHls(start);
    }
    pl.saveT = setInterval(saveProgress, 10000);
    wakeUi();
  }

  function wireCopy(info) {
    const b = $("#copyLink");
    if (b) b.onclick = async () => {
      try { await navigator.clipboard.writeText(location.origin + info.download); toast("Link copied, it works for 6 hours"); }
      catch (_) { toast("Couldnt copy, your browser blocked it"); }
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
      showMsg("Playback couldnt start", e.message, `<a class="btn secondary small" href="${esc(pl.info.download)}&save=1">${ic("download")} Download instead</a>`);
      return;
    }
    if (pl.el.hidden) { api(`/api/play/${r.sid}/stop`, {}).catch(() => {}); return; }
    pl.mode = "hls"; pl.sid = r.sid; pl.offset = r.offset;
    if (window.Hls && Hls.isSupported()) {
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
    if (pl.hls) { pl.hls.destroy(); pl.hls = null; }
    if (pl.sid) { api(`/api/play/${pl.sid}/stop`, {}).catch(() => {}); pl.sid = null; }
    pl.v.pause();
    pl.v.removeAttribute("src");
    pl.v.load();
    pl.info = null; pl.mode = null;
    if (!keepOpen && wasOpen) {
      pl.el.hidden = true;
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Redraws the page behind so the resume bars are up to date
      if (ME && (location.hash.startsWith("#/title/") || location.hash === "#/home" || !location.hash)) route();
    }
  }

  function buildMenus() {
    const info = pl.info;
    $("#pAudio").innerHTML = `${ic("audio")} Audio`;
    $("#pAudio").hidden = info.audio.length < 2;
    $("#mAudio").innerHTML = info.audio.map((a) => `<button data-a="${a.n}"><span class="chk">${a.n === pl.audio ? ic("check") : ""}</span>${esc(a.label)}</button>`).join("");
    $("#pSubs").innerHTML = `${ic("cc")} Subtitles`;
    $("#pSubs").hidden = !info.subs.length;
    $("#mSubs").innerHTML = `<button data-s=""><span class="chk">${!pl.subId ? ic("check") : ""}</span>Off</button>` +
      info.subs.map((s) => `<button data-s="${s.id}"><span class="chk">${s.id === pl.subId ? ic("check") : ""}</span>${esc(s.label)}${s.kind === "embedded" && !s.ready ? ' <span class="tertiary">(prepares first)</span>' : ""}</button>`).join("");
    $("#mAudio").querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      pl.audio = Number(b.dataset.a); $("#mAudio").hidden = true; buildMenus();
      startHls(pos());  // A different audio track needs a fresh stream from the server
    }));
    $("#mSubs").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { $("#mSubs").hidden = true; loadSubs(b.dataset.s); }));
  }

  async function loadSubs(id) {
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
      if (!r.ok) { toast("Those subtitles couldnt be loaded"); return; }
      pl.cues = parseVtt(await r.text());
      toast("Subtitles on");
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
    if (pl.files && pl.title && pl.title.kind === "series") {
      const i = pl.files.findIndex((f) => f.id === (pl.info && pl.info.id));
      const next = pl.files[i + 1];
      if (next) { toast(`Up next: ${epLabel(next.season, next.episode)}`); playFile(next.id, { title: pl.title, from: 0 }); return; }
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
  $("#pFull").onclick = () => (document.fullscreenElement ? document.exitFullscreen() : pl.el.requestFullscreen?.()) ;
  document.addEventListener("fullscreenchange", () => ($("#pFull").innerHTML = ic(document.fullscreenElement ? "exitfull" : "full")));
  $("#pMute").onclick = () => { v.muted = !v.muted; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  $("#pVol").oninput = (e) => { v.volume = Number(e.target.value); v.muted = v.volume === 0; $("#pMute").innerHTML = ic(v.muted ? "mute" : "vol"); };
  $("#pAudio").onclick = (e) => { e.stopPropagation(); $("#mSubs").hidden = true; $("#mAudio").hidden = !$("#mAudio").hidden; };
  $("#pSubs").onclick = (e) => { e.stopPropagation(); $("#mAudio").hidden = true; $("#mSubs").hidden = !$("#mSubs").hidden; };
  pl.el.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) { $("#mAudio").hidden = true; $("#mSubs").hidden = true; }
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
    pl.idleT = setTimeout(() => { if (!v.paused && !pl.dragging && $("#mAudio").hidden && $("#mSubs").hidden) pl.el.classList.add("idle"); }, 3000);
  }
  ["mousemove", "pointerdown", "keydown"].forEach((ev) => pl.el.addEventListener(ev, wakeUi));

  document.addEventListener("keydown", (e) => {
    if (pl.el.hidden || e.target.tagName === "INPUT") return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowLeft" && e.target !== scrub) seekTo(pos() - 10);
    else if (e.key === "ArrowRight" && e.target !== scrub) seekTo(pos() + 10);
    else if (e.key === "f") $("#pFull").click();
    else if (e.key === "m") $("#pMute").click();
    else if (e.key === "Escape" && !document.fullscreenElement) closePlayer();
  });
  window.addEventListener("pagehide", saveProgress);

  // ---------------------------------------------------------- router
  async function route() {
    if (!ME) {
      try { ME = await api("/api/me"); } catch (_) { return; }
    }
    stopPoll();
    const [, page, arg] = (location.hash || "#/home").split("/");
    try {
      if (page === "movies") await pageBrowse("movie");
      else if (page === "shows") await pageBrowse("series");
      else if (page === "title" && arg) await pageTitle(arg);
      else if (page === "sync" && isAdmin()) await pageSync();
      else if (page === "server" && isAdmin()) await pageServer();
      else await pageHome();
      if (isAdmin() && page !== "sync" && page !== "home") api("/api/sync").then((s) => { SYNC = s; updateSyncChip(); }).catch(() => {});
    } catch (e) {
      if (e.message === "signed out") return;
      app.innerHTML = (ME ? topbar("") : "") + `<main class="page"><div class="empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p>
        <a class="btn secondary small" href="#/home">Go Home</a></div></main>`;
      if (ME) wireTopbar();
    }
  }
  window.addEventListener("hashchange", route);
  route();
})();
