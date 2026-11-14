import type { Env } from "../../workers/app";

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "seller";
  display_name: string;
}

const COOKIE_NAME = "pawnshop_session";
const SESSION_DAYS = 30;

// --- Password hashing (SHA-256 via Web Crypto) ---
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// --- Session token ---
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Cookie helpers ---
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookies[key.trim()] = decodeURIComponent(rest.join("=").trim());
  }
  return cookies;
}

export function createSessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_DAYS * 86400
  }`;
}

export function createDeleteCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// --- DB session operations ---
export async function createSession(
  db: D1Database,
  userId: number
): Promise<string> {
  const token = generateToken();
  await db
    .prepare(
      "INSERT INTO sessions (token, user_id) VALUES (?, ?)"
    )
    .bind(token, userId)
    .run();
  return token;
}

export async function deleteSession(
  db: D1Database,
  token: string
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export async function getUserFromRequest(
  request: Request,
  env: Env
): Promise<SessionUser | null> {
  const cookies = parseCookies(request);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const result = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  )
    .bind(token)
    .first<SessionUser>();

  return result ?? null;
}

// --- Guard helpers for loaders/actions ---
export async function requireUser(
  request: Request,
  env: Env
): Promise<SessionUser> {
  const user = await getUserFromRequest(request, env);
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return user;
}

export async function requireAdmin(
  request: Request,
  env: Env
): Promise<SessionUser> {
  const user = await requireUser(request, env);
  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
