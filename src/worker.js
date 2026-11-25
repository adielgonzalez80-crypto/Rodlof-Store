const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const err = (m, s = 400) => J({ error: m }, s);
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const same = (a, b) => { if (!a || !b || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const isAdmin = (req, env) => same((req.headers.get("authorization") || "").replace(/^Bearer /, ""), env.ADMIN_TOKEN || "");
const url = v => { try { const u = new URL(String(v || "").trim()); return u.protocol === "https:" ? u.href.slice(0, 1000) : null; } catch { return null; } };
const ADMIN_ROUTES = ["POST /api/apps", "DELETE /api/apps", "DELETE /api/reviews"];

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname, m = req.method, id = clip(u.searchParams.get("id"), 64), db = env.DB;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      if (p === "/api/admin") return isAdmin(req, env) ? J({ ok: true }) : err("Clave incorrecta", 401);

      if (p === "/api/list" && m === "GET") {
        const { results } = await db.prepare(`SELECT a.*,
          (SELECT ROUND(AVG(rating),1) FROM reviews WHERE app_id=a.id) rating,
          (SELECT COUNT(*) FROM reviews WHERE app_id=a.id) reviews
          FROM apps a WHERE apk_url IS NOT NULL ORDER BY uploaded_at DESC`).all();
        return J(results.map(a => ({ id: a.id, name: a.name, developer: a.developer, category: a.category, description: a.description, type: a.type, icon: a.icon, image: a.image_url, size: a.size, uploadedAt: a.uploaded_at, rating: a.rating, reviews: a.reviews })));
      }
      if (p === "/api/download" && m === "GET") {
        const a = await db.prepare("SELECT apk_url FROM apps WHERE id=?").bind(id).first();
        if (!a?.apk_url) return err("App no encontrada", 404);
        return Response.redirect(a.apk_url, 302);
      }
      if (p === "/api/reviews" && m === "GET") {
        const { results } = await db.prepare("SELECT id,name,rating,comment,created_at createdAt FROM reviews WHERE app_id=? ORDER BY created_at DESC LIMIT 100").bind(id).all();
        return J(results);
      }
      if (p === "/api/reviews" && m === "POST") {
        const b = await req.json(), rating = Math.round(+b.rating), appId = clip(b.appId, 64);
        if (!(rating >= 1 && rating <= 5)) return err("Elige de 1 a 5 estrellas.");
        if (!(await db.prepare("SELECT 1 FROM apps WHERE id=?").bind(appId).first())) return err("App no encontrada", 404);
        await db.prepare("INSERT INTO reviews VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), appId, clip(b.name, 40) || "Anónimo", rating, clip(b.comment, 1000), new Date().toISOString()).run();
        return J({ success: true });
      }

      if (!ADMIN_ROUTES.includes(`${m} ${p}`)) return err("No encontrado", 404);
      if (!isAdmin(req, env)) return err("Solo el administrador puede hacer esto.", 401);

      if (p === "/api/apps" && m === "POST") {
        const b = await req.json(), name = clip(b.name, 80), apk = url(b.apkUrl);
        if (!name) return err("Falta el nombre de la app.");
        if (!apk) return err("El enlace del APK debe empezar con https://");
        const img = b.imageUrl ? url(b.imageUrl) : null;
        if (b.imageUrl && !img) return err("El enlace de la imagen debe empezar con https://");
        const nid = crypto.randomUUID(), size = Math.round(+b.sizeMb * 1048576) || null;
        await db.prepare("INSERT INTO apps(id,name,developer,category,description,type,icon,image_url,apk_url,size,uploaded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
          .bind(nid, name, clip(b.developer, 60) || "Rodlof Studios", clip(b.category, 40), clip(b.description, 2000), b.type === "game" ? "game" : "app", clip(b.icon, 8) || "📱", img, apk, size, new Date().toISOString()).run();
        return J({ success: true, id: nid });
      }
      if (p === "/api/apps" && m === "DELETE") {
        await db.batch([db.prepare("DELETE FROM reviews WHERE app_id=?").bind(id), db.prepare("DELETE FROM apps WHERE id=?").bind(id)]);
        return J({ success: true });
      }
      if (p === "/api/reviews" && m === "DELETE") {
        await db.prepare("DELETE FROM reviews WHERE id=?").bind(id).run();
        return J({ success: true });
      }
      return err("No encontrado", 404);
    } catch (e) {
      return err(e.message || "Error del servidor", 500);
    }
  }
};
