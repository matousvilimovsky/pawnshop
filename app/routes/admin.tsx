import { Outlet, NavLink } from "react-router";
import type { Route } from "./+types/admin";
import { requireAdmin } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  await requireAdmin(request, env);
  return {};
}

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <h1 style={{ marginBottom: "1rem" }}>⚙️ Admin panel</h1>
      <div className="admin-tabs">
        <NavLink to="/admin" end className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
          Přehled
        </NavLink>
        <NavLink to="/admin/products" className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
          Položky
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
          Kategorie
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
          Uživatelé
        </NavLink>
        <NavLink to="/admin/transactions" className={({ isActive }) => `admin-tab ${isActive ? "active" : ""}`}>
          Transakce
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
