const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
const size = b => !Number(b) ? "" : b >= 1048576 ? `${+(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const when = d => d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "";
const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const stars = r => "★".repeat(r) + "☆".repeat(5 - r);
const isGame = i => i.type === "game";
const kind = i => isGame(i) ? "game" : "app";
const dl = i => `/api/download?id=${encodeURIComponent(i.id)}`;
const tile = (i, s) => `<span class="tile" style="--h:${hue(i.name)};--s:${s}px" aria-hidden="true">${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy">` : esc(i.icon || "📱")}</span>`;

let items = [], token = localStorage.getItem("rodlof-admin") || "";
const state = { q: "", type: "all", cat: "" };
const api = (url, opt = {}) => fetch(url, { ...opt, headers: { ...(opt.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
function setAdmin(t) {
  token = t;
  t ? localStorage.setItem("rodlof-admin", t) : localStorage.removeItem("rodlof-admin");
  document.body.classList.toggle("is-admin", !!t);
}
setAdmin(token);
if (token) api("/api/admin").then(r => { if (!r.ok) setAdmin(""); }).catch(() => {});

async function load() {
  try {
    const r = await fetch("/api/list");
    items = await r.json();
    if (!r.ok || !Array.isArray(items)) throw new Error();
  } catch {
    $("#catalog").innerHTML = `<div class="empty"><p>No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.</p><button class="btn" id="retry">Reintentar</button></div>`;
    $("#retry").onclick = load;
    return;
  }
  render();
}

const row = i => `<li class="row" data-kind="${kind(i)}">
  <button class="row-main" data-id="${esc(i.id)}">${tile(i, 56)}<span class="txt"><b>${esc(i.name)}</b><small>${esc(i.developer || "Rodlof Studios")}</small><small>${[i.category, size(i.size), i.reviews ? `★ ${i.rating} (${i.reviews})` : ""].filter(Boolean).map(esc).join(", ")}</small></span></button>
  <a class="get" href="${dl(i)}" download aria-label="Descargar ${esc(i.name)}">Descargar</a></li>`;

const panel = (k, title, sub, list) => list.length ? `<section class="panel" data-kind="${k}"><header><h2>${title}</h2><p class="muted">${sub}</p></header><ul class="rows">${list.map(row).join("")}</ul></section>` : "";

function render() {
  const apps = items.filter(i => !isGame(i)).length, games = items.length - apps;
  $("#count").textContent = items.length ? `${pl(apps, "app", "apps")} y ${pl(games, "juego", "juegos")} disponibles.` : "";

  const n = items[0];
  $("#spotlight").innerHTML = n ? `<div class="spot" data-kind="${kind(n)}"><small>Lo último en subirse</small>
    <div class="spot-top">${tile(n, 96)}<div><h2>${esc(n.name)}</h2><small>${esc(n.developer || "Rodlof Studios")}</small></div></div>
    <p>${esc(n.description || "Sin descripción.")}</p>
    <div class="actions"><a class="btn" href="${dl(n)}" download>Descargar APK</a><button class="btn ghost" data-id="${esc(n.id)}">Ver detalles</button></div></div>`
    : `<div class="spot"><h2>Aún no hay nada publicado</h2><p>Muy pronto habrá apps y juegos aquí.</p><div class="actions"><button class="btn admin-only" data-open="upload">Publicar app</button></div></div>`;

  const byType = items.filter(i => state.type === "all" || state.type === kind(i));
  const cats = [...new Set(byType.map(i => i.category).filter(Boolean))];
  if (!cats.includes(state.cat)) state.cat = "";
  $("#chips").innerHTML = cats.length > 1 ? [["", "Todas"], ...cats.map(c => [c, c])].map(([v, l]) => `<button class="chip" data-cat="${esc(v)}" aria-pressed="${state.cat === v}">${esc(l)}</button>`).join("") : "";

  const q = state.q.toLowerCase();
  const shown = byType.filter(i => (!state.cat || i.category === state.cat) && [i.name, i.category, i.developer].some(f => (f || "").toLowerCase().includes(q)));
  $("#catalog").innerHTML = shown.length
    ? panel("app", "Rodlof Studios Apps", "Productividad, música, social y más", shown.filter(i => !isGame(i))) + panel("game", "Rodlof Game Studio", "Acción, aventura y entretenimiento", shown.filter(isGame))
    : `<div class="empty"><p>${items.length ? `Nada coincide con «${esc(state.q)}». Prueba con otro nombre o categoría.` : "Todavía no hay apps ni juegos."}</p></div>`;
  $("#status").textContent = pl(shown.length, "resultado", "resultados");
}

function detail(id) {
  const i = items.find(x => x.id === id);
  if (!i) return;
  $("#detailBody").innerHTML = `<div style="display:grid;gap:1rem" data-kind="${kind(i)}">
    <div class="d-head">${tile(i, 88)}<div><h2>${esc(i.name)}</h2><p class="muted">${esc(i.developer || "Rodlof Studios")}</p>${i.reviews ? `<p class="rate">★ ${i.rating} <small class="muted">(${pl(i.reviews, "reseña", "reseñas")})</small></p>` : ""}</div></div>
    <a class="btn" href="${dl(i)}" download>Descargar APK</a>
    <dl class="facts"><div><dt>Tamaño</dt><dd>${size(i.size) || "—"}</dd></div><div><dt>Categoría</dt><dd>${esc(i.category || "—")}</dd></div><div><dt>Subida</dt><dd>${when(i.uploadedAt) || "—"}</dd></div></dl>
    <p>${esc(i.description || "Sin descripción.")}</p>
    <p class="note">Al abrir el APK, Android puede pedirte permiso para instalar apps desde este navegador.</p>
    <h3>Reseñas</h3>
    <form id="reviewForm" data-app="${esc(i.id)}">
      <div class="stars" role="radiogroup" aria-label="Tu calificación">${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" value="${n}" id="st${n}" required><label for="st${n}" aria-label="${pl(n, "estrella", "estrellas")}">★</label>`).join("")}</div>
      <input name="name" placeholder="Tu nombre (opcional)" maxlength="40" aria-label="Tu nombre">
      <textarea name="comment" rows="2" placeholder="Cuéntanos qué te pareció" maxlength="1000" aria-label="Tu comentario"></textarea>
      <button class="btn">Publicar reseña</button>
    </form>
    <ul class="reviews" id="reviews"><li class="muted">Cargando reseñas…</li></ul>
    <button class="link danger admin-only" data-del-app="${esc(i.id)}">Eliminar esta app</button></div>`;
  $("#detail").showModal();
  loadReviews(id);
}

async function loadReviews(id) {
  const ul = $("#reviews");
  try {
    const r = await (await fetch(`/api/reviews?id=${encodeURIComponent(id)}`)).json();
    ul.innerHTML = r.length ? r.map(v => `<li><div><b>${esc(v.name)}</b> <span class="rate">${stars(v.rating)}</span> <small class="muted">${when(v.createdAt)}</small></div>${v.comment ? `<p>${esc(v.comment)}</p>` : ""}<button class="link danger admin-only" data-del-review="${esc(v.id)}">Eliminar reseña</button></li>`).join("") : `<li class="muted">Aún no hay reseñas. Sé la primera persona en opinar.</li>`;
  } catch { ul.innerHTML = `<li class="muted">No se pudieron cargar las reseñas.</li>`; }
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  setTimeout(() => t.classList.remove("on"), 3500);
}

async function remove(url, done) {
  if (!confirm("¿Eliminar? Esta acción no se puede deshacer.")) return;
  const r = await api(url, { method: "DELETE" });
  if (!r.ok) return toast("No se pudo eliminar. Vuelve a iniciar sesión como administrador.");
  done();
}

document.addEventListener("click", e => {
  const t = e.target, c = s => t.closest(s);
  if (c("[data-id]")) detail(c("[data-id]").dataset.id);
  else if (c("[data-open]")) $("#" + c("[data-open]").dataset.open).showModal();
  else if (c("[data-close]")) c("dialog").close();
  else if (c("[data-logout]")) { setAdmin(""); toast("Sesión de administrador cerrada"); }
  else if (c("[data-del-app]")) remove(`/api/apps?id=${encodeURIComponent(c("[data-del-app]").dataset.delApp)}`, () => { $("#detail").close(); toast("App eliminada"); load(); });
  else if (c("[data-del-review]")) remove(`/api/reviews?id=${encodeURIComponent(c("[data-del-review]").dataset.delReview)}`, () => { toast("Reseña eliminada"); loadReviews($("#reviewForm").dataset.app); load(); });
  else if (t.matches("dialog")) t.close();
  else if (c("[data-type]")) {
    state.type = c("[data-type]").dataset.type;
    document.querySelectorAll("[data-type]").forEach(b => b.setAttribute("aria-pressed", b.dataset.type === state.type));
    render();
  } else if (c("[data-cat]")) { state.cat = c("[data-cat]").dataset.cat; render(); }
});

$("#q").addEventListener("input", e => { state.q = e.target.value; render(); });

document.addEventListener("submit", async e => {
  const f = e.target;
  if (f.id === "reviewForm") {
    e.preventDefault();
    const b = f.querySelector(".btn");
    b.disabled = true;
    try {
      const r = await fetch("/api/reviews", { method: "POST", body: JSON.stringify({ appId: f.dataset.app, name: f.name.value, rating: f.rating.value, comment: f.comment.value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      f.reset();
      toast("Gracias por tu reseña");
      loadReviews(f.dataset.app);
      load();
    } catch (er) { toast(er.message || "No se pudo publicar la reseña."); }
    finally { b.disabled = false; }
  } else if (f.id === "adminForm") {
    e.preventDefault();
    const t = f.token.value.trim();
    const r = await fetch("/api/admin", { headers: { authorization: `Bearer ${t}` } });
    if (r.ok) { setAdmin(t); f.reset(); $("#adminStatus").textContent = ""; $("#admin").close(); toast("Sesión de administrador iniciada"); }
    else $("#adminStatus").textContent = "Clave incorrecta. Revísala e inténtalo de nuevo.";
  } else if (f.id === "uploadForm") {
    e.preventDefault();
    const status = $("#uploadStatus"), btn = $("#submitBtn");
    btn.disabled = true;
    status.textContent = "Publicando…";
    try {
      const meta = Object.fromEntries([...new FormData(f)].filter(([, v]) => typeof v === "string"));
      const r = await api("/api/apps", { method: "POST", body: JSON.stringify(meta) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "revisa tu sesión de administrador.");
      const name = f.name.value;
      f.reset();
      status.textContent = "";
      $("#upload").close();
      toast(`«${name}» ya está en la tienda`);
      load();
    } catch (er) { status.textContent = `No se pudo publicar: ${er.message}`; }
    finally { btn.disabled = false; }
  }
});

document.querySelectorAll("input[name=type]").forEach(r => r.addEventListener("change", () => { $("#submitBtn").dataset.kind = r.value; }));

load()
