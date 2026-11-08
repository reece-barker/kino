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

  // Signing in with an account: any device, any network
  $("#signForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button"), m = $("#signMsg");
    b.disabled = true; m.textContent = "";
    const r = await fetch("/api/account/login", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ email: $("#gateEmail").value, password: $("#gatePw").value }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) { location.replace("/"); return; }
    m.textContent = r ? j.detail || "That didn't work, try again" : "Couldn't reach Kino, check your connection.";
    b.disabled = false;
  });
  $("#forgotBtn").addEventListener("click", async () => {
    const m = $("#signMsg"), em = $("#gateEmail").value.trim();
    if (!em) { m.textContent = "Type your email above first, then tap Forgot your password."; $("#gateEmail").focus(); return; }
    const r = await fetch("/api/account/forgot", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ email: em }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    m.textContent = r && r.ok ? "If that email has an account, a link to choose a new password is on its way." : (j.detail || "Couldn't send that, try again in a minute.");
  });

  check();
  // Keeps checking so it opens straight away when the admin approves it
  setInterval(check, 8000);
})();
