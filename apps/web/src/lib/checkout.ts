/**
 * Cart pricing — spec §13.8 (discount order) and §13.3 (tax).
 *
 * Pure function over repository data so it is unit-testable without a server
 * (tests/money.test.ts, tests/checkout.test.ts). Every amount is an integer in
 * poisha; there is no float arithmetic anywhere in this file.
 *
 * Fixed discount order: SALE → BUNDLE → STUDENT → COUPON. `applyDiscounts`
 * enforces the order, half-up rounding per step and the price floor.
 */

import {
  applyBasisPoints,
  applyDiscounts,
  assertPoisha,
  formatBDT,
  taxPoisha,
  type DiscountInput,
  type DiscountStep,
} from "./money";
import { evaluatePurchaseGate, type GateFailure } from "./repository";
import type { Bundle, Product, ProductPlan } from "./types";

export interface CartLineInput {
  product: Product;
  plan: ProductPlan;
  quantity: number;
}

export interface PricedLine {
  sku: string;
  productId: string;
  productSlug: string;
  productName: string;
  planLabel: string;
  quantity: number;
  /** Snapshot of the list price at the moment of pricing (§6 rule 2). */
  unitListPoisha: number;
  unitCompareAtPoisha: number | null;
  basePoisha: number;
  finalPoisha: number;
  discountPoisha: number;
  steps: DiscountStep[];
  floorApplied: boolean;
  offeringType: Product["offeringType"];
  renewalCapability: Product["renewalCapability"];
  deliverySlaHours: number;
  refundEligibility: Product["refundEligibility"];
}

export interface PricedCart {
  lines: PricedLine[];
  /** Lines removed by the compliance gate, with the reason. */
  blocked: { line: CartLineInput; gate: GateFailure }[];
  subtotalPoisha: number;
  discountPoisha: number;
  taxablePoisha: number;
  vatPoisha: number;
  totalPoisha: number;
  vatRateBp: number;
  steps: DiscountStep[];
  floorApplied: boolean;
  formatted: {
    subtotal: string;
    discount: string;
    vat: string;
    total: string;
  };
}

export interface CartPricingOptions {
  /** Bundle applied to the whole cart; its saving is allocated per line. */
  bundle?: Bundle;
  /**
   * Student discount in basis points, applied only when the shopper is
   * verified. Callers must pass 0 unless verification is genuinely approved —
   * the value comes from config, never from the request (§6 rule 1).
   */
  studentDiscountBp?: number;
  studentVerified?: boolean;
  coupon?: { code: string; basisPoints?: number; fixedPoisha?: number; minCartPoisha?: number };
  /** VAT rate in basis points (Bangladesh SD/VAT Act 2012 — D5 pending). */
  vatRateBp?: number;
  /** Price floor per line; stacked discounts can never pass it. */
  floorPoisha?: number;
}

/**
 * Resolves the compliance gate for every requested line before pricing, then
 * prices the surviving lines. Blocked lines never contribute to the total.
 */
