import type { Route } from "./+types/logout";
import { parseCookies, deleteSession, createDeleteCookieHeader } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

export async function action({ request, context }: Route.ActionArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const cookies = parseCookies(request);
  const token = cookies["pawnshop_session"];
  if (token) {
    await deleteSession(env.DB, token);
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": createDeleteCookieHeader(),
    },
  });
}

export default function Logout() {
  return null;
}
