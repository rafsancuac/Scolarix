/**
 * Formatting helpers — one boundary for dates and numbers (spec §6 rule 12).
 *
 * All timestamps are stored in UTC and displayed in the viewer's timezone.
 * Server rendering uses the configured storefront timezone so SSR and client
 * agree; no client-clock arithmetic is ever used for business logic (§6 rule 9).
 */

const STORE_TZ = process.env.APP_TIMEZONE ?? "Asia/Dhaka";

export function formatDate(
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  timeZone: string = STORE_TZ,
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone }).format(date);
}

export function formatDateTime(iso: string | Date, timeZone: string = STORE_TZ): string {
  return formatDate(iso, { dateStyle: "medium", timeStyle: "short" }, timeZone);
}

/**
 * Remaining days until expiry, computed from server-side UTC instants
 * (§6 rule 9). Never derived from a client clock.
 */
export function remainingDays(expiresAt: string | Date, now: Date = new Date()): number {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const msPerDay = 86_400_000;
  return Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);
}

export function formatDurationDays(days: number): string {
  if (days <= 0) return "—";
  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30.4375);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  const roundedYears = Math.round(years * 2) / 2;
  return `${roundedYears} year${roundedYears === 1 ? "" : "s"}`;
}

export function formatTurnaround(days: number): string {
  if (days <= 1) return "24 hours";
  if (days < 7) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"}`;
}

export function formatSlaHours(hours: number): string {
  if (hours <= 0) return "Instant";
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${hours} business hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