export function priceCart(lines: CartLineInput[], options: CartPricingOptions = {}): PricedCart {
  const {
    bundle,
    studentDiscountBp = 0,
    studentVerified = false,
    coupon,
    vatRateBp = readVatRateBp(),
    floorPoisha = 0,
  } = options;

  const blocked: PricedCart["blocked"] = [];
  const accepted: CartLineInput[] = [];

  for (const line of lines) {
    const gate = evaluatePurchaseGate(line.product);
    if (gate) blocked.push({ line, gate });
    else accepted.push(line);
  }

  // Bundle saving is allocated across lines in proportion to list price, so
  // each order line still carries its own correct snapshot.
  const acceptedBase = accepted.reduce(
    (sum, line) => sum + line.plan.pricePoisha * line.quantity,
    0,
  );
  const bundleSaving = bundle
    ? Math.max(0, bundle.compareAtPoisha - bundle.pricePoisha)
    : 0;

  const couponApplies =
    coupon !== undefined &&
    (coupon.minCartPoisha === undefined || acceptedBase >= coupon.minCartPoisha);

  const pricedLines: PricedLine[] = accepted.map((line) => {
    const basePoisha = line.plan.pricePoisha * line.quantity;
    assertPoisha(basePoisha, "cart line base");

    const discounts: DiscountInput[] = [];

    // 1. SALE — already reflected in `plan.pricePoisha` (the fixture stores the
    //    reduced price with `compareAtPoisha` holding the pre-sale figure), so
    //    this step is informational at cart level and must NOT be applied twice.
    //    The plan card shows the saving via `savingsPoisha`.

    // 2. BUNDLE — allocated share of the bundle saving.
    if (bundleSaving > 0 && acceptedBase > 0) {
      const share = Math.round((basePoisha / acceptedBase) * bundleSaving);
      if (share > 0) {
        discounts.push({ type: "BUNDLE", label: bundle?.name ?? "Bundle", fixedPoisha: share });
      }
    }

    // 3. STUDENT — percentage on the post-sale, post-bundle amount.
    if (studentVerified && studentDiscountBp > 0) {
      discounts.push({
        type: "STUDENT",
        label: "Student discount",
        basisPoints: studentDiscountBp,
      });
    }

    // 4. COUPON — last, only on coupon-eligible plans.
    if (couponApplies && coupon && line.plan.couponEligible) {
      discounts.push({
        type: "COUPON",
        label: `Coupon ${coupon.code}`,
        ...(coupon.basisPoints !== undefined
          ? { basisPoints: coupon.basisPoints }
          : { fixedPoisha: coupon.fixedPoisha ?? 0 }),
      });
    }

    const result = applyDiscounts(basePoisha, discounts, floorPoisha * line.quantity);

    return {
      sku: line.plan.sku,
      productId: line.product.id,
      productSlug: line.product.slug,
      productName: line.product.name,
      planLabel: line.plan.label,
      quantity: line.quantity,
      unitListPoisha: line.plan.pricePoisha,
      unitCompareAtPoisha: line.plan.compareAtPoisha ?? null,
      basePoisha,
      finalPoisha: result.totalPoisha,
      discountPoisha: basePoisha - result.totalPoisha,
      steps: result.steps,
      floorApplied: result.floorApplied,
      offeringType: line.product.offeringType,
      renewalCapability: line.product.renewalCapability,
      deliverySlaHours: line.product.deliverySlaHours,
      refundEligibility: line.product.refundEligibility,
    };
  });

  const subtotalPoisha = pricedLines.reduce((sum, line) => sum + line.basePoisha, 0);
  const discountPoisha = pricedLines.reduce((sum, line) => sum + line.discountPoisha, 0);
  const taxablePoisha = subtotalPoisha - discountPoisha;
  const vatPoisha = taxPoisha(taxablePoisha, vatRateBp);
  const totalPoisha = taxablePoisha + vatPoisha;

  // Aggregate the ladder for display: one row per discount type, in order.
  const order = ["SALE", "BUNDLE", "STUDENT", "COUPON"] as const;
  const steps: DiscountStep[] = order
    .map((type) => {
      const matching = pricedLines.flatMap((line) => line.steps).filter((step) => step.type === type);
      if (matching.length === 0) return null;
      return {
        type,
        label: matching[0]!.label,
        amountPoisha: matching.reduce((sum, step) => sum + step.amountPoisha, 0),
      };
    })
    .filter((step): step is DiscountStep => step !== null);

  return {
    lines: pricedLines,
    blocked,
    subtotalPoisha,
    discountPoisha,
    taxablePoisha,
    vatPoisha,
    totalPoisha,
    vatRateBp,
    steps,
    floorApplied: pricedLines.some((line) => line.floorApplied),
    formatted: {
      subtotal: formatBDT(subtotalPoisha),
      discount: formatBDT(discountPoisha),
      vat: formatBDT(vatPoisha),
      total: formatBDT(totalPoisha),
    },
  };
}

/** VAT rate from config. 0 while D5 (VAT treatment) is unresolved. */
export function readVatRateBp(): number {
  const raw = process.env.VAT_RATE_BP;
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : 0;
}

