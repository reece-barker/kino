/* Kino offline download worker. Fetches a file from the server in pieces and writes it into this device's private file storage (OPFS), so it can be paused,
   resumed after a dropped connection, and never holds the whole video in memory. Commands from the page: get, text, stop. */
"use strict";
const DIR = "kino-downloads";
let stopFlag = false;

const dir = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(DIR, { create: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(m) {
  stopFlag = false;
  const d = await dir();
  const fh = await d.getFileHandle(m.name, { create: true });
  const h = await fh.createSyncAccessHandle();
  const CH = 4 * 1024 * 1024;
  let off = h.getSize(), total = m.total || 0, t0 = Date.now(), t0b = off, lastFlush = off, fails = 0;
  try {
    while (!stopFlag) {
      if (total && off >= total) break;
      let r;
      try {
        r = await fetch(m.url, { headers: { Range: `bytes=${off}-${off + CH - 1}` }, credentials: "same-origin" });
      } catch (e) {
        // The connection dropped: wait and try the same piece again, up to a few minutes, then tell the page
        if (++fails > 40) throw new Error("The connection kept dropping");
        postMessage({ type: "wait", off, total });
        await wait(Math.min(8000, 1000 * fails));
        continue;
      }
      if (r.status === 416) break;  // asked for past the end: it was all there already
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 409) throw new Error(r.status === 404 || r.status === 409 ? "The server no longer has that copy" : "Not allowed");
      if (r.status !== 206 && r.status !== 200) { if (++fails > 40) throw new Error(`The server answered ${r.status}`); await wait(Math.min(8000, 1000 * fails)); continue; }
      fails = 0;
      const cr = /\/(\d+)\s*$/.exec(r.headers.get("content-range") || "");
      if (cr) total = Number(cr[1]);
      else if (r.status === 200) total = Number(r.headers.get("content-length") || 0);
      const buf = new Uint8Array(await r.arrayBuffer());
      if (!buf.length) break;
      if (r.status === 200 && off > 0) { off = 0; h.truncate(0); }  // a server that ignored the range sent the lot, start the file again from it
      h.write(buf, { at: off });
      off += buf.length;
      if (off - lastFlush > 32 * 1024 * 1024) { h.flush(); lastFlush = off; }
      const now = Date.now(), speed = (off - t0b) / Math.max(0.5, (now - t0) / 1000);
      postMessage({ type: "progress", off, total, speed });
      if (r.status === 200) break;
    }
    h.flush();
  } finally { h.close(); }
  if (stopFlag) postMessage({ type: "stopped", off });
  else postMessage({ type: "done", off, total });
}

async function text(m) {
  const r = await fetch(m.url, { credentials: "same-origin" });
  if (!r.ok) { postMessage({ type: "text", name: m.name, ok: false }); return; }
  const buf = new TextEncoder().encode(await r.text());
  const fh = await (await dir()).getFileHandle(m.name, { create: true });
  const h = await fh.createSyncAccessHandle();
  try { h.truncate(0); h.write(buf, { at: 0 }); h.flush(); } finally { h.close(); }
  postMessage({ type: "text", name: m.name, ok: true });
}

onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.cmd === "get") await download(m);
    else if (m.cmd === "text") await text(m);
    else if (m.cmd === "stop") stopFlag = true;
  } catch (err) { postMessage({ type: "error", message: String((err && err.message) || err) }); }
};
