import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/server/db";
import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { isSameOrigin, normaliseEmail, safeRedirectPath } from "@/server/auth/policy";
import {
  audit,
  clearLoginFailures,
  clientContext,
  createSession,
  isLoginThrottled,
  MAX_FAILURES_PER_IP,
  recordLoginFailure,
} from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Verified against when the email is unknown so response time doesn't reveal which emails exist. */
const DUMMY_HASH_PROMISE = hashPassword("timing-equaliser-not-a-real-password");

const GENERIC_FAILURE = {
  code: "INVALID_CREDENTIALS",
  message: "Email or password is incorrect.",
};

export async function POST(request: NextRequest) {
  if (!isSameOrigin({ origin: request.headers.get("origin"), referer: request.headers.get("referer"), host: request.headers.get("host") })) {
    return NextResponse.json({ code: "BAD_ORIGIN", message: "This request did not come from our site." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_JSON", message: "The request body must be JSON." }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const email = typeof input.email === "string" ? normaliseEmail(input.email) : null;
  const password = typeof input.password === "string" ? input.password : "";
  const next = typeof input.next === "string" ? input.next : null;

  const { ip } = await clientContext();
  const keys = [`login:ip:${ip}`, `login:email:${email ?? "invalid"}`];
  if (isLoginThrottled(keys[0]!, MAX_FAILURES_PER_IP) || isLoginThrottled(keys[1]!)) {
    return NextResponse.json(
      { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const user = email && password.length <= 128 ? await db.user.findUnique({ where: { email } }) : null;
  const hash = user?.passwordHash ?? (await DUMMY_HASH_PROMISE);
  const passwordOk = await verifyPassword(password, hash);
  const allowed = Boolean(user && user.passwordHash && passwordOk && user.status === "ACTIVE" && user.deletedAt === null);

  if (!user || !allowed) {
    keys.forEach((k) => recordLoginFailure(k));
    await audit({
      actorId: user?.id ?? null,
      action: "auth.login.failed",
      entity: "User",
      entityId: user?.id ?? null,
      metadata: { reason: user ? (passwordOk ? "account_inactive" : "bad_password") : "unknown_email" },
    });
    return NextResponse.json(GENERIC_FAILURE, { status: 401 });
  }

  keys.forEach((k) => clearLoginFailures(k));
  if (needsRehash(user.passwordHash!)) {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }
  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await createSession(user);
  await audit({ actorId: user.id, actorRole: user.role, action: "auth.login", entity: "User", entityId: user.id });

  const fallback = user.role === "CUSTOMER" ? "/dashboard" : "/admin";
  return NextResponse.json({ ok: true, redirectTo: safeRedirectPath(next, fallback) });
}

export function GET() {
  return NextResponse.json({ code: "METHOD_NOT_ALLOWED", message: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}
