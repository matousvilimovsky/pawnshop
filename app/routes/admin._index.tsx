import type { Route } from "./+types/admin._index";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);

  const [products, categories, users, txs] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as c FROM products").first<{ c: number }>(),
    env.DB.prepare("SELECT COUNT(*) as c FROM categories").first<{ c: number }>(),
    env.DB.prepare("SELECT COUNT(*) as c FROM users").first<{ c: number }>(),
    env.DB.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total),0) as sum FROM transactions").first<{ c: number; sum: number }>(),
  ]);

  return {
    productCount: products?.c ?? 0,
    categoryCount: categories?.c ?? 0,
    userCount: users?.c ?? 0,
    txCount: txs?.c ?? 0,
    txTotal: txs?.sum ?? 0,
  };
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const stats = [
    { label: "Položek", value: loaderData.productCount },
    { label: "Kategorií", value: loaderData.categoryCount },
    { label: "Uživatelů", value: loaderData.userCount },
    { label: "Transakcí", value: loaderData.txCount },
    { label: "Obrat celkem", value: `${loaderData.txTotal} Kč` },
  ];
  return (
    <div className="card">
      <h2>Přehled</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ flex: "1 1 150px", background: "var(--bg)", borderRadius: "12px", padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>{s.value}</div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
