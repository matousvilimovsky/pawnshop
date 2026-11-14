import type { Route } from "./+types/login";
import { getUserFromRequest, verifyPassword, createSession, createSessionCookieHeader } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const user = await getUserFromRequest(request, env);
  if (user) {
    throw new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }
  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!username || !password) {
    return Response.json({ error: "Vyplň uživatelské jméno a heslo." }, { status: 400 });
  }

  const user = await env.DB.prepare(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?"
  )
    .bind(username)
    .first<{ id: number; username: string; password_hash: string; role: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: "Nesprávné jméno nebo heslo." }, { status: 401 });
  }

  const token = await createSession(env.DB, user.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/dashboard",
      "Set-Cookie": createSessionCookieHeader(token),
    },
  });
}

export default function Login() {
  return (
    <div className="login-wrap">
      <form method="post" className="login-card">
        <h1>🏪 Pawnshop</h1>
        <div className="form-field">
          <label htmlFor="username">Uživatelské jméno</label>
          <input id="username" name="username" type="text" required autoFocus />
        </div>
        <div className="form-field">
          <label htmlFor="password">Heslo</label>
          <input id="password" name="password" type="password" required />
        </div>
        <button type="submit" className="btn" style={{ width: "100%" }}>
          Přihlásit
        </button>
      </form>
    </div>
  );
}
