import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/server/db";
import { hashPassword, checkPasswordPolicy } from "@/server/auth/password";
import { isSameOrigin, normaliseEmail } from "@/server/auth/policy";
import { audit, createSession, clientContext, isLoginThrottled, recordLoginFailure } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function problem(status: number, code: string, message: string, errors?: Record<string, string>) {
  return NextResponse.json({ code, message, ...(errors ? { errors } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin({ origin: request.headers.get("origin"), referer: request.headers.get("referer"), host: request.headers.get("host") })) {
    return problem(403, "BAD_ORIGIN", "This request did not come from our site.");
  }

  const { ip } = await clientContext();
  const throttleKey = `register:${ip}`;
  if (isLoginThrottled(throttleKey, 10)) {
    return problem(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "The request body must be JSON.");
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? normaliseEmail(input.email) : null;
  const password = typeof input.password === "string" ? input.password : "";

  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 100) errors.name = "Enter your full name (2–100 characters).";
  if (!email) errors.email = "Enter a valid email address.";
  const policy = checkPasswordPolicy(password, { email: email ?? undefined, name });
  if (!policy.ok) errors.password = policy.message ?? "Choose a stronger password.";
  if (Object.keys(errors).length > 0 || !email) {
    recordLoginFailure(throttleKey);
    return problem(422, "VALIDATION_FAILED", "Please correct the highlighted fields.", errors);
  }

  // `role` and `status` are fixed server-side; any such fields in the body are ignored (mass-assignment guard).
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    recordLoginFailure(throttleKey);
    return problem(409, "ACCOUNT_UNAVAILABLE", "We couldn't create that account. If you already registered, sign in instead.");
  }

  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password), role: "CUSTOMER", status: "ACTIVE" },
    select: { id: true, role: true },
  });
  await createSession(user);
  await audit({ actorId: user.id, actorRole: user.role, action: "auth.register", entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true, redirectTo: "/dashboard" }, { status: 201 });
}

export function GET() {
  return NextResponse.json({ code: "METHOD_NOT_ALLOWED", message: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}
