/**
 * Customer PII redaction for unauthenticated views.
 *
 * SECURITY: `/admin` and `/dashboard` are not behind Auth.js yet (the identity
 * layer is not connected in this environment). Until it is, those pages must
 * not disclose customer contact details, IP addresses or free-text briefs to
 * anyone who can reach the URL (OWASP A01 — Broken Access Control).
 *
 * Full values are revealed only in local development (`NODE_ENV !== "production"`)
 * so operators can still inspect the local JSONL store. Any production build
 * redacts, regardless of environment flags. Replace `canRevealCustomerPII()`
 * with a real role check (§17.6) once Auth.js sessions are available.
 */

export function canRevealCustomerPII(env: string | undefined = process.env.NODE_ENV): boolean {
  return env !== "production";
}

/** `rafsan@example.com` → `r***@example.com`. Malformed input is fully masked. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** `Md. Rafsan` → `M***`. */
export function maskName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length === 0 ? "***" : `${trimmed[0]}***`;
}

export const REDACTED_IP = "hidden";
export const REDACTED_BRIEF = "Brief hidden — sign-in with an admin role is required to view request details.";

export interface RedactableRequest {
  contact: { name: string; email: string };
  brief: string;
  declaration: { ipAddress: string };
}

/** Returns display-safe contact fields for a service request. */
export function displayContact<T extends RedactableRequest>(request: T, reveal = canRevealCustomerPII()) {
  return reveal
    ? {
        name: request.contact.name,
        email: request.contact.email,
        brief: request.brief,
        ipAddress: request.declaration.ipAddress,
      }
    : {
        name: maskName(request.contact.name),
        email: maskEmail(request.contact.email),
        brief: REDACTED_BRIEF,
        ipAddress: REDACTED_IP,
      };
}
