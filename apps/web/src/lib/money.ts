/**
 * Money — spec §1.1, §6 rule 10.
 *
 * All amounts are INTEGER MINOR UNITS (BDT poisha; 1 BDT = 100 poisha).
 * Never a float. Every calculation is deterministic and reproducible from
 * stored inputs, and each discount step is recorded separately on the order
 * line so refunds, invoices and reports stay auditable.
 */

import type { Money } from "./types";

export const MINOR_UNITS_PER_MAJOR = 100;

/** Guard against float money reaching the domain (§6 rule 1). */
export function assertPoisha(value: number, label = "amount"): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      `Money invariant violated: ${label} must be a safe integer in minor units, received ${value}`,
    );
  }
  if (value < 0) {
    throw new Error(`Money invariant violated: ${label} must not be negative, received ${value}`);
  }
}

export function poisha(amountPoisha: number): Money {
  assertPoisha(amountPoisha);
  return { amountPoisha, currency: "BDT" };
}

export function fromBdt(bdt: number): Money {
  // Round once, at the boundary, half-up. No float arithmetic downstream.
  return poisha(Math.round(bdt * MINOR_UNITS_PER_MAJOR));
}

export function toBdt(money: Money): number {
  return money.amountPoisha / MINOR_UNITS_PER_MAJOR;
}

export function add(a: Money, b: Money): Money {
  return poisha(a.amountPoisha + b.amountPoisha);
}

export function subtract(a: Money, b: Money): Money {
  return poisha(a.amountPoisha - b.amountPoisha);
}

export function multiply(money: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(`Quantity must be a positive integer, received ${quantity}`);
  }
  return poisha(money.amountPoisha * quantity);
}

/** Deterministic half-up rounding to minor units (§13.3 FR-CART-05). */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/** Basis-point discount, rounded half-up. 1000 bp = 10%. */
export function applyBasisPoints(amountPoisha: number, bp: number): number {
  assertPoisha(amountPoisha);
  if (!Number.isFinite(bp) || bp < 0 || bp > 10_000) {
    throw new Error(`Basis points must be 0..10000, received ${bp}`);
  }
  return roundHalfUp((amountPoisha * bp) / 10_000);
}

/* -------------------------------------------------------------------------- */
/* Display                                                                     */
/* -------------------------------------------------------------------------- */

const bdtFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  // Whole-taka display. Money that is not a round taka amount is still exact
  // internally — this only affects the label, and `exact: true` is available
  // wherever poisha must be shown (invoices, ledger views).
  maximumFractionDigits: 0,
  // Default ICU rounding is halfExpand (half away from zero) — the same rule
  // as roundHalfUp(). `roundingMode` is not passed explicitly because it is
  // unavailable on the Node 20 ICU build this project targets.
  numberingSystem: "latn",
});

const bdtFormatterExact = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  numberingSystem: "latn",
});

/** Single display boundary for money (§1.1). */
export function formatBDT(money: Money | number, opts?: { exact?: boolean }): string {
  const amountPoisha = typeof money === "number" ? money : money.amountPoisha;
  const bdt = amountPoisha / MINOR_UNITS_PER_MAJOR;
  const formatted = (opts?.exact ? bdtFormatterExact : bdtFormatter).format(bdt);
  // Intl emits "BDT" or a taka sign depending on runtime; normalise to ৳.
  return formatted.replace(/^BDT\s*/, "৳").replace(/BDT/, "৳");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-BD", { numberingSystem: "latn" }).format(value);
}

/* -------------------------------------------------------------------------- */
/* Effective per-month price (§9.2.3)                                          */
/* -------------------------------------------------------------------------- */

const DAYS_PER_MONTH = 30.4375;

/** Effective monthly price, used for honest affordability framing (§13.11). */
export function effectiveMonthlyPoisha(pricePoisha: number, durationDays: number): number {
  assertPoisha(pricePoisha);
  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    throw new Error(`durationDays must be positive, received ${durationDays}`);
  }
  const months = durationDays / DAYS_PER_MONTH;
  return roundHalfUp(pricePoisha / months);
}

/** Savings against a compare-at price. Never invented — null when not real. */
export function savingsPoisha(pricePoisha: number, compareAtPoisha?: number): number | null {
  if (compareAtPoisha === undefined || compareAtPoisha <= pricePoisha) return null;
  return compareAtPoisha - pricePoisha;
}

export function savingsPercentPoisha(
  pricePoisha: number,
  compareAtPoisha?: number,
): number | null {
  const saved = savingsPoisha(pricePoisha, compareAtPoisha);
  if (saved === null || !compareAtPoisha) return null;
  return Math.round((saved / compareAtPoisha) * 100);
}

/* -------------------------------------------------------------------------- */
/* Deterministic discount stacking (§5.5)                                      */
/* Order: Sale price -> Bundle discount -> Student discount -> Coupon.         */
/* Each step is recorded so refunds and reporting stay auditable.              */
/* -------------------------------------------------------------------------- */

export type DiscountType = "SALE" | "BUNDLE" | "STUDENT" | "COUPON";

export interface DiscountStep {
  type: DiscountType;
  label: string;
  amountPoisha: number;
}

export interface DiscountInput {
  type: DiscountType;
  label: string;
  /** Percentage in basis points, or a fixed amount in poisha. */
  basisPoints?: number;
  fixedPoisha?: number;
}

export interface PriceFloorResult {
  /** True when the floor clipped or suppressed a discount step. */
  floorApplied: boolean;
}

/**
 * Apply discounts in the mandated order, per-line, half-up, in minor units.
 * A price floor prevents a stacked discount producing a zero or negative total.
 */
export function applyDiscounts(
  basePoisha: number,
  discounts: readonly DiscountInput[],
  floorPoisha = 0,
): { totalPoisha: number; steps: DiscountStep[] } & PriceFloorResult {
  assertPoisha(basePoisha);

  const order: DiscountType[] = ["SALE", "BUNDLE", "STUDENT", "COUPON"];
  const sorted = [...discounts].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
  );

  const steps: DiscountStep[] = [];
  let running = basePoisha;
  let floorApplied = false;

  for (const discount of sorted) {
    const amount =
      discount.basisPoints !== undefined
        ? applyBasisPoints(running, discount.basisPoints)
        : (discount.fixedPoisha ?? 0);

    if (amount <= 0) continue;

    // Never discount below the floor, and never below zero.
    const headroom = Math.max(0, running - floorPoisha);
    const effective = Math.min(amount, headroom);

    // The step was clipped by the floor: record it so admin can be alerted
    // (§6 rule 1) rather than silently absorbing the difference.
    if (effective < amount) floorApplied = true;
    if (effective <= 0) continue;

    running -= effective;
    steps.push({ type: discount.type, label: discount.label, amountPoisha: effective });
  }

  return { totalPoisha: running, steps, floorApplied };
}

/* -------------------------------------------------------------------------- */
/* Tax (§13.3 FR-CART-05)                                                      */
/* -------------------------------------------------------------------------- */

export function taxPoisha(amountPoisha: number, rateBp: number): number {
  return applyBasisPoints(amountPoisha, rateBp);
}
