/**
 * Service request intake — spec §12.5 (request lifecycle) and §12.6 (academic
 * integrity). Pure, synchronous, framework-free so it can be unit-tested
 * without a server (tests/service-request.test.ts).
 *
 * This is the ONLY place that decides whether a request may be accepted, and
 * it always runs server-side. Client-side checks in the form are a convenience.
 */

import { getServiceBySlug } from "./repository";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface ServiceRequestInput {
  serviceSlug: string;
  packageId?: string;
  name: string;
  email: string;
  phone?: string;
  institution?: string;
  /** ISO date (yyyy-mm-dd) or free text from a date input. */
  deadline?: string;
  brief: string;
  integrityAcknowledged: boolean;
}

export type ServiceRequestOutcome =
  | "QUOTE_PENDING"
  /** Prohibited-scope screen matched: routed to admin review, never quoted automatically. */
  | "REVIEW_REQUIRED"
  | "REJECTED";

export interface ValidatedServiceRequest {
  reference: string;
  outcome: ServiceRequestOutcome;
  matchedFlags: string[];
  serviceSlug: string;
  serviceName: string;
  packageId: string | null;
  contact: {
    name: string;
    email: string;
    phone: string | null;
    institution: string | null;
  };
  deadline: string | null;
  brief: string;
  /** §12.6 — acknowledgement is stored with timestamp and IP by the caller. */
  declaration: {
    acknowledged: true;
    acknowledgedAt: string;
    ipAddress: string;
    userAgent: string;
  };
  createdAt: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  matchedFlags: string[];
}

/* -------------------------------------------------------------------------- */
/* Prohibited-scope screen (§12.6)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Phrase lists, not single words: "write my thesis" is prohibited, "help me
 * structure my thesis" is not. A match never auto-rejects — it routes the
 * request to human review before any quotation is issued, because phrase
 * matching produces false positives in both directions.
 */
