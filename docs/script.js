const SUPABASE_URL = "https://jcridgjfjwoftazeufnv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Dm89cGEW_Xw0UjIbszBMOQ_MOWS39WP";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allItems = [];
let isAdmin = localStorage.getItem("rodlof-admin") === "true";

function updateAdminUI() {
  const uploadSection = document.getElementById("upload");
  const adminBtn = document.getElementById("adminBtn");
  if (!uploadSection || !adminBtn) return;
  if (isAdmin) {
    uploadSection.style.display = "block";
    adminBtn.textContent = "Salir Admin";
    adminBtn.style.color = "#ea4335";
  } else {
    uploadSection.style.display = "none";
    adminBtn.textContent = "Admin";
    adminBtn.style.color = "#f59e0b";
  }
}

function init() {
  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) {
    adminBtn.onclick = function(e) {
      e.preventDefault();
      if (isAdmin) {
        isAdmin = false;
        localStorage.removeItem("rodlof-admin");
        alert("Sesión de admin cerrada");
        updateAdminUI();
        if (typeof renderAll === 'function') renderAll();
      } else {
        const pass = window.prompt("Clave de administrador:");
        if (pass === "rodlof2026") {
          isAdmin = true;
          localStorage.setItem("rodlof-admin", "true");
          alert("Modo Admin activado");
          updateAdminUI();
          if (typeof renderAll === 'function') renderAll();
        } else if (pass !== null && pass !== "") {
          alert("Clave incorrecta");
        }
      }
    };
  }
  if (typeof loadApps === 'function') loadApps();
  updateAdminUI();
}

async function loadApps() {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    const grid = document.getElementById("appsGrid");
    if (grid) grid.innerHTML = "<p style='color:#64748b'>Error al cargar apps</p>";
    return;
  }

  allItems = data || [];
  renderAll();
}

function renderItems(items, containerId, isGame = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<p style="color:#64748b;grid-column:1/-1">Aún no hay ${isGame ? "juegos" : "aplicaciones"}.</p>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="app-card ${isGame ? "game-card" : ""}" onclick="showDetails('${item.id}')">
      <div class="app-icon">
        ${item.icon_url ? `<img src="${item.icon_url}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">` : (item.icon || (isGame ? "🎮" : "📱"))}
      </div>
      <h3>${item.name}</h3>
      <div class="meta">${item.developer || "Rodlof Studios"} · ${item.category || ""} · ${item.price > 0 ? item.price + " " + (item.currency || "USD") : "Gratis"}</div>
      <button class="btn ${isGame ? "red" : "primary"}" onclick="event.stopPropagation(); showDetails('${item.id}')">Ver detalles</button>
    </div>
  `).join("");
}

function renderAll() {
  const search = document.getElementById("searchInput");
  const query = search ? search.value.toLowerCase() : "";
  const filtered = allItems.filter(i => i.name.toLowerCase().includes(query) || (i.category || "").toLowerCase().includes(query));
  const apps = filtered.filter(i => i.type !== "game");
  const games = filtered.filter(i => i.type === "game");
  renderItems(apps, "appsGrid", false);
  renderItems(games, "gamesGrid", true);
}

async function showDetails(id) {
  const item = allItems.find(a => a.id === id);
  if (!item) return;
  const isGame = item.type === "game";

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("app_id", id)
    .order("created_at", { ascending: false });

  const avg = reviews && reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  document.getElementById("modalBody").innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem">
      <div class="app-icon" style="width:90px;height:90px;font-size:2.5rem;margin:0 auto 1rem">
        ${item.icon_url ? `<img src="${item.icon_url}" style="width:100%;height:100%;object-fit:cover;border-radius:16px">` : (item.icon || "📱")}
      </div>
      <h2>${item.name}</h2>
      <p style="color:#64748b">${item.developer || "Rodlof Studios"} · ${item.category || ""} · <strong>${item.price > 0 ? item.price + " " + (item.currency || "USD") : "Gratis"}</strong></p>
      <p style="margin-top:0.5rem">★ ${avg} (${reviews ? reviews.length : 0} reseñas)</p>
    </div>
    <p style="margin-bottom:1.5rem">${item.description || "Sin descripción"}</p>
    <a href="${item.apk_url}" class="btn ${isGame ? "red" : "primary"}" style="width:100%;margin-bottom:1rem" download>Descargar APK</a>
    ${isAdmin ? `<button class="btn" style="background:#ea4335;width:100%;margin-bottom:1rem" onclick="deleteApp('${item.id}')">Eliminar app (Admin)</button>` : ""}

    <h3 style="margin:1.5rem 0 0.75rem">Reseñas</h3>
    <div id="reviews-list">${(reviews || []).map(r => `
      <div style="border-bottom:1px solid #e2e8f0;padding:0.75rem 0">
        <strong>${r.author}</strong> ★ ${r.rating}<br>
        <span style="color:#64748b;font-size:0.9rem">${r.comment || ""}</span>
      </div>
    `).join("") || "<p style='color:#64748b'>Aún no hay reseñas</p>"}</div>

    <form id="reviewForm" style="margin-top:1rem">
      <input type="text" id="reviewAuthor" placeholder="Tu nombre" required style="margin-bottom:0.5rem">
      <select id="reviewRating" style="margin-bottom:0.5rem">
        <option value="5">★★★★★ 5</option>
        <option value="4">★★★★ 4</option>
        <option value="3">★★★ 3</option>
        <option value="2">★★ 2</option>
        <option value="1">★ 1</option>
      </select>
      <textarea id="reviewComment" placeholder="Tu comentario" rows="2" style="margin-bottom:0.5rem"></textarea>
      <button type="submit" class="btn primary" style="width:100%">Publicar reseña</button>
    </form>
  `;

  document.getElementById("reviewForm").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("reviews").insert({
      app_id: id,
      author: document.getElementById("reviewAuthor").value,
      rating: parseInt(document.getElementById("reviewRating").value),
      comment: document.getElementById("reviewComment").value
    });
    if (error) alert("Error al publicar reseña");
    else showDetails(id);
  };

  document.getElementById("modal").classList.add("show");
}

