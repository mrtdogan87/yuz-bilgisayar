import { db } from "./schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function pruneExpired(): void {
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(Date.now());
}

export async function verifyPassword(password: string): Promise<boolean> {
  const row = db.prepare("SELECT admin_password_hash FROM settings WHERE id = 1").get() as { admin_password_hash: string };
  if (!row.admin_password_hash) return false;
  return bcrypt.compare(password, row.admin_password_hash);
}

export async function setPassword(password: string) {
  const hash = await bcrypt.hash(password, 12);
  db.prepare("UPDATE settings SET admin_password_hash = ? WHERE id = 1").run(hash);
}

export async function hasPassword(): Promise<boolean> {
  const row = db.prepare("SELECT admin_password_hash FROM settings WHERE id = 1").get() as { admin_password_hash: string };
  return !!row.admin_password_hash;
}

export function createSession(userAgent?: string): string {
  pruneExpired();
  const token = crypto.randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO admin_sessions (id, token_hash, expires_at, created_at, user_agent) VALUES (?, ?, ?, ?, ?)"
  ).run(id, hashToken(token), now + SESSION_MAX_AGE_SEC * 1000, now, userAgent ?? null);
  return token;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  pruneExpired();
  const row = db
    .prepare("SELECT id FROM admin_sessions WHERE token_hash = ? AND expires_at > ?")
    .get(hashToken(token), Date.now());
  return !!row;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;
  db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hashToken(token));
}

function sessionCookie(value: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSec}`;
}

export function setSessionCookie(response: Response, token: string) {
  response.headers.append("Set-Cookie", sessionCookie(token, SESSION_MAX_AGE_SEC));
}

export function clearSessionCookie(response: Response) {
  response.headers.append("Set-Cookie", sessionCookie("", 0));
}
