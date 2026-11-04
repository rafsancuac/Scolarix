/**
 * POST /api/v1/service-requests — spec §16 (`/api/v1/*` mandatory), §12.5.
 *
 * Public endpoint, rate-limited, no authentication required to submit.
 * Server-side validation is authoritative: the declaration is mandatory, the
 * brief is screened for prohibited scope (§12.6) and matched requests are
 * routed to REVIEW_REQUIRED rather than quoted.
 *
 * Never returns a payment state — a service request is not an order.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  buildServiceRequest,
  validateServiceRequest,
  type ServiceRequestInput,
} from "@/lib/service-request";
import { recordServiceRequest } from "@/lib/request-store";
import { getServiceBySlug } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** Simple in-process limiter. Production: Redis sliding window (§17.5). */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 1000) buckets.clear(); // bounded memory in the sandbox
  return hits.length > MAX_PER_WINDOW;
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

function parseBody(json: unknown): ServiceRequestInput | null {
  if (typeof json !== "object" || json === null) return null;
  const raw = json as Record<string, unknown>;
  const str = (value: unknown): string => (typeof value === "string" ? value : "");

  return {
    serviceSlug: str(raw.serviceSlug),
    packageId: str(raw.packageId) || undefined,
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone) || undefined,
    institution: str(raw.institution) || undefined,
    deadline: str(raw.deadline) || undefined,
    brief: str(raw.brief),
    integrityAcknowledged: raw.integrityAcknowledged === true,
  };
}

export async function POST(request: NextRequest) {
  const ip = clientKey(request);
  if (isRateLimited(`service-requests:${ip}`)) {
    return NextResponse.json(
      {
        message: "Too many requests. Please wait a minute before submitting again.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Expected a JSON request body.", code: "MALFORMED_BODY" },
      { status: 400 },
    );
  }

  const input = parseBody(json);
  if (!input) {
    return NextResponse.json(
      { message: "Malformed request payload.", code: "MALFORMED_BODY" },
      { status: 400 },
    );
  }

  const validation = validateServiceRequest(input);
  if (!validation.ok) {
    return NextResponse.json(
      {
        message: "Please correct the highlighted fields and submit again.",
        code: "VALIDATION_FAILED",
        errors: validation.errors,
      },
      { status: 422 },
    );
  }

  const service = await getServiceBySlug(input.serviceSlug);
  if (!service) {
    return NextResponse.json(
      { message: "That service is not available.", code: "SERVICE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const record = buildServiceRequest({
    input,
    matchedFlags: validation.matchedFlags,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });

  await recordServiceRequest(record);

  const message =
    record.outcome === "REVIEW_REQUIRED"
      ? "Your request has been sent to our review team. We will email you once the scope is confirmed — nothing has been charged."
      : `Thanks, ${record.contact.name.split(" ")[0]}. A specialist will review your request and email a fixed quotation. Nothing has been charged.`;

  return NextResponse.json(
    {
      reference: record.reference,
      outcome: record.outcome,
      message,
      createdAt: record.createdAt,
    },
    { status: 201 },
  );
}

export function GET() {
  // The admin queue reads through the repository seam, not this endpoint.
  return NextResponse.json(
    { message: "Use POST to submit a service request.", code: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