/* -------------------------------------------------------------------------- */
/* Integration capability flags                                                */
/* -------------------------------------------------------------------------- */

function isSet(...keys: string[]): boolean {
  return keys.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0 && !value.includes("{{");
  });
}

/** SSLCommerz OR any MFS gateway fully configured. */
export const PAYMENT_CONNECTED =
  // SSLCOMMERZ_IS_SANDBOX is optional — it defaults to sandbox-safe, so its
  // absence must not be read as "not configured".
  isSet("SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD") ||
  isSet("BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_USERNAME", "BKASH_PASSWORD") ||
  isSet("NAGAD_MERCHANT_ID", "NAGAD_PRIVATE_KEY", "NAGAD_PG_PUBLIC_KEY");

/** Student discount step needs a verification provider AND a configured rate. */
export const STUDENT_DISCOUNT_CONFIGURED =
  isSet("STUDENT_VERIFICATION_PROVIDER") && isSet("STUDENT_DISCOUNT_BP");

export const COUPON_CONFIGURED =
  isSet("COUPON_SERVICE_URL") || process.env.DATA_ADAPTER === "prisma";

/**
 * Transactional email. SMTP is the portable path and is what the compose
 * `mailpit` profile serves locally; a hosted provider is accepted as an
 * alternative so neither choice forces a code change.
 */
export const EMAIL_CONNECTED =
  isSet("SMTP_HOST", "MAIL_FROM") || isSet("EMAIL_PROVIDER", "EMAIL_API_KEY");

export const DATA_ADAPTER = (process.env.DATA_ADAPTER ?? "static") as "static" | "prisma";
export const DATABASE_CONNECTED = DATA_ADAPTER === "prisma" && isSet("DATABASE_URL");
export const QUEUE_CONNECTED = isSet("REDIS_URL");

export function studentDiscountBp(): number {
  const raw = process.env.STUDENT_DISCOUNT_BP;
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : 0;
}

/** Capability matrix for the admin console — same flags the UI gates on. */
export function capabilityMatrix(): {
  key: string;
  label: string;
  connected: boolean;
  required: boolean;
  detail: string;
}[] {
  return [
    {
      key: "database",
      label: "PostgreSQL (Prisma)",
      connected: DATABASE_CONNECTED,
      required: true,
      detail: DATABASE_CONNECTED
        ? "Connected — orders, customers and the ledger are persisted."
        : "Not connected — serving the seeded fixture adapter (DATA_ADAPTER=static). No order can be created.",
    },
    {
      key: "payments",
      label: "Payment gateway",
      connected: PAYMENT_CONNECTED,
      required: true,
      detail: PAYMENT_CONNECTED
        ? "Configured — checkout renders a real pay action."
        : "No gateway credential present. Checkout shows a notice instead of a pay button.",
    },
    {
      key: "queue",
      label: "Redis / BullMQ",
      connected: QUEUE_CONNECTED,
      required: true,
      detail: QUEUE_CONNECTED
        ? "Connected — fulfilment jobs and webhook dedupe are queued."
        : "Not connected — automated fulfilment and webhook idempotency cannot run.",
    },
    {
      key: "email",
      label: "Transactional email",
      connected: EMAIL_CONNECTED,
      required: true,
      detail: EMAIL_CONNECTED
        ? "Configured — confirmations, invoices and renewal reminders will send."
        : "Not configured — no transactional email will be delivered.",
    },
    {
      key: "student",
      label: "Student verification",
      connected: STUDENT_DISCOUNT_CONFIGURED,
      required: false,
      detail: STUDENT_DISCOUNT_CONFIGURED
        ? `Configured — ${applyBasisPoints(10_000, studentDiscountBp()) / 100} BDT off per 100 BDT at step 3.`
        : "Not configured — student pricing is displayed but the discount step contributes zero.",
    },
    {
      key: "coupons",
      label: "Coupon service",
      connected: COUPON_CONFIGURED,
      required: false,
      detail: COUPON_CONFIGURED
        ? "Configured — coupons are validated server-side at step 4."
        : "Not configured — coupon codes cannot be redeemed.",
    },
  ];
}
