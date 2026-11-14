import type { Route } from "./+types/admin.categories";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface Category {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  product_count: number;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const result = await env.DB.prepare(
    `SELECT c.id, c.name, c.color, c.sort_order,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count
     FROM categories c ORDER BY c.sort_order`
  ).all<Category>();

  return { categories: result.results ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "create") {
    const name = String(form.get("name") ?? "").trim();
    const color = String(form.get("color") ?? "#6b7280").trim();
    const sortOrder = Number(form.get("sort_order") ?? 0);
    if (name) {
      await env.DB.prepare(
        "INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)"
      ).bind(name, color, sortOrder).run();
    }
  } else if (intent === "delete") {
    const id = Number(form.get("id"));
    await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  }

  return { ok: true };
}

export default function AdminCategories({ loaderData }: Route.ComponentProps) {
  return (
    <div className="card">
      <h2>Kategorie</h2>
      <form method="post" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input type="hidden" name="intent" value="create" />
        <input name="name" placeholder="Název kategorie" required style={{ flex: "1 1 180px" }} className="search-box" />
        <input name="color" type="color" defaultValue="#3b82f6" style={{ width: 48, height: 40, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)" }} />
        <input name="sort_order" type="number" defaultValue={0} placeholder="Pořadí" style={{ width: 80 }} className="search-box" />
        <button type="submit" className="btn btn-green">+ Přidat</button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Barva</th>
            <th>Název</th>
            <th>Pořadí</th>
            <th>Položek</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.categories.map((c) => (
            <tr key={c.id}>
              <td><span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: c.color }} /></td>
              <td>{c.name}</td>
              <td>{c.sort_order}</td>
              <td>{c.product_count}</td>
              <td>
                <form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn-red btn" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    onClick={(e) => { if (!confirm(`Smazat kategorii "${c.name}"?`)) e.preventDefault(); }}>
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
