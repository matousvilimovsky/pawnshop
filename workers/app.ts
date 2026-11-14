import { createRequestHandler, type ServerBuild } from "react-router";

export interface Env {
  DB: D1Database;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MANIFEST = import.meta.env.MANIFEST as any;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const build = (await MANIFEST["build"]) as ServerBuild;
    const handler = createRequestHandler(build, "production");
    return handler(request, {
      cloudflare: { env, ctx, context: ctx },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  },
} satisfies ExportedHandler<Env>;
