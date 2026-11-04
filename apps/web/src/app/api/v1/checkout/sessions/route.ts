/**
 * POST /api/v1/checkout/sessions — spec §16.3, §13.6, §6 rules 1, 2, 4, 5.
 *
 * Creates a gateway session for an order. In production this route:
 *   1. re-resolves every SKU and price from the catalogue server-side,
 *   2. re-runs the compliance gate inside the create-order transaction,
 *   3. writes an immutable order-line snapshot,
 *   4. creates a Payment in INITIATED and asks the gateway for a session,
 *   5. returns a redirect URL to the gateway's hosted page.
 *
 * It never accepts an amount from the client, and it never returns a success
 * state — only the gateway's verified server-to-server callback can move a
 * payment to SUCCEEDED, and only that transition may enqueue fulfilment.
 *
 * With no gateway credential configured this route returns 501 rather than
 * pretending. A fake session would be a fake payment confirmation, which the
 * platform rules forbid outright.
 */

import { NextResponse, type NextRequest } from "next/server";

import { PAYMENT_CONNECTED, priceCart, type CartLineInput } from "@/lib/checkout";
import { getBundleBySlug, getPlanBySku } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!PAYMENT_CONNECTED) {
    return NextResponse.json(
      {
        code: "PAYMENTS_NOT_CONFIGURED",
        message:
          "No payment gateway credential is configured, so a checkout session cannot be created. This endpoint refuses to return a fake session.",
        remediation:
          "Set SSLCOMMERZ_STORE_ID + SSLCOMMERZ_STORE_PASSWORD, or the bKash/Nagad credentials, in .env and restart the server.",
      },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "MALFORMED_BODY", message: "Expected a JSON request body." },
      { status: 400 },
    );
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const skus = Array.isArray(raw.sku)
    ? raw.sku.filter((value): value is string => typeof value === "string")
    : typeof raw.sku === "string"
      ? [raw.sku]
      : [];
  const bundleSlug = typeof raw.bundle === "string" ? raw.bundle : undefined;

  if (skus.length === 0) {
    return NextResponse.json(
      { code: "EMPTY_CART", message: "No line items were supplied." },
      { status: 422 },
    );
  }

  // Prices are re-derived here — the client supplied SKUs only, never amounts.
  const resolvedPlans = await Promise.all(skus.map((sku) => getPlanBySku(sku)));
  const lines: CartLineInput[] = resolvedPlans
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map(({ product, plan }) => ({ product, plan, quantity: 1 }));

  if (lines.length === 0) {
    return NextResponse.json(
      { code: "UNKNOWN_SKU", message: "None of the supplied SKUs exist in the catalogue." },
      { status: 422 },
    );
  }

  const cart = priceCart(lines, {
    bundle: bundleSlug ? (await getBundleBySlug(bundleSlug)) : undefined,
    studentVerified: false, // wired to the session's verification state in Phase 3
    studentDiscountBp: 0,
  });

  if (cart.blocked.length > 0) {
    return NextResponse.json(
      {
        code: "COMPLIANCE_GATE_FAILED",
        message:
          "One or more lines cannot be purchased right now. Remove them and try again.",
        blocked: cart.blocked.map(({ line, gate }) => ({
          sku: line.plan.sku,
          reason: gate.reason,
          detail: gate.detail,
        })),
      },
      { status: 409 },
    );
  }

  // With credentials present the next step is the gateway adapter call. It is
  // deliberately not stubbed: an unimplemented adapter must fail loudly rather
  // than return a fabricated redirect URL.
  return NextResponse.json(
    {
      code: "GATEWAY_ADAPTER_NOT_IMPLEMENTED",
      message:
        "Gateway credentials are present but the provider adapter is not implemented in this build.",
      order: {
        currency: "BDT",
        subtotalPoisha: cart.subtotalPoisha,
        discountPoisha: cart.discountPoisha,
        vatPoisha: cart.vatPoisha,
        totalPoisha: cart.totalPoisha,
        lines: cart.lines.map((line) => ({
          sku: line.sku,
          productName: line.productName,
          planLabel: line.planLabel,
          unitListPoisha: line.unitListPoisha,
          finalPoisha: line.finalPoisha,
        })),
      },
    },
    { status: 501 },
  );
}

export function GET() {
  return NextResponse.json(
    { code: "METHOD_NOT_ALLOWED", message: "Use POST to create a checkout session." },
    { status: 405,
      headers: { Allow: "POST" } },
  );
}
