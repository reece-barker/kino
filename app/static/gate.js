// The page a device sees when its not on an allowed network and the admin hasnt approved it yet
(() => {
  // On a TV (the app, or ?tv=1 to try it) the page uses the TV sizes: bigger text, 5 percent away from the edges, nothing running off the screen
  if (/KinoTV/.test(navigator.userAgent) || /[?&]tv=1/.test(location.search)) document.body.classList.add("tv");
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

  // Tabs: sign in, or ask for an account
  const tab = (up) => {
    $("#paneIn").hidden = up; $("#paneUp").hidden = !up;
    $("#tabIn").setAttribute("aria-selected", String(!up)); $("#tabUp").setAttribute("aria-selected", String(up));
  };
  $("#tabIn").onclick = () => tab(false);
  $("#tabUp").onclick = () => tab(true);
  if (location.hash === "#signup") tab(true);

  // A rough strength hint while typing (the server does the real checks, including leaked password lists)
  const meter = () => {
    const pw = $("#upPw").value, el = $("#pwMeter");
    if (!pw) { el.textContent = ""; return; }
    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
    const score = (pw.length >= 14 ? 2 : pw.length >= 10 ? 1 : 0) + (kinds >= 3 ? 1 : 0) + (new Set(pw).size >= 8 ? 1 : 0);
    el.textContent = pw.length < 10 ? "Too short, use at least 10 characters" : score >= 3 ? "Strong" : score === 2 ? "Okay, a longer one is better" : "Weak, try a few words together";
    el.dataset.s = pw.length < 10 ? "0" : String(score);
  };
  $("#upPw").addEventListener("input", meter);
  let upEmail = "";
  $("#upFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = $("#upMsg"), b = e.target.querySelector("button[type=submit]");
    if ($("#upPw").value !== $("#upPw2").value) { m.textContent = "The two passwords don't match"; return; }
    b.disabled = true; m.textContent = ""; const was = b.textContent; b.textContent = "Checking and sending...";
    const r = await fetch("/api/account/signup", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ name: $("#upName").value, email: $("#upEmail").value, password: $("#upPw").value, website: $("#upWebsite").value }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    b.disabled = false; b.textContent = was;
    if (!r || !r.ok) { m.textContent = r ? j.detail || "That didn't work, try again" : "Couldn't reach Kino, check your connection."; return; }
    upEmail = $("#upEmail").value.trim().toLowerCase();
    $("#upTo").textContent = upEmail; $("#upForm").hidden = true; $("#upCode").hidden = false; $("#upCodeIn").focus();
  });
  $("#codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = $("#codeMsg"), b = e.target.querySelector("button");
    b.disabled = true; m.textContent = "";
    const r = await fetch("/api/account/signup/verify", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ email: upEmail, code: $("#upCodeIn").value }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    b.disabled = false;
    if (r && r.ok) { $("#upCode").hidden = true; $("#upWait").hidden = false; return; }
    m.textContent = r ? j.detail || "That code isn't right" : "Couldn't reach Kino, check your connection.";
  });
  $("#resendBtn").addEventListener("click", async () => {
    await fetch("/api/account/signup/resend", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ email: upEmail }) }).catch(() => null);
    $("#codeMsg").textContent = "If that email is waiting for a code, a new one is on its way (you can ask once a minute).";
  });

  check();
  // Keeps checking so it opens straight away when the admin approves it
  setInterval(check, 8000);
})();
