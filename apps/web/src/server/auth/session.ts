import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { Role } from "@marketplace/database";
import { cookies, headers } from "next/headers";

import { db } from "../db";
import {
  ABSOLUTE_SESSION_MS,
  idleTimeoutMs,
  isSessionLive,
  renewedExpiry,
  type Role as PolicyRole,
} from "./policy";

const IS_PROD = process.env.NODE_ENV === "production";

/** `__Host-` prefix pins the cookie to this exact host over HTTPS with Path=/ (no Domain). */
export const SESSION_COOKIE = IS_PROD ? "__Host-session" : "session";

/** The cookie carries a random token; only its SHA-256 is stored, so a DB leak cannot replay sessions. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: PolicyRole;
}

export interface CurrentSession {
  sessionId: string;
  user: SessionUser;
}

export async function clientContext(): Promise<{ ip: string; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || h.get("x-real-ip") || "local", userAgent: h.get("user-agent") };
}

export async function createSession(user: { id: string; role: Role }): Promise<void> {
  const { ip, userAgent } = await clientContext();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_MS);
  const expiresAt = renewedExpiry(user.role, now, absoluteExpiresAt);

  await db.session.create({
    data: {
      sessionToken: hashToken(token),
      userId: user.id,
      kind: "BROWSER",
      ipAddress: ip,
      userAgent: userAgent?.slice(0, 255) ?? null,
      expiresAt,
      absoluteExpiresAt,
    },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the signed-in user or `null`. Never throws on a bad/expired cookie. */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 256) return null;

  const row = await db.session.findUnique({
    where: { sessionToken: hashToken(token) },
    include: { user: true },
  });
  if (!row) return null;

  const now = new Date();
  const { user } = row;
  if (!isSessionLive(row, now) || user.status !== "ACTIVE" || user.deletedAt !== null) return null;

  // Sliding idle window, written at most once every 5 minutes to avoid a write per request.
  if (row.expiresAt.getTime() - now.getTime() < idleTimeoutMs(user.role) - 5 * 60_000) {
    await db.session.update({
      where: { id: row.id },
      data: { expiresAt: renewedExpiry(user.role, now, row.absoluteExpiresAt) },
    });
  }

  return { sessionId: row.id, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({
      where: { sessionToken: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

/** Append-only audit trail (rule 7). Callers must never put secrets in `metadata`. */
export async function audit(entry: {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const { ip, userAgent } = await clientContext();
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? undefined,
      ipAddress: ip,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
}

/* ---- login throttling (per-process; Redis sliding window in production, SEC-06) ---- */

const WINDOW_MS = 15 * 60_000;
/** Per-account limit is strict; the per-IP limit is looser so a shared campus/office NAT is not locked out by one user. */
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 20;
const failures = new Map<string, number[]>();

export function isLoginThrottled(key: string, limit = MAX_FAILURES_PER_EMAIL, now = Date.now()): boolean {
  const recent = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, recent);
  return recent.length >= limit;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  failures.set(key, [...(failures.get(key) ?? []), now]);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
