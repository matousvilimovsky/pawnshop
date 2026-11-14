import type { Route } from "./+types/_index";
import { getUserFromRequest } from "~/lib/auth.server";
import type { Env } from "../../workers/app";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: Env } }).cloudflare.env;
  const user = await getUserFromRequest(request, env);
  throw new Response(null, {
    status: 302,
    headers: { Location: user ? "/dashboard" : "/login" },
  });
}

export default function Index() {
  return null;
}
