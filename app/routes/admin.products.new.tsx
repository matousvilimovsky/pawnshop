import type { Route } from "./+types/admin.products.new";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface Category {
  id: number;
  name: string;
  color: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const result = await env.DB.prepare(
    "SELECT id, name, color FROM categories ORDER BY sort_order"
  ).all<Category>();

  return { categories: result.results ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const categoryId = form.get("category_id") ? Number(form.get("category_id")) : null;
  const buyPrice = Number(form.get("buy_price") ?? 0);
  const sellPrice = Number(form.get("sell_price") ?? 0);
  const icon = String(form.get("icon") ?? "📦").trim() || "📦";

  if (!name) {
    return Response.json({ error: "Název je povinný." }, { status: 400 });
  }

  await env.DB.prepare(
    "INSERT INTO products (name, category_id, buy_price, sell_price, icon) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(name, categoryId, buyPrice, sellPrice, icon)
    .run();

  throw new Response(null, { status: 302, headers: { Location: "/admin/products" } });
}

export default function NewProduct({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <div className="card" style={{ maxWidth: 500 }}>
      <h2>Nová položka</h2>
      {actionData?.error && (
        <div style={{ color: "var(--red)", marginBottom: "1rem" }}>{actionData.error}</div>
      )}
      <form method="post">
        <div className="form-field">
          <label>Název</label>
          <input name="name" required autoFocus />
        </div>
        <div className="form-field">
          <label>Ikona (emoji)</label>
          <input name="icon" placeholder="📦" />
        </div>
        <div className="form-field">
          <label>Kategorie</label>
          <select name="category_id">
            <option value="">— bez kategorie —</option>
            {loaderData.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Cena výkup (Kč)</label>
            <input name="buy_price" type="number" min="0" step="1" defaultValue={0} />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Cena prodej (Kč)</label>
            <input name="sell_price" type="number" min="0" step="1" defaultValue={0} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="submit" className="btn btn-green">Vytvořit</button>
          <a href="/admin/products" className="btn btn-ghost">Zrušit</a>
        </div>
      </form>
    </div>
  );
}
