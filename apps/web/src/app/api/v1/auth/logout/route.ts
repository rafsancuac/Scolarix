import { NextResponse, type NextRequest } from "next/server";

import { isSameOrigin } from "@/server/auth/policy";
import { audit, destroyCurrentSession, getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin({ origin: request.headers.get("origin"), referer: request.headers.get("referer"), host: request.headers.get("host") })) {
    return NextResponse.json({ code: "BAD_ORIGIN", message: "This request did not come from our site." }, { status: 403 });
  }
  const session = await getCurrentSession();
  await destroyCurrentSession();
  if (session) {
    await audit({ actorId: session.user.id, actorRole: session.user.role, action: "auth.logout", entity: "Session", entityId: session.sessionId });
  }
  return NextResponse.json({ ok: true, redirectTo: "/" });
}

export function GET() {
  return NextResponse.json({ code: "METHOD_NOT_ALLOWED", message: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}
