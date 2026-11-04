import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate (Next 16 `proxy`): a request to a protected area with no session
 * cookie gets a real HTTP 307 to /login, instead of the streamed 200 shell that
 * a Server Component `redirect()` produces once `loading.tsx` has flushed.
 *
 * This is defence in depth only. Cookie *presence* proves nothing; every page
 * still validates the session and role server-side (`server/auth/guards.ts`).
 */
const SESSION_COOKIES = ["__Host-session", "session"];

export function proxy(request: NextRequest) {
  const hasCookie = SESSION_COOKIES.some((name) => Boolean(request.cookies.get(name)?.value));
  if (hasCookie) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
