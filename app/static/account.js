// The pages that open from an email: creating an account from an invite, and choosing a new password
(() => {
  // On a TV (the app, or ?tv=1 to try it) the page uses the TV sizes: bigger text, 5 percent away from the edges, nothing running off the screen
  if (/KinoTV/.test(navigator.userAgent) || /[?&]tv=1/.test(location.search)) document.body.classList.add("tv");
  const g = document.getElementById("gate"), mode = g.dataset.mode, token = g.dataset.token, extra = g.dataset.extra, box = document.getElementById("acBox");
  const H = { "X-Kino": "1", "Content-Type": "application/json" };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const field = (id, label, type, extra2 = "") => `<label class="ac-field"><span>${label}</span><input id="${id}" type="${type}" ${extra2} required></label>`;
  const post = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || (r.status === 429 ? "Too many tries in a short time, wait a minute and try again" : `That didn't work (error ${r.status}), try again`));
    return j;
  };
  const form = (title, intro, fields, button, onSubmit) => {
    box.innerHTML = `<h1>${title}</h1><p class="secondary">${intro}</p><form id="acForm" class="gate-form ac-form">${fields}<button class="btn primary" type="submit">${button}</button></form><p class="note" id="acMsg"></p>`;
    document.getElementById("acForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button"), m = document.getElementById("acMsg");
      b.disabled = true; m.textContent = "";
      try { await onSubmit(); } catch (err) { m.textContent = err.message; b.disabled = false; }
    });
    const f = box.querySelector("input:not([readonly])"); if (f) f.focus();
  };
  const match = () => { if (document.getElementById("acPw").value !== document.getElementById("acPw2").value) throw new Error("The two passwords don't match"); };
  if (mode === "join") {
    form("Create Your Account", `You're invited with <b>${esc(extra)}</b>. Choose a name and a password, then you can sign in on any device with this email and password.`,
      field("acName", "Your name", "text", 'maxlength="40" autocomplete="given-name"') + field("acPw", "Password (at least 10 characters)", "password", 'minlength="10" autocomplete="new-password"') + field("acPw2", "Same password again", "password", 'autocomplete="new-password"'),
      "Create Account", async () => { match(); await post("/api/account/join", { token, name: document.getElementById("acName").value, password: document.getElementById("acPw").value }); location.replace("/"); });
  } else if (mode === "reset") {
    form("Choose a New Password", "You'll be signed out of your other devices.", field("acPw", "New password (at least 10 characters)", "password", 'minlength="10" autocomplete="new-password"') + field("acPw2", "Same password again", "password", 'autocomplete="new-password"'),
      "Save Password", async () => { match(); await post("/api/account/reset", { token, password: document.getElementById("acPw").value }); location.replace("/"); });
  } else if (mode === "approve") {
    const [who, em] = extra.split("|"), pre = new URLSearchParams(location.search).get("a") === "deny" ? "deny" : "approve";
    box.innerHTML = `<h1>${pre === "deny" ? "Deny" : "Approve"} ${esc(who)}?</h1><p class="secondary"><b>${esc(who)}</b> (${esc(em)}) confirmed their email and wants to get into Kino. Only approve people you know.</p>
      <div class="ac-form"><button class="btn primary" id="acYes">Approve</button><button class="btn secondary" id="acNo">Deny</button></div><p class="note" id="acMsg"></p>`;
    const act = async (action) => {
      document.querySelectorAll("#acYes, #acNo").forEach((b) => (b.disabled = true));
      try { const r = await post("/api/account/decision", { token, action }); box.innerHTML = `<h1>${r.already ? "Already Done" : r.status === "approved" ? "Approved" : "Denied"}</h1><p class="secondary">${r.already ? `${esc(who)} was already ${esc(r.status)}.` : r.status === "approved" ? `${esc(who)} has been told and can sign in now.` : `${esc(who)} has been told.`}</p>`; }
      catch (err) { document.getElementById("acMsg").textContent = err.message; document.querySelectorAll("#acYes, #acNo").forEach((b) => (b.disabled = false)); }
    };
    document.getElementById("acYes").onclick = () => act("approve");
    document.getElementById("acNo").onclick = () => act("deny");
    document.getElementById(pre === "deny" ? "acNo" : "acYes").focus();
  } else if (mode === "decided") {
    const [who, st] = extra.split("|");
    box.innerHTML = `<h1>Already Done</h1><p class="secondary">${esc(who)} was already ${esc(st === "approved" ? "approved" : st)}.</p>`;
  } else {
    box.innerHTML = `<h1>This Link Has Expired</h1><p class="secondary">It may have been used already or it ran out. Ask for a new invite, or use Forgot Password on the sign in page.</p><a class="btn primary" href="/gate">Go to Sign In</a>`;
  }
})();