async function deleteApp(id) {
  if (!confirm("¿Eliminar esta app?")) return;
  const item = allItems.find(a => a.id === id);
  if (item) {
    if (item.apk_url) {
      const apkPath = item.apk_url.split("/apps/")[1];
      if (apkPath) await supabase.storage.from("apps").remove([apkPath]);
    }
    if (item.icon_url) {
      const iconPath = item.icon_url.split("/apps/")[1];
      if (iconPath) await supabase.storage.from("apps").remove([iconPath]);
    }
  }
  await supabase.from("apps").delete().eq("id", id);
  document.getElementById("modal").classList.remove("show");
  loadApps();
}

document.getElementById("uploadForm").onsubmit = async (e) => {
  e.preventDefault();
  const status = document.getElementById("uploadStatus");
  status.textContent = "Subiendo...";
  status.style.color = "#1a73e8";

  const form = e.target;
  const name = form.name.value.trim();
  const type = form.type.value;
  const developer = form.developer.value.trim();
  const category = form.category.value.trim();
  const description = form.description.value.trim();
  const iconEmoji = form.icon.value.trim();
  const price = parseFloat(form.price.value) || 0;
  const currency = form.currency.value.trim() || "USD";
  const apkFile = form.apk.files[0];
  const iconFile = form.iconFile.files[0];

  if (!apkFile) return;

  if (apkFile.size > 50 * 1024 * 1024) {
    status.textContent = "Error: El APK supera los 50 MB";
    status.style.color = "#ea4335";
    return;
  }

  try {
    const apkName = `${Date.now()}_${apkFile.name}`;
    const { error: apkError } = await supabase.storage.from("apps").upload(apkName, apkFile, {
      contentType: "application/vnd.android.package-archive"
    });
    if (apkError) throw apkError;

    const { data: apkUrlData } = supabase.storage.from("apps").getPublicUrl(apkName);
    const apk_url = apkUrlData.publicUrl;

    let icon_url = null;
    if (iconFile) {
      const iconName = `${Date.now()}_icon_${iconFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: iconError } = await supabase.storage.from("apps").upload(iconName, iconFile, {
        contentType: iconFile.type || "image/png",
        upsert: true
      });
      if (!iconError) {
        const { data: iconUrlData } = supabase.storage.from("apps").getPublicUrl(iconName);
        icon_url = iconUrlData.publicUrl;
      }
    }

    const { error: dbError } = await supabase.from("apps").insert({
      name, type, developer, category, description, icon: iconEmoji, icon_url, apk_url, price, currency
    });

    if (dbError) throw dbError;

    status.textContent = "¡App subida correctamente!";
    status.style.color = "#34a853";
    form.reset();
    loadApps();
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + (err.message || "No se pudo subir");
    status.style.color = "#ea4335";
  }
};

document.getElementById("searchInput").oninput = renderAll;
const closeBtn = document.querySelector(".close");
if (closeBtn) closeBtn.onclick = () => document.getElementById("modal").classList.remove("show");
document.getElementById("modal").onclick = (e) => {
  if (e.target.id === "modal") document.getElementById("modal").classList.remove("show");
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