const PROHIBITED_SCOPE: { flag: string; patterns: RegExp[] }[] = [
  {
    flag: "GHOSTWRITING_FOR_SUBMISSION",
    patterns: [
      /\bwrite (my|the|our) (thesis|dissertation|assignment|essay|paper|report)\b/i,
      /\bwrite it (for|on behalf of) me\b/i,
      /\bghost\s?writ/i,
      /\bdo (my|the) (assignment|homework|project) for me\b/i,
      /\bcomplete my (thesis|dissertation|assignment)\b/i,
      /\bfrom scratch for submission\b/i,
    ],
  },
  {
    flag: "GRADED_ASSESSMENT_COMPLETION",
    patterns: [
      /\b(take|sit) (my|the) (exam|test|viva)\b/i,
      /\bexam (paper|question) (solving|solution|answers?) for me\b/i,
      /\bsolve my (exam|quiz|test|midterm|final)\b/i,
      /\bgraded (quiz|test|exam)\b/i,
      /\blab (report|work|assignment) (for submission|write)\b/i,
    ],
  },
  {
    flag: "PLAGIARISM_EVASION",
    patterns: [
      /\b(beat|bypass|evade|get past|trick|fool) (turnitin|plagiarism|the checker)\b/i,
      /\bturnitin[\s-]*(proof|safe|free|bypass|report)\b/i,
      /\bundetectable ai\b/i,
      /\bhumani[sz]e (it )?so (turnitin|ai detector)/i,
      /\blower (the )?similarity (score|index|percentage)\b/i,
      /\breduce plagiarism (score|percentage) (without|by) (rewriting|changing)\b/i,
    ],
  },
  {
    flag: "FABRICATION",
    patterns: [
      // "fabricate the survey data", "make up some results", "generate citations"
      /\b(fabricat\w*|invent\w*|make up|making up|fake|falsify\w*|generate|create)\b[^.!?]{0,40}?\b(data|dataset|data set|results?|findings|citations?|references?|sources?|bibliography|survey responses?|participants|numbers)\b/i,
      /\bfake (references?|citations?|bibliography|data ?set|respondents|survey)\b/i,
      /\bcitations? that (do not|don't|do not actually) exist\b/i,
      /\breferences? that (do not|don't) exist\b/i,
      /\b(plausible|convincing|realistic)(-looking| looking)? (references?|citations?|sources?)\b/i,
    ],
  },
];

/**
 * Returns the flags matched by the brief. Kept separate from validation so the
 * review routing decision is independently testable.
 */
export function screenForProhibitedScope(brief: string): string[] {
  const matched: string[] = [];
  for (const rule of PROHIBITED_SCOPE) {
    if (rule.patterns.some((pattern) => pattern.test(brief))) matched.push(rule.flag);
  }
  return matched;
}

/* -------------------------------------------------------------------------- */
/* Field validation                                                            */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Bangladeshi mobile: +880 / 880 / 0 prefix, 10 significant digits. */
const BD_MOBILE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;
export const MIN_BRIEF_LENGTH = 40;
export const MAX_BRIEF_LENGTH = 4000;

export async function validateServiceRequest(input: ServiceRequestInput): ValidationResult {
  const errors: Record<string, string> = {};

  const service = input.serviceSlug ? (await getServiceBySlug(input.serviceSlug)) : undefined;
  if (!service) {
    errors.serviceSlug = "That service is not available.";
  }

  if (service && input.packageId) {
    const known = service.packages.some((pkg) => pkg.id === input.packageId);
    if (!known) errors.packageId = "That package does not belong to this service.";
  }

  const name = input.name?.trim() ?? "";
  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > 120) errors.name = "That name is too long.";

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  const phone = input.phone?.trim() ?? "";
  if (phone) {
    const digits = phone.replace(/[\s-]/g, "");
    if (!BD_MOBILE_PATTERN.test(digits)) {
      errors.phone = "Enter a valid Bangladeshi mobile number, e.g. +880 1712-345678.";
    }
  }

  const institution = input.institution?.trim() ?? "";
  if (institution.length > 160) errors.institution = "That institution name is too long.";

  const deadline = input.deadline?.trim() ?? "";
  if (deadline) {
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      errors.deadline = "Enter a valid date.";
    } else if (parsed.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      errors.deadline = "That date has already passed.";
    }
  }

  const brief = input.brief?.trim() ?? "";
  if (brief.length < MIN_BRIEF_LENGTH) {
    errors.brief = `Please describe the work in at least ${MIN_BRIEF_LENGTH} characters.`;
  } else if (brief.length > MAX_BRIEF_LENGTH) {
    errors.brief = `Please keep the description under ${MAX_BRIEF_LENGTH} characters.`;
  }

  if (input.integrityAcknowledged !== true) {
    errors.integrityAcknowledged =
      "You must acknowledge the academic integrity declaration before submitting.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    matchedFlags: screenForProhibitedScope(brief),
  };
}

/* -------------------------------------------------------------------------- */
/* Reference generation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Human-readable, non-enumerable request reference: `SR-YYYYMMDD-XXXXXX`.
 * The random suffix is what makes the reference unguessable — a bare counter
 * would let one customer probe another customer's request (§19).
 */
export function generateRequestReference(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SR-${yyyy}${mm}${dd}-${suffix}`;
}

/**
 * Builds the record the caller persists. Timestamps are UTC (§6 rule 12);
 * display-time conversion happens in `formatDateTime`.
 */
export async function buildServiceRequest(args: {
  input: ServiceRequestInput;
  matchedFlags: string[];
  now?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}): ValidatedServiceRequest {
  const { input, matchedFlags } = args;
  const now = args.now ?? new Date();
  const service = await getServiceBySlug(input.serviceSlug);

  return {
    reference: generateRequestReference(now),
    outcome: matchedFlags.length > 0 ? "REVIEW_REQUIRED" : "QUOTE_PENDING",
    matchedFlags,
    serviceSlug: input.serviceSlug,
    serviceName: service?.name ?? input.serviceSlug,
    packageId: input.packageId ?? null,
    contact: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      institution: input.institution?.trim() || null,
    },
    deadline: input.deadline?.trim() || null,
    brief: input.brief.trim(),
    declaration: {
      acknowledged: true,
      acknowledgedAt: now.toISOString(),
      ipAddress: args.ipAddress ?? "unknown",
      userAgent: args.userAgent ?? "unknown",
    },
    createdAt: now.toISOString(),
  };
}
