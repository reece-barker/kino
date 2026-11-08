/* Kino offline downloads. Keeps films and episodes on this device so they play with no connection.
   The server makes a phone friendly copy (mp4), offline-worker.js fetches it into the device's private file storage (OPFS), the list and the pictures live in
   IndexedDB. Works in a browser, an installed web app, the Mac app and the Android app. KinoOffline.start(...), .list(), .remove(id), .fileUrl(id), .on(fn) */
(function () {
  "use strict";
  const DB = "kino-offline", DIR = "kino-downloads";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // What a dropped or slow connection looks like in each browser ("Load failed" is Safari's), none of these should end a download
  const FLAKY = /load failed|failed to fetch|network|connection|timed out|timeout|aborted|offline|kept dropping/i;

  // ---- the list (IndexedDB)
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => { const d = r.result; const has = (n) => d.objectStoreNames.contains(n);
      if (!has("downloads")) d.createObjectStore("downloads", { keyPath: "id" });
      if (!has("positions")) d.createObjectStore("positions", { keyPath: "file_id" });
      if (!has("wants")) d.createObjectStore("wants", { keyPath: "key" }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; no(r.error); };
  }));
  const run = async (store, mode, fn) => {
    const d = await idb();
    return new Promise((ok, no) => { const t = d.transaction(store, mode), s = t.objectStore(store), req = fn(s); t.oncomplete = () => ok(req && req.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error); });
  };
  const all = () => run("downloads", "readonly", (s) => s.getAll()).then((x) => x || []);
  const put = (rec) => run("downloads", "readwrite", (s) => s.put(rec));
  const del = (id) => run("downloads", "readwrite", (s) => s.delete(id));

  const supported = () => !!(window.isSecureContext && navigator.storage && navigator.storage.getDirectory && window.Worker && window.indexedDB);

  // ---- files (OPFS), read on the page
  const folder = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(DIR, { create: true });
  const fileOf = async (name) => (await (await folder()).getFileHandle(name)).getFile();
  const dropFile = async (name) => { try { await (await folder()).removeEntry(name); } catch (_) {} };

  // ---- telling the page
  const subs = new Set();
  let timer = 0;
  const emit = () => { if (timer) return; timer = setTimeout(() => { timer = 0; subs.forEach((f) => { try { f(); } catch (_) {} }); }, 250); };

  // ---- the running downloads
  const RUN = new Map();  // id -> { worker, stop }
  let lock = null;
  const keepAwake = async () => {
    try { if (!lock && "wakeLock" in navigator && RUN.size) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); } } catch (_) {}
  };
  const letSleep = () => { if (!RUN.size && lock) { lock.release().catch(() => {}); lock = null; } };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) keepAwake(); });

  const api = async (url, body, method) => {
    const r = await fetch(url, { method: method || (body !== undefined ? "POST" : "GET"), headers: { "X-Kino": "1", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, credentials: "same-origin", body: body !== undefined ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (_) {}
    if (!r.ok) { const e = new Error((j && j.detail) || `Request failed (${r.status})`); e.status = r.status; throw e; }
    return j;
  };
  const save = async (rec) => { await put(rec); emit(); };
  const blobOf = (u) => (u ? fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? r.blob() : null)).catch(() => null) : Promise.resolve(null));

  // Server first (the copy is made there, with its own progress), then the device downloads it
  async function drive(rec, ctl) {
    try {
      rec.error = null;
      if (rec.phase !== "device") {
        rec.state = rec.server && rec.server.queue ? "queued" : "preparing";
        await save(rec);
        for (;;) {
          if (ctl.stop) return;
          let j;
          try { j = await api(`/api/offline/job/${rec.jobId}`); } catch (e) {
            if (e.status === 404) throw Object.assign(new Error("requeue"), { requeue: true });  // the server forgot it (an update, a clean up): ask for it again
            rec.waiting = true; await save(rec); await sleep(3000); continue;
          }
          rec.waiting = false;
          rec.server = { state: j.state, progress: j.progress, eta: j.eta, queue: j.queue };
          rec.size = j.size || rec.size;
          rec.state = j.state === "queued" ? "queued" : "preparing";
          rec.subs = j.subs || rec.subs;
          await save(rec);
          if (j.state === "done") break;
          if (j.state === "gone") throw Object.assign(new Error("requeue"), { requeue: true });
          if (j.state === "failed") throw new Error(j.error || "The server couldn't make that copy");
          await sleep(2000);
        }
        rec.phase = "device"; rec.got = 0; await save(rec);
      }
      // The subtitles are small, they go first
      for (let i = 0; i < (rec.subs || []).length; i++) {
        if (ctl.stop) return;
        await new Promise((ok) => { const h = (e) => { if (e.data.type === "text") { ctl.worker.removeEventListener("message", h); ok(); } }; ctl.worker.addEventListener("message", h); ctl.worker.postMessage({ cmd: "text", url: `/api/offline/sub/${rec.jobId}/${i}`, name: `${rec.id}.${i}.vtt` }); });
      }
      rec.state = "downloading"; await save(rec);
      keepAwake();
      const result = await new Promise((ok, no) => {
        ctl.worker.onmessage = (e) => {
          const m = e.data;
          if (m.type === "progress") { rec.retries = 0; rec.got = m.off; rec.size = m.total || rec.size; rec.speed = m.speed; rec.waiting = false; save(rec); }
          else if (m.type === "wait") { rec.waiting = true; save(rec); }
          else if (m.type === "done") ok("done");
          else if (m.type === "stopped") ok("stopped");
          else if (m.type === "error") no(Object.assign(new Error(m.message), { gone: /no longer has/.test(m.message), flaky: FLAKY.test(m.message) }));
        };
        ctl.worker.postMessage({ cmd: "get", url: `/api/offline/file/${rec.jobId}`, name: `${rec.id}.mp4`, total: rec.size || 0 });
      });
      if (result === "stopped") return;
      rec.state = "ready"; rec.got = rec.size; rec.speed = 0; rec.finished = Date.now();
      await save(rec);
      api(`/api/offline/job/${rec.jobId}/done`, {}).catch(() => {});  // the copy on the server can go now
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      if (!e.requeue && !e.gone && !e.flaky && FLAKY.test(e.message || "") && (rec.retries || 0) < 12) e.flaky = true;
      if (e.requeue || e.gone) {
        // The copy on the server is gone (restart, clean up): start that one again from the queue, the part on this device is dropped
        await dropFile(`${rec.id}.mp4`);
        Object.assign(rec, { jobId: null, state: "waiting", phase: "server", got: 0, speed: 0, server: null, waiting: false, error: null }); await save(rec);
      } else if (e.flaky) {
        rec.retries = (rec.retries || 0) + 1;
        rec.state = rec.phase === "device" ? "downloading" : "preparing"; rec.waiting = true; rec.speed = 0; await save(rec);  // picked up again by itself when the connection is back
      } else { rec.state = "failed"; rec.error = e.message; await save(rec); }
    } finally {
      RUN.delete(rec.id); ctl.worker.terminate(); letSleep(); emit(); pump();
    }
  }

  function go(rec) {
    if (RUN.has(rec.id)) return;
    const ctl = { stop: false, worker: new Worker("/static/offline-worker.js") };
    RUN.set(rec.id, ctl);
    drive(rec, ctl);
  }

  // The queue lives on the device: everything asked for is saved here first and handed to the server a couple at a time (it only makes a few copies at once),
  // so a whole season keeps going through restarts, a server that is down for a while and a closed page
  const MAX_SERVER = 3;
  let pumping = false, pumpT = 0, PROFILE = null;
  async function pump() {
    if (pumping || !navigator.onLine) return;
    pumping = true;
    let again = false;
    try {
      for (;;) {
        const rows = (await all()).filter((r) => !PROFILE || r.profile_id === PROFILE);
        const onServer = rows.filter((r) => r.jobId && r.phase !== "device" && ["queued", "preparing"].includes(r.state)).length;
        const next = rows.filter((r) => r.state === "waiting").sort((x, y) => x.added - y.added)[0];
        if (!next) break;
        if (onServer >= MAX_SERVER) { again = true; break; }
        try {
          const o = await api(`/api/offline/options/${next.file_id}`);
          const q = o.qualities.some((x) => x.quality === next.quality) ? next.quality : (o.qualities[0] || {}).quality;
          if (!q) throw new Error("That one can't be made for offline");
          const subs = o.subs.filter((x) => (next.subLabels || []).includes(x.label)).map((x) => x.id);
          const job = await api("/api/offline/prepare", { file_id: next.file_id, quality: q, audio: next.audio || 0, subs });
          Object.assign(next, { jobId: job.id, quality: q, size: job.size, subs: job.subs || [], meta: { ...next.meta, ...(job.meta || {}) }, state: job.state === "queued" ? "queued" : "preparing", phase: "server", error: null,
                                server: { state: job.state, progress: job.progress, eta: job.eta, queue: job.queue } });
          await save(next);
          go(next);
        } catch (e) {
          // Busy, no room right now or no connection: it stays in the queue and is tried again. Anything else is that one's own problem
          if (!e.status || e.status === 429 || e.status === 503 || e.status >= 500) { again = true; break; }
          next.state = "failed"; next.error = e.message; await save(next);
        }
      }
    } finally { pumping = false; }
    if (again && !pumpT) pumpT = setTimeout(() => { pumpT = 0; pump(); }, 12000);
  }
  // Seasons asked for as a whole: the episodes that aren't in the Library yet (still being saved to it) are added as they turn up
  const wants = () => run("wants", "readonly", (x) => x.getAll()).then((x) => x || []).catch(() => []);
  async function checkWants() {
    if (!navigator.onLine || !PROFILE) return;
    for (const w of await wants()) {
      if (w.profile_id !== PROFILE) continue;
      if (Date.now() - w.added > 21 * 86400000) { await run("wants", "readwrite", (x) => x.delete(w.key)); continue; }
      let t;
      try { t = await api(`/api/title/${w.title_id}`); } catch (e) { if (e.status === 404) await run("wants", "readwrite", (x) => x.delete(w.key)); continue; }
      const have = new Set((await all()).filter((r) => r.profile_id === PROFILE && r.state !== "failed").map((r) => r.file_id));
      const fresh = t.files.filter((f) => f.season === w.season && !have.has(f.id));
      if (fresh.length) {
        const blobs = { poster: w.poster, background: w.background };
        await KinoOffline.startMany(fresh.map((f) => ({ file_id: f.id, est: 0, meta: { ...w.meta, season: f.season, episode: f.episode, ep_name: f.ep_name || null } })),
          { quality: w.quality, audio: w.audio, subLabels: w.subLabels, profile_id: PROFILE, blobs });
      }
      // Everything it was waiting for has turned up
      const got = new Set(t.files.filter((f) => f.season === w.season).map((f) => f.episode));
      if (w.episodes.every((n) => got.has(n))) await run("wants", "readwrite", (x) => x.delete(w.key));
    }
  }
  // Every half minute: anything that should be running but isn't (the server was down, the connection dropped) is picked up again
  setInterval(async () => {
    if (!navigator.onLine || !PROFILE) return;
    for (const r of await all()) if (r.profile_id === PROFILE && ["preparing", "queued", "downloading"].includes(r.state) && !RUN.has(r.id)) go(r);
    pump();
    checkWants();
  }, 30000);

  const KinoOffline = {
    supported,
    on(f) { subs.add(f); return () => subs.delete(f); },
    list: all,
    get: (id) => run("downloads", "readonly", (s) => s.get(id)),
    active: () => RUN.size,
    // Adds films or episodes to the queue. items: [{ file_id, meta }], one set of choices for all of them
    async startMany(items, { quality, audio, subLabels, profile_id, images, blobs }) {
      if (!supported()) throw new Error("This browser can't keep downloads");
      PROFILE = profile_id;
      const have = (await all()).filter((r) => r.profile_id === profile_id && r.state !== "failed");
      const poster = blobs ? blobs.poster : await blobOf(images && images.poster), background = blobs ? blobs.background : await blobOf(images && images.background);
      let n = 0;
      for (const it of items) {
        if (have.some((r) => r.file_id === it.file_id)) continue;
        await save({ id: "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), jobId: null, file_id: it.file_id, profile_id, quality, audio: audio || 0, subLabels: subLabels || [], meta: it.meta || {},
                     state: "waiting", phase: "server", size: it.est || 0, got: 0, subs: [], server: null, added: Date.now() + n++, poster, background });
      }
      pump();
      return n;
    },
    wants,
    async want(w) { const key = `${w.profile_id}:${w.title_id}:${w.season}`; await run("wants", "readwrite", (x) => x.put({ ...w, key, added: Date.now() })); emit(); },
    async unwant(name, profile_id) { for (const w of await wants()) if (w.profile_id === profile_id && w.meta && w.meta.name === name) await run("wants", "readwrite", (x) => x.delete(w.key)); emit(); },
    start({ file_id, quality, audio, subLabels, meta, profile_id, images, est }) { return KinoOffline.startMany([{ file_id, meta, est }], { quality, audio, subLabels, profile_id, images }); },
    pause(id) { const c = RUN.get(id); if (!c) { KinoOffline.get(id).then(async (r) => { if (r && ["waiting", "queued", "preparing", "downloading"].includes(r.state)) { r.state = "paused"; await save(r); } }); return; } c.stop = true; c.worker.postMessage({ cmd: "stop" }); setTimeout(async () => { const r = await KinoOffline.get(id); if (r && r.state !== "ready" && r.state !== "failed") { r.state = "paused"; await save(r); } }, 400); },
    async resume(id) { const r = await KinoOffline.get(id); if (!r) return; r.state = !r.jobId ? "waiting" : r.phase === "device" ? "downloading" : "preparing"; r.error = null; await save(r); if (r.state === "waiting") pump(); else go(r); },
    async retry(id) { return KinoOffline.resume(id); },
    async removeMany(ids) { for (const id of ids) await KinoOffline.remove(id); },
    async remove(id) {
      const c = RUN.get(id); if (c) { c.stop = true; c.worker.postMessage({ cmd: "stop" }); c.worker.terminate(); RUN.delete(id); }
      const r = await KinoOffline.get(id);
      if (r && r.state !== "ready" && r.jobId) api(`/api/offline/job/${r.jobId}`, undefined, "DELETE").catch(() => {});
      await dropFile(`${id}.mp4`);
      for (let i = 0; i < 10; i++) await dropFile(`${id}.${i}.vtt`);
      await del(id); letSleep(); emit();
    },
    // After the page was closed: carries on whatever was part way, if there is a connection
    async resumeAll(profileId) {
      if (!supported() || !navigator.onLine) return;
      PROFILE = profileId;
      for (const r of await all()) if (r.profile_id === profileId && ["preparing", "queued", "downloading"].includes(r.state)) go(r);
      pump(); checkWants();
    },
    async fileUrl(id) { return URL.createObjectURL(await fileOf(`${id}.mp4`)); },
    async subText(id, n) { try { return await (await fileOf(`${id}.${n}.vtt`)).text(); } catch (_) { return null; } },
    async storage() {
      const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => ({})) : {};
      const rows = await all();
      return { usage: e.usage || 0, quota: e.quota || 0, files: rows.filter((r) => r.state === "ready").reduce((a, r) => a + (r.size || 0), 0), persisted: navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted().catch(() => false) : false };
    },
    // Where somebody got to while offline, sent to the server when there is a connection again
    savePos(file_id, pos, dur) { return run("positions", "readwrite", (s) => s.put({ file_id, pos, dur, at: Date.now() })).catch(() => {}); },
    async syncPositions() {
      if (!navigator.onLine) return 0;
      const rows = await run("positions", "readonly", (s) => s.getAll()).catch(() => []);
      let n = 0;
      for (const r of rows || []) {
        try { await api("/api/progress", { file_id: r.file_id, pos: r.pos, dur: r.dur }); await run("positions", "readwrite", (s) => s.delete(r.file_id)); n++; } catch (_) { break; }
      }
      return n;
    },
    async position(file_id) { const r = await run("positions", "readonly", (s) => s.get(file_id)).catch(() => null); return r ? r.pos : 0; },
  };
  window.KinoOffline = KinoOffline;
})();
