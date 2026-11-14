import { useState, useMemo } from "react";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

interface Category {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

interface Product {
  id: number;
  name: string;
  category_id: number | null;
  buy_price: number;
  sell_price: number;
  icon: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireUser(request, env);

  const categories = await env.DB.prepare(
    "SELECT id, name, color, sort_order FROM categories ORDER BY sort_order"
  ).all<Category>();

  const products = await env.DB.prepare(
    "SELECT id, name, category_id, buy_price, sell_price, icon FROM products WHERE active = 1 ORDER BY name"
  ).all<Product>();

  return {
    categories: categories.results ?? [],
    products: products.results ?? [],
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const user = await requireUser(request, env);

  const form = await request.formData();
  const type = String(form.get("type")); // buy | sell | export
  const sellerName = String(form.get("seller_name") ?? "").trim();
  const itemsJson = String(form.get("items") ?? "[]");

  let items: Array<{ product_id: number; product_name: string; quantity: number; unit_price: number }>;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return Response.json({ error: "Neplatná data košíku." }, { status: 400 });
  }

  if (!items.length) {
    return Response.json({ error: "Košík je prázdný." }, { status: 400 });
  }

  const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const txResult = await env.DB.prepare(
    "INSERT INTO transactions (type, seller_name, total, user_id) VALUES (?, ?, ?, ?)"
  )
    .bind(type, sellerName, total, user.id)
    .run();

  const txId = txResult.meta.last_row_id;

  for (const item of items) {
    await env.DB.prepare(
      "INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(txId, item.product_id, item.product_name, item.quantity, item.unit_price)
      .run();
  }

  return Response.json({ ok: true, transaction_id: txId, total });
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { categories, products } = loaderData;
  const [tab, setTab] = useState<"buy" | "sell" | "export">("buy");
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const priceFor = (p: Product) => (tab === "buy" ? p.buy_price : p.sell_price);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const catOk = activeCat === "all" || p.category_id === activeCat;
      const searchOk = p.name.toLowerCase().includes(search.toLowerCase());
      return catOk && searchOk;
    });
  }, [products, activeCat, search]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === id ? { ...c, qty: c.qty + delta } : c
        )
        .filter((c) => c.qty > 0)
    );
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }

  const total = cart.reduce((sum, c) => sum + priceFor(c.product) * c.qty, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) return;
    setSubmitting(true);
    setMessage(null);

    const items = cart.map((c) => ({
      product_id: c.product.id,
      product_name: c.product.name,
      quantity: c.qty,
      unit_price: priceFor(c.product),
    }));

    const res = await fetch("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        type: tab,
        seller_name: sellerName,
        items: JSON.stringify(items),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setMessage(`Transakce #${data.transaction_id} uložena — ${data.total} Kč`);
      setCart([]);
      setSellerName("");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Chyba při ukládání.");
    }
  }

  const tabLabel = tab === "buy" ? "Výkup" : tab === "sell" ? "Prodej" : "Vývoz";

  return (
    <div className="pos-layout">
      <div>
        <div className="pos-header">
          <div className="pos-tabs">
            {(["buy", "sell", "export"] as const).map((t) => (
              <button
                key={t}
                className={`pos-tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "buy" ? "Výkup" : t === "sell" ? "Prodej" : "Vývoz"}
              </button>
            ))}
          </div>
          <input
            className="search-box"
            placeholder="🔍 Hledat položku…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-bar">
          <button
            className={`cat-chip ${activeCat === "all" ? "active" : ""}`}
            style={activeCat === "all" ? { background: "var(--accent)" } : {}}
            onClick={() => setActiveCat("all")}
          >
            Vše
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-chip ${activeCat === c.id ? "active" : ""}`}
              style={activeCat === c.id ? { background: c.color } : {}}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.category_id);
            return (
              <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                <div className="icon">{p.icon}</div>
                <div className="name">
                  {cat && (
                    <span className="cat-dot" style={{ background: cat.color }} />
                  )}
                  {p.name}
                </div>
                <div className="price">{priceFor(p)} Kč</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cart">
        <h2>🛒 Košík — {tabLabel}</h2>
        <div className="form-field">
          <input
            placeholder="Jméno prodávajícího"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
          />
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty">Košík je prázdný</div>
        ) : (
          <div className="cart-items">
            {cart.map((c) => (
              <div key={c.product.id} className="cart-item">
                <span>
                  {c.product.icon} {c.product.name}
                </span>
                <div className="qty">
                  <button className="qty-btn" onClick={() => changeQty(c.product.id, -1)}>−</button>
                  <span>{c.qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(c.product.id, 1)}>+</button>
                  <span style={{ marginLeft: "0.5rem", color: "var(--green)" }}>
                    {priceFor(c.product) * c.qty} Kč
                  </span>
                  <button className="qty-btn" onClick={() => removeFromCart(c.product.id)} style={{ marginLeft: "0.3rem", borderColor: "var(--red)", color: "var(--red)" }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="cart-total">
          <span>Celkem</span>
          <span style={{ color: "var(--green)" }}>{total} Kč</span>
        </div>
        {message && (
          <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: message.includes("Chyba") ? "var(--red)" : "var(--green)" }}>
            {message}
          </div>
        )}
        <button
          className="btn btn-green"
          style={{ width: "100%" }}
          disabled={!cart.length || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Ukládám…" : `Dokončit ${tabLabel.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
