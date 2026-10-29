// The page a device sees when its not on an allowed network and the admin hasnt approved it yet
(() => {
  const $ = (s) => document.querySelector(s);
  const H = { "X-Kino": "1", "Content-Type": "application/json" };
  const msg = (t) => ($("#gateMsg").textContent = t);

  async function check() {
    const r = await fetch("/api/gate/status", { credentials: "same-origin" }).then((x) => x.json()).catch(() => null);
    if (!r) return msg("Couldn't reach Kino, check your connection.");
    if (r.allowed) { location.replace("/"); return; }
    $("#gateCode").textContent = r.code || "···-···";
    if (r.status === "pending") {
      $("#gateForm").hidden = true;
      msg(`Waiting for the admin to approve ${r.name ? `"${r.name}"` : "this device"}. This page opens Kino by itself once they do.`);
    } else if (r.status === "denied") {
      $("#gateForm").hidden = true;
      msg("The admin said no to this device.");
    }
  }

  $("#gateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await fetch("/api/gate/request", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ name: $("#gateName").value }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return msg(j.detail || "That didn't work, try again in a minute.");
    check();
  });

  check();
  // Keeps checking so it opens straight away when the admin approves it
  setInterval(check, 8000);
})();
