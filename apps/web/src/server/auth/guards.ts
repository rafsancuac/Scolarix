import "server-only";

import { notFound, redirect } from "next/navigation";

import { getCurrentSession, type CurrentSession } from "./session";
import { can, type Capability } from "./policy";

/** Server-component guard: unauthenticated visitors are sent to sign-in. */
export async function requireSession(returnTo: string): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return session;
}

/**
 * Staff-only guard. Signed-in customers get a 404 (not 403) so the existence of
 * the console is not disclosed; anonymous visitors are sent to sign-in.
 */
export async function requireCapability(capability: Capability, returnTo: string): Promise<CurrentSession> {
  const session = await requireSession(returnTo);
  if (!can(session.user.role, capability)) notFound();
  return session;
}
