// Kino service worker, only there so the app can be installed and opens fast
// It caches the app shell, never api calls, images from the api or videos
const CACHE = "kino-__V__";
const SHELL = ["/", "/static/app.css?v=__V__", "/static/sizing.css?v=__V__", "/static/app.js?v=__V__", "/static/hls.min.js", "/static/icon.svg", "/static/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // Old versions get thrown away so a new deploy shows up straight away
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // Always tries the network first so a new version loads, the cache is only for when the vps is unreachable
    e.respondWith(fetch(e.request).catch(() => caches.match("/")));
    return;
  }
  if (url.pathname.startsWith("/static/")) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
  }
});
