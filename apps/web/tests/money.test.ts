/**
 * Money invariants — spec §6 rule 1, §7 (integer minor units), §13.8.
 *
 * These are the tests that stop a rounding bug from becoming a reconciliation
 * gap. Everything is asserted in integer poisha; a float appearing anywhere in
 * the money path is itself a failure.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MINOR_UNITS_PER_MAJOR,
  add,
  applyBasisPoints,
  applyDiscounts,
  assertPoisha,
  effectiveMonthlyPoisha,
  formatBDT,
  fromBdt,
  multiply,
  poisha,
  roundHalfUp,
  savingsPercentPoisha,
  savingsPoisha,
  subtract,
  taxPoisha,
  toBdt,
} from "../src/lib/money";

describe("integer minor units", () => {
  it("treats 1 BDT as exactly 100 poisha", () => {
    assert.equal(MINOR_UNITS_PER_MAJOR, 100);
    assert.equal(fromBdt(1).amountPoisha, 100);
    assert.equal(toBdt(poisha(100)), 1);
  });

  it("rejects non-integer and non-finite amounts", () => {
    assert.throws(() => assertPoisha(10.5), /integer/i);
    assert.throws(() => assertPoisha(Number.NaN), /integer|finite/i);
    assert.throws(() => assertPoisha(Number.POSITIVE_INFINITY), /integer|finite/i);
    assert.throws(() => assertPoisha(-1), /negative/i);
  });

  it("accepts zero and large integers", () => {
    assert.equal(poisha(0).amountPoisha, 0);
    assertPoisha(999_999_999);
  });

  it("never produces a float through arithmetic", () => {
    const total = add(poisha(1999), poisha(3));
    assert.equal(Number.isInteger(total.amountPoisha), true);
    assert.equal(total.amountPoisha, 2002);

    const difference = subtract(poisha(2002), poisha(1999));
    assert.equal(difference.amountPoisha, 3);

    const tripled = multiply(poisha(333), 3);
    assert.equal(tripled.amountPoisha, 999);
    assert.equal(Number.isInteger(tripled.amountPoisha), true);
  });

  it("throws rather than silently corrupting on a fractional multiply", () => {
    // 1 poisha × 1.5 has no representation in minor units.
    assert.throws(() => multiply(poisha(1), 1.5), /integer|quantity/i);
  });
});

describe("rounding", () => {
  it("rounds half up, not half to even", () => {
    assert.equal(roundHalfUp(0.5), 1);
    assert.equal(roundHalfUp(1.5), 2);
    assert.equal(roundHalfUp(2.5), 3);
    assert.equal(roundHalfUp(-0.5), 0);
    assert.equal(roundHalfUp(0.4999), 0);
  });

  it("applies basis points with half-up rounding", () => {
    assert.equal(applyBasisPoints(10_000, 1000), 1000); // 10% of 100 BDT
    assert.equal(applyBasisPoints(1999, 1000), 200); // 199.9 -> 200
    assert.equal(applyBasisPoints(1, 1000), 0); // 0.1 -> 0
    assert.equal(applyBasisPoints(5, 5000), 3); // 2.5 -> 3 (half UP, not to even)
    assert.equal(applyBasisPoints(10_000, 0), 0);
    assert.equal(applyBasisPoints(10_000, 10_000), 10_000); // 100%
  });

  it("rejects out-of-range basis points", () => {
    assert.throws(() => applyBasisPoints(100, -1), /basis|range/i);
    assert.throws(() => applyBasisPoints(100, 10_001), /basis|range/i);
  });
});

describe("formatting", () => {
  it("formats with the Taka sign and en-BD (lakh) grouping", () => {
    assert.equal(formatBDT(100), "৳1");
    assert.equal(formatBDT(145_000), "৳1,450");
    assert.equal(formatBDT(10_000_000), "৳100,000");
    assert.equal(formatBDT(0), "৳0");
  });

  it("shows poisha only when asked for an exact figure", () => {
    assert.equal(formatBDT(12345, { exact: true }), "৳123.45");
    assert.equal(formatBDT(poisha(12345), { exact: true }), "৳123.45");
  });

  it("rounds a fractional amount half-up for display", () => {
    assert.equal(formatBDT(12350), "৳124");
    assert.equal(formatBDT(12349), "৳123");
    assert.equal(formatBDT(12250), "৳123"); // half UP, not half to even
  });
});

describe("effective monthly rate", () => {
  it("normalises a 365-day plan to a comparable monthly figure", () => {
    // 12,000 BDT for 365 days, normalised to a 30.4375-day month.
    assert.equal(effectiveMonthlyPoisha(1_200_000, 365), 100_068);
  });

  it("returns approximately the price for a 30-day plan", () => {
    // 30 days is 0.9856 of the 30.4375-day month used for normalisation.
    assert.equal(effectiveMonthlyPoisha(145_000, 30), 147_115);
  });

  it("produces an integer and never a float", () => {
    const value = effectiveMonthlyPoisha(199_999, 90);
    assert.equal(Number.isInteger(value), true);
  });

  it("refuses a zero or negative duration instead of dividing by zero", () => {
    assert.throws(() => effectiveMonthlyPoisha(1000, 0), /positive/i);
    assert.throws(() => effectiveMonthlyPoisha(1000, -30), /positive/i);
  });
});

describe("savings", () => {
  it("computes the absolute saving against a compare-at price", () => {
    assert.equal(savingsPoisha(120_000, 145_000), 25_000);
  });

  it("returns null when there is no compare-at price, or no saving", () => {
    assert.equal(savingsPoisha(120_000), null);
    assert.equal(savingsPoisha(145_000, 145_000), null);
    assert.equal(savingsPoisha(145_000, 120_000), null); // never a negative saving
  });

  it("computes the percentage saving as an integer", () => {
    // 25,000 / 145,000 = 17.24% -> 17
    assert.equal(savingsPercentPoisha(120_000, 145_000), 17);
    assert.equal(savingsPercentPoisha(120_000), null); // never an invented saving
  });
});

describe("VAT", () => {
  it("computes tax on the discounted amount in integer poisha", () => {
    assert.equal(taxPoisha(100_000, 500), 5_000); // 5%
    assert.equal(taxPoisha(100_000, 0), 0);
    assert.equal(Number.isInteger(taxPoisha(19_999, 750)), true);
  });
});

describe("discount ladder — the mandated order (§13.8)", () => {
  it("applies SALE before BUNDLE before STUDENT before COUPON regardless of input order", () => {
    const result = applyDiscounts(100_000, [
      { type: "COUPON", label: "Coupon WELCOME", basisPoints: 500 },
      { type: "STUDENT", label: "Student", basisPoints: 1000 },
      { type: "BUNDLE", label: "Bundle", fixedPoisha: 10_000 },
      { type: "SALE", label: "Sale", fixedPoisha: 5_000 },
    ]);

    assert.deepEqual(
      result.steps.map((step) => step.type),
      ["SALE", "BUNDLE", "STUDENT", "COUPON"],
    );

    // 100,000 − 5,000 (sale) = 95,000
    //         − 10,000 (bundle) = 85,000
    //         − 10% of 85,000 = 8,500 → 76,500
    //         − 5% of 76,500 = 3,825 → 72,675
    assert.equal(result.totalPoisha, 72_675);
    assert.deepEqual(
      result.steps.map((step) => step.amountPoisha),
      [5_000, 10_000, 8_500, 3_825],
    );
  });

  it("applies a percentage step to the RUNNING amount, not the original price", () => {
    // This is the bug a naive implementation makes: two 10% steps on 10,000
    // must give 8,100, not 8,000.
    const result = applyDiscounts(10_000, [
      { type: "STUDENT", label: "Student", basisPoints: 1000 },
      { type: "COUPON", label: "Coupon", basisPoints: 1000 },
    ]);
    assert.equal(result.totalPoisha, 8_100);
    assert.deepEqual(
      result.steps.map((step) => step.amountPoisha),
      [1_000, 900],
    );
  });

  it("enforces the price floor and reports that it clipped a step", () => {
    const result = applyDiscounts(
      10_000,
      [
        { type: "BUNDLE", label: "Bundle", fixedPoisha: 6_000 },
        { type: "COUPON", label: "Coupon", fixedPoisha: 6_000 },
      ],
      5_000, // floor
    );
    assert.equal(result.totalPoisha, 5_000);
    assert.equal(result.floorApplied, true);
    // The bundle step is CLIPPED to the available headroom, and the coupon
    // step then has no headroom left and is dropped.
    assert.deepEqual(
      result.steps.map((step) => step.amountPoisha),
      [5_000],
    );
    assert.deepEqual(
      result.steps.map((step) => step.type),
      ["BUNDLE"],
    );
  });

  it("never returns a negative or zero total from stacked discounts", () => {
    const result = applyDiscounts(1_000, [
      { type: "SALE", label: "Sale", fixedPoisha: 900 },
      { type: "BUNDLE", label: "Bundle", fixedPoisha: 900 },
      { type: "STUDENT", label: "Student", basisPoints: 10_000 },
      { type: "COUPON", label: "Coupon", basisPoints: 10_000 },
    ]);
    assert.ok(result.totalPoisha >= 0, "total must never be negative");
    assert.equal(result.totalPoisha, 0);
    assert.equal(Number.isInteger(result.totalPoisha), true);
  });

  it("drops a discount step that contributes nothing", () => {
    const result = applyDiscounts(10_000, [
      { type: "SALE", label: "Sale", fixedPoisha: 0 },
      { type: "COUPON", label: "Coupon", basisPoints: 0 },
    ]);
    assert.equal(result.steps.length, 0);
    assert.equal(result.totalPoisha, 10_000);
  });

  it("does not mutate the caller's discount array", () => {
    const discounts = [
      { type: "COUPON" as const, label: "Coupon", basisPoints: 500 },
      { type: "SALE" as const, label: "Sale", fixedPoisha: 100 },
    ];
    const before = discounts.map((discount) => discount.type);
    applyDiscounts(10_000, discounts);
    assert.deepEqual(
      discounts.map((discount) => discount.type),
      before,
    );
  });

  it("leaves the total unchanged when no discounts are supplied", () => {
    const result = applyDiscounts(145_000, []);
    assert.equal(result.totalPoisha, 145_000);
    assert.equal(result.floorApplied, false);
  });
});
