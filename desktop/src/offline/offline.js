// shows what failed, and retries when the machine says it is back online.
// the main process picks up the ?action= links, see guard() in main.js
const q = new URLSearchParams(location.search);
const host = q.get("host");
const err = q.get("err");
if (host) document.getElementById("detail").textContent = err ? `${host}  ·  ${err}` : host;

window.addEventListener("online", () => {
  location.href = "?action=retry";
});
