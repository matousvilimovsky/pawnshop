import type { Route } from "./+types/admin.transactions";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface Transaction {
  id: number;
  type: string;
  seller_name: string;
  total: number;
  created_at: string;
  username: string | null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const result = await env.DB.prepare(
    `SELECT t.id, t.type, t.seller_name, t.total, t.created_at, u.username
     FROM transactions t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC
     LIMIT 200`
  ).all<Transaction>();

  return { transactions: result.results ?? [] };
}

const typeLabel = (t: string) =>
  t === "buy" ? "Výkup" : t === "sell" ? "Prodej" : "Vývoz";

const typeColor = (t: string) =>
  t === "buy" ? "var(--green)" : t === "sell" ? "var(--accent)" : "var(--yellow)";

export default function AdminTransactions({ loaderData }: Route.ComponentProps) {
  return (
    <div className="card">
      <h2>Transakce ({loaderData.transactions.length})</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Typ</th>
            <th>Prodávající</th>
            <th>Prodavač</th>
            <th>Celkem</th>
            <th>Datum</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.transactions.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-dim)" }}>Zatím žádné transakce</td></tr>
          ) : (
            loaderData.transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td><span style={{ color: typeColor(t.type), fontWeight: 600 }}>{typeLabel(t.type)}</span></td>
                <td>{t.seller_name || "—"}</td>
                <td>{t.username ?? "—"}</td>
                <td style={{ fontWeight: 700 }}>{t.total} Kč</td>
                <td>{t.created_at}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
