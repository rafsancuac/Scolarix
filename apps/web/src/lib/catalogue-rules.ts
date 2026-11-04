/**
 * Pure catalogue business rules — spec §11.2 compliance gate, §9.2.2 availability.
 *
 * These are deliberately synchronous and free of any data access: they operate
 * on a `Product` value, so they behave identically whichever adapter produced it
 * (ADR-0013) and can be unit-tested without a database.
 */

import {
  PUBLISHABLE_AUTHORIZATION,
  type Availability,
  type Product,
  type ProductPlan,
} from "./types";

export interface GateFailure {
  reason:
    | "NOT_PUBLISHED"
    | "AUTHORIZATION_MISSING"
    | "AUTHORIZATION_UNAVAILABLE"
    | "EVIDENCE_MISSING"
    | "EVIDENCE_EXPIRED"
    | "NO_ACTIVE_PLAN";
  detail: string;
}

/**
 * A product is purchasable only when every §11.2 condition holds.
 * Turnitin is seeded as UNAVAILABLE_INDIVIDUAL_LICENSE with no plan, so it is
 * visible in the catalogue for information but can never be bought.
 */
export function evaluatePurchaseGate(product: Product): GateFailure | null {
  if (product.status !== "PUBLISHED") {
    return { reason: "NOT_PUBLISHED", detail: `${product.name} is not published.` };
  }
  if (product.authorizationStatus === "PENDING_VERIFICATION") {
    return {
      reason: "EVIDENCE_MISSING",
      detail: `${product.name} has no authorization evidence on file.`,
    };
  }
  // §11.2 / mandatory test #4: expired evidence makes the listing unpurchasable
  // immediately, even though it may stay visible for information.
  if (product.authorizationStatus === "EXPIRED_EVIDENCE") {
    return {
      reason: "EVIDENCE_EXPIRED",
      detail: `${product.name} authorization evidence has expired and must be renewed before it can be sold again.`,
    };
  }
  if (!PUBLISHABLE_AUTHORIZATION.includes(product.authorizationStatus)) {
    return {
      reason: "AUTHORIZATION_UNAVAILABLE",
      detail: `${product.name} has no individual licence channel.`,
    };
  }
  const activePlans = product.plans.filter((plan) => plan.active);
  if (activePlans.length === 0) {
    return { reason: "NO_ACTIVE_PLAN", detail: `${product.name} has no active plan.` };
  }
  return null;
}

export function isPurchasable(product: Product): boolean {
  return evaluatePurchaseGate(product) === null;
}

const LOW_STOCK_THRESHOLD = 5;

export function availabilityOf(product: Product): Availability {
  if (!isPurchasable(product)) return "UNAVAILABLE";

  const tracked = product.plans.filter(
    (plan) => plan.active && plan.inventoryMode !== "UNLIMITED",
  );
  if (tracked.length === 0) return "IN_STOCK";

  const total = tracked.reduce((sum, plan) => sum + (plan.stock ?? 0), 0);
  if (total <= 0) return "UNAVAILABLE";
  if (total <= LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
}

export function cheapestActivePlan(product: Product): ProductPlan | null {
  const active = product.plans
    .filter((plan) => plan.active)
    .sort((a, b) => a.pricePoisha - b.pricePoisha);
  return active[0] ?? null;
}