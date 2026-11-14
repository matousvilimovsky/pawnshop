import type { Route } from "./+types/admin.users";
import { requireAdmin, hashPassword } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
  created_at: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const result = await env.DB.prepare(
    "SELECT id, username, role, display_name, created_at FROM users ORDER BY id"
  ).all<User>();

  return { users: result.results ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "create") {
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const role = String(form.get("role") ?? "seller");
    const displayName = String(form.get("display_name") ?? "").trim();

    if (!username || !password) {
      return Response.json({ error: "Jméno a heslo jsou povinné." }, { status: 400 });
    }

    const hash = await hashPassword(password);
    try {
      await env.DB.prepare(
        "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
      ).bind(username, hash, role, displayName).run();
    } catch {
      return Response.json({ error: "Uživatelské jméno již existuje." }, { status: 400 });
    }
  } else if (intent === "delete") {
    const id = Number(form.get("id"));
    if (id === 1) {
      return Response.json({ error: "Hlavní admin nelze smazat." }, { status: 400 });
    }
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  }

  return { ok: true };
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  return (
    <div className="card">
      <h2>Uživatelé ({loaderData.users.length})</h2>
      <form method="post" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input type="hidden" name="intent" value="create" />
        <input name="username" placeholder="Uživatelské jméno" required className="search-box" style={{ flex: "1 1 150px" }} />
        <input name="display_name" placeholder="Zobrazované jméno" className="search-box" style={{ flex: "1 1 150px" }} />
        <input name="password" type="password" placeholder="Heslo" required className="search-box" style={{ flex: "1 1 120px" }} />
        <select name="role" className="search-box" style={{ width: 120 }}>
          <option value="seller">Prodavač</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn btn-green">+ Vytvořit</button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Jméno</th>
            <th>Zobrazované jméno</th>
            <th>Role</th>
            <th>Vytvořeno</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.display_name || "—"}</td>
              <td>{u.role === "admin" ? "👑 Admin" : "🧑 Prodavač"}</td>
              <td>{u.created_at}</td>
              <td>
                {u.id !== 1 && (
                  <form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="btn-red btn" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                      onClick={(e) => { if (!confirm(`Smazat uživatele "${u.username}"?`)) e.preventDefault(); }}>
                      Smazat
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
