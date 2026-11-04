/**
 * Authorization and session policy — pure functions, no I/O.
 *
 * Kept free of Prisma/Next imports so every rule can be unit-tested in both
 * directions (allow AND deny), as the spec requires for RBAC (§17.6).
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "FINANCE" | "SUPPORT" | "COMPLIANCE" | "CUSTOMER";

export const STAFF_ROLES: readonly Role[] = ["SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT", "COMPLIANCE"];

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

/** Capabilities are explicit; nothing is implied by "being an admin". */
export type Capability =
  | "admin.console.view"
  | "customer.pii.view"
  | "finance.view"
  | "compliance.view"
  | "audit.view"
  | "users.view";

const GRANTS: Record<Role, readonly Capability[]> = {
  SUPER_ADMIN: ["admin.console.view", "customer.pii.view", "finance.view", "compliance.view", "audit.view", "users.view"],
  ADMIN: ["admin.console.view", "customer.pii.view", "compliance.view", "users.view"],
  FINANCE: ["admin.console.view", "finance.view"],
  SUPPORT: ["admin.console.view", "customer.pii.view"],
  COMPLIANCE: ["admin.console.view", "compliance.view", "audit.view"],
  CUSTOMER: [],
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  return role ? GRANTS[role].includes(capability) : false;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Idle timeout: 24h for customers, 8h for staff. Absolute cap: 30 days (§17.6). */
export function idleTimeoutMs(role: Role): number {
  return isStaff(role) ? 8 * HOUR : 24 * HOUR;
}

export const ABSOLUTE_SESSION_MS = 30 * DAY;

export interface SessionTimes {
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
}

/** Server time only (rule 9): the caller passes `now`, never a client value. */
export function isSessionLive(session: SessionTimes, now: Date): boolean {
  return (
    session.revokedAt === null &&
    session.expiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  );
}

/** New idle expiry after activity, never beyond the absolute cap. */
export function renewedExpiry(role: Role, now: Date, absoluteExpiresAt: Date): Date {
  const idle = now.getTime() + idleTimeoutMs(role);
  return new Date(Math.min(idle, absoluteExpiresAt.getTime()));
}

/**
 * CSRF defence for cookie-authenticated mutations: the request's Origin (or,
 * failing that, Referer) host must equal the Host the server was addressed as.
 * Requests with neither header are rejected — browsers always send one on
 * cross-site POSTs.
 */
export function isSameOrigin(headers: { origin?: string | null; referer?: string | null; host?: string | null }): boolean {
  const host = headers.host?.toLowerCase();
  if (!host) return false;
  const source = headers.origin ?? headers.referer;
  if (!source) return false;
  try {
    return new URL(source).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

/** Basic RFC-5322-ish check; the real proof of ownership is email verification. */
export function normaliseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/** Only same-site relative paths may be used as a post-login redirect (open-redirect guard). */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
