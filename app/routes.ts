import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("admin", "routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("products", "routes/admin.products.tsx"),
    route("products/new", "routes/admin.products.new.tsx"),
    route("categories", "routes/admin.categories.tsx"),
    route("users", "routes/admin.users.tsx"),
    route("transactions", "routes/admin.transactions.tsx"),
  ]),
] satisfies RouteConfig;
