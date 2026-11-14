import type { Route } from "./+types/admin.products";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface Product {
  id: number;
  name: string;
  buy_price: number;
  sell_price: number;
  icon: string;
  active: number;
  category_name: string | null;
  category_color: string | null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const result = await env.DB.prepare(
    `SELECT p.id, p.name, p.buy_price, p.sell_price, p.icon, p.active,
            c.name as category_name, c.color as category_color
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.name`
  ).all<Product>();

  return { products: result.results ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "delete") {
    const id = Number(form.get("id"));
    await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  } else if (intent === "toggle") {
    const id = Number(form.get("id"));
    await env.DB.prepare(
      "UPDATE products SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?"
    ).bind(id).run();
  }

  return { ok: true };
}

export default function AdminProducts({ loaderData }: Route.ComponentProps) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2>Položky ({loaderData.products.length})</h2>
        <a href="/admin/products/new" className="btn">+ Nová položka</a>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Název</th>
            <th>Kategorie</th>
            <th>Výkup</th>
            <th>Prodej</th>
            <th>Stav</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.products.map((p) => (
            <tr key={p.id}>
              <td style={{ fontSize: "1.3rem" }}>{p.icon}</td>
              <td>{p.name}</td>
              <td>
                {p.category_name && (
                  <span style={{ color: p.category_color ?? undefined }}>● {p.category_name}</span>
                )}
              </td>
              <td>{p.buy_price} Kč</td>
              <td>{p.sell_price} Kč</td>
              <td>{p.active ? "✅ Aktivní" : "⛔ Skrytý"}</td>
              <td>
                <form method="post" style={{ display: "inline-flex", gap: "0.3rem" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <button name="intent" value="toggle" className="btn-ghost btn" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>
                    {p.active ? "Skrýt" : "Zobrazit"}
                  </button>
                  <button name="intent" value="delete" className="btn-red btn" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    onClick={(e) => { if (!confirm(`Smazat "${p.name}"?`)) e.preventDefault(); }}>
                    Smazat
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
