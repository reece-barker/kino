/* The public Kino Wrapped page: fetches the shared snapshot by its code and shows it */
(function () {
  const root = document.getElementById("kwRoot"), code = document.body.dataset.code;
  const bad = (m) => { root.innerHTML = `<div class="kw"><div class="kw-empty">${m}</div></div>`; };
  if (!code) return bad("This link isn't active.");
  fetch(`/w/${code}.json`, { credentials: "omit" }).then((r) => { if (!r.ok) throw new Error("gone"); return r.json(); })
    .then((d) => KinoWrapped.mount(root, d, { img: (t, i) => `/w/${code}/img/${i}`, tv: false }))
    .catch(() => bad("This link isn't active any more."));
})();
