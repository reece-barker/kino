/* Kino offline downloads. Keeps films and episodes on this device so they play with no connection.
   The server makes a phone friendly copy (mp4), offline-worker.js fetches it into the device's private file storage (OPFS), the list and the pictures live in
   IndexedDB. Works in a browser, an installed web app, the Mac app and the Android app. KinoOffline.start(...), .list(), .remove(id), .fileUrl(id), .on(fn) */
(function () {
  "use strict";
  const DB = "kino-offline", DIR = "kino-downloads";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- the list (IndexedDB)
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("downloads", { keyPath: "id" }); d.createObjectStore("positions", { keyPath: "file_id" }); };
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
            if (e.status === 404) throw new Error("The server lost track of that one, please start it again");
            rec.waiting = true; await save(rec); await sleep(3000); continue;
          }
          rec.waiting = false;
          rec.server = { state: j.state, progress: j.progress, eta: j.eta, queue: j.queue };
          rec.size = j.size || rec.size;
          rec.state = j.state === "queued" ? "queued" : "preparing";
          rec.subs = j.subs || rec.subs;
          await save(rec);
          if (j.state === "done") break;
          if (j.state === "failed" || j.state === "gone") throw new Error(j.error || "The server couldn't make that copy");
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
          if (m.type === "progress") { rec.got = m.off; rec.size = m.total || rec.size; rec.speed = m.speed; rec.waiting = false; save(rec); }
          else if (m.type === "wait") { rec.waiting = true; save(rec); }
          else if (m.type === "done") ok("done");
          else if (m.type === "stopped") ok("stopped");
          else if (m.type === "error") no(new Error(m.message));
        };
        ctl.worker.postMessage({ cmd: "get", url: `/api/offline/file/${rec.jobId}`, name: `${rec.id}.mp4`, total: rec.size || 0 });
      });
      if (result === "stopped") return;
      rec.state = "ready"; rec.got = rec.size; rec.speed = 0; rec.finished = Date.now();
      await save(rec);
      api(`/api/offline/job/${rec.jobId}/done`, {}).catch(() => {});  // the copy on the server can go now
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      rec.state = "failed"; rec.error = e.message; await save(rec);
    } finally {
      RUN.delete(rec.id); ctl.worker.terminate(); letSleep(); emit();
    }
  }

  function go(rec) {
    if (RUN.has(rec.id)) return;
    const ctl = { stop: false, worker: new Worker("/static/offline-worker.js") };
    RUN.set(rec.id, ctl);
    drive(rec, ctl);
  }

  const KinoOffline = {
    supported,
    on(f) { subs.add(f); return () => subs.delete(f); },
    list: all,
    get: (id) => run("downloads", "readonly", (s) => s.get(id)),
    active: () => RUN.size,
    // Asks the server for a copy and starts it
    async start({ file_id, quality, audio, subs: sub, meta, profile_id, images }) {
      if (!supported()) throw new Error("This browser can't keep downloads");
      const job = await api("/api/offline/prepare", { file_id, quality, audio: audio || 0, subs: sub || [] });
      const old = await run("downloads", "readonly", (s) => s.get(job.id));
      if (old && old.state === "ready") return old;
      const rec = { id: job.id, jobId: job.id, file_id, profile_id, quality, audio: audio || 0, meta: { ...(meta || {}), ...(job.meta || {}) }, state: "preparing", phase: "server", size: job.size, got: 0,
                    subs: job.subs || [], server: { state: job.state, progress: job.progress, eta: job.eta, queue: job.queue }, added: Date.now() };
      // The pictures, kept as they are so the Downloads screen has them offline
      rec.poster = await blobOf(images && images.poster); rec.background = await blobOf(images && images.background);
      await save(rec);
      go(rec);
      return rec;
    },
    pause(id) { const c = RUN.get(id); if (!c) return; c.stop = true; c.worker.postMessage({ cmd: "stop" }); setTimeout(async () => { const r = await KinoOffline.get(id); if (r && r.state !== "ready" && r.state !== "failed") { r.state = "paused"; await save(r); } }, 400); },
    async resume(id) { const r = await KinoOffline.get(id); if (!r) return; r.state = r.phase === "device" ? "downloading" : "preparing"; r.error = null; await save(r); go(r); },
    async retry(id) { return KinoOffline.resume(id); },
    async remove(id) {
      const c = RUN.get(id); if (c) { c.stop = true; c.worker.postMessage({ cmd: "stop" }); c.worker.terminate(); RUN.delete(id); }
      const r = await KinoOffline.get(id);
      if (r && r.state !== "ready") api(`/api/offline/job/${r.jobId}`, undefined, "DELETE").catch(() => {});
      await dropFile(`${id}.mp4`);
      for (let i = 0; i < 10; i++) await dropFile(`${id}.${i}.vtt`);
      await del(id); letSleep(); emit();
    },
    // After the page was closed: carries on whatever was part way, if there is a connection
    async resumeAll(profileId) {
      if (!supported() || !navigator.onLine) return;
      for (const r of await all()) if (r.profile_id === profileId && ["preparing", "queued", "downloading", "paused"].includes(r.state) && r.state !== "paused") go(r);
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
