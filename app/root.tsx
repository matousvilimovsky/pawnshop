import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
  Link,
} from "react-router";
import type { Route } from "./+types/root";
import { getUserFromRequest } from "~/lib/auth.server";
import type { Env } from "../workers/app";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const user = await getUserFromRequest(request, env);
  return { user };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <>
      <TopNav user={user} />
      <Outlet />
    </>
  );
}

function TopNav({ user }: { user: { username: string; role: string } | null }) {
  return (
    <nav className="topnav">
      <div className="topnav-brand">🏪 Pawnshop</div>
      <div className="topnav-links">
        {user && (
          <>
            <Link to="/">Pokladna</Link>
            {user.role === "admin" && <Link to="/admin">Admin</Link>}
            <span className="topnav-user">{user.username}</span>
            <form method="post" action="/logout" style={{ display: "inline" }}>
              <button type="submit" className="btn-logout">Odhlásit</button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="error-page">
      <h1>Chyba</h1>
      {isRouteErrorResponse(error) ? (
        <p>
          {error.status} — {error.statusText}
        </p>
      ) : (
        <p>Něco se pokazilo.</p>
      )}
      <Link to="/">Zpět domů</Link>
    </div>
  );
}
