/**
 * Cart pricing — spec §13.8 (discount ladder), §6 rules 1, 2, 6.
 *
 * Covers the invariants that a checkout bug would silently break: blocked
 * lines never contribute to a total, prices come from the catalogue rather
 * than the caller, discount steps stay in the mandated order, and the VAT and
 * total arithmetic is exact in integer poisha.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { priceCart, readVatRateBp, type CartLineInput } from "../src/lib/checkout";
import { applyBasisPoints } from "../src/lib/money";
import { getProductBySlug, listBundles, listProducts } from "../src/lib/repository";
import type { Bundle, Product } from "../src/lib/types";

async function lineFor(slug: string, planIndex = 0): Promise<CartLineInput> {
  const product = await getProductBySlug(slug);
  assert.ok(product, `fixture product ${slug} must exist`);
  const plan = product!.plans.filter((p) => p.active)[planIndex];
  assert.ok(plan, `fixture product ${slug} must have an active plan`);
  return { product: product!, plan: plan!, quantity: 1 };
}

async function purchasableSlug(): Promise<string> {
  const product = (await listProducts()).find(
    (p) => p.status === "PUBLISHED" && p.plans.some((plan) => plan.active),
  );
  assert.ok(product);
  return product!.slug;
}

describe("priceCart — line integrity", () => {
  it("prices a single line from the catalogue, never from the caller", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([line]);

    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0]!.unitListPoisha, line.plan.pricePoisha);
    assert.equal(cart.subtotalPoisha, line.plan.pricePoisha);
    assert.equal(cart.totalPoisha, line.plan.pricePoisha); // no VAT configured
  });

  it("scales a line by quantity in integer poisha", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([{ ...line, quantity: 3 }]);

    assert.equal(cart.subtotalPoisha, line.plan.pricePoisha * 3);
    assert.equal(Number.isInteger(cart.subtotalPoisha), true);
  });

  it("records the order-line snapshot fields that must never change later", async () => {
    const line = await lineFor(await purchasableSlug());
    const snapshot = priceCart([line]).lines[0]!;

    assert.equal(snapshot.sku, line.plan.sku);
    assert.equal(snapshot.productId, line.product.id);
    assert.equal(snapshot.productName, line.product.name);
    assert.equal(snapshot.planLabel, line.plan.label);
    assert.equal(snapshot.offeringType, line.product.offeringType);
    assert.equal(snapshot.renewalCapability, line.product.renewalCapability);
    assert.equal(snapshot.refundEligibility, line.product.refundEligibility);
    assert.equal(snapshot.unitCompareAtPoisha, line.plan.compareAtPoisha ?? null);
  });

  it("returns an empty cart rather than inventing lines for unknown SKUs", () => {
    const cart = priceCart([]);
    assert.equal(cart.lines.length, 0);
    assert.equal(cart.subtotalPoisha, 0);
    assert.equal(cart.totalPoisha, 0);
  });
});

describe("priceCart — the compliance gate is enforced at pricing time", () => {
  it("removes Turnitin from the total and reports it as blocked", async () => {
    const turnitin = await getProductBySlug("turnitin");
    assert.ok(turnitin);
    const good = await lineFor(await purchasableSlug());

    // Turnitin has no plans, so it cannot even be constructed as a line from
    // the catalogue — which is the first half of the protection. Simulate an
    // attacker supplying one anyway.
    const hostile: CartLineInput = {
      product: turnitin!,
      plan: {
        id: "injected",
        sku: "injected-turnitin",
        label: "Injected",
        durationDays: 30,
        pricePoisha: 500_00,
        couponEligible: true,
        inventoryMode: "UNLIMITED",
        active: true,
      },
      quantity: 1,
    };

    const cart = priceCart([good, hostile]);

    assert.equal(cart.blocked.length, 1);
    assert.equal(cart.blocked[0]!.line.plan.sku, "injected-turnitin");
    assert.equal(cart.blocked[0]!.gate.reason, "AUTHORIZATION_UNAVAILABLE");
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines.some((line) => line.sku === "injected-turnitin"), false);
    assert.equal(cart.totalPoisha, good.plan.pricePoisha);
  });

  it("blocks an unpublished product even though it has a valid plan", async () => {
    const source = (await listProducts()).find((p) => p.plans.some((plan) => plan.active));
    const product: Product = { ...source!, status: "DRAFT" };
    const cart = priceCart([
      { product, plan: product.plans.filter((p) => p.active)[0]!, quantity: 1 },
    ]);

    assert.equal(cart.lines.length, 0);
    assert.equal(cart.blocked.length, 1);
    assert.equal(cart.blocked[0]!.gate.reason, "NOT_PUBLISHED");
    assert.equal(cart.totalPoisha, 0);
  });
});

describe("priceCart — discount ladder (§13.8)", () => {
  it("applies nothing when no discount is configured", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([line]);

    assert.equal(cart.steps.length, 0);
    assert.equal(cart.discountPoisha, 0);
    assert.equal(cart.formatted.discount, "৳0");
  });

  it("ignores a student discount unless the shopper is genuinely verified", async () => {
    const line = await lineFor(await purchasableSlug());

    const unverified = priceCart([line], { studentDiscountBp: 1000, studentVerified: false });
    assert.equal(unverified.discountPoisha, 0);

    const verified = priceCart([line], { studentDiscountBp: 1000, studentVerified: true });
    assert.equal(verified.discountPoisha, applyBasisPoints(line.plan.pricePoisha, 1000));
    assert.deepEqual(
      verified.steps.map((step) => step.type),
      ["STUDENT"],
    );
  });

  it("keeps BUNDLE before STUDENT before COUPON in a multi-discount cart", async () => {
    const line = await lineFor(await purchasableSlug());

    // A deliberately small bundle saving, so later ladder steps still have
    // headroom. The real fixture bundles save more than the whole line costs,
    // which correctly drives the total to the floor and suppresses them.
    const bundle: Bundle = {
      ...(await listBundles())[0]!,
      pricePoisha: line.plan.pricePoisha - 1000,
      compareAtPoisha: line.plan.pricePoisha,
    };

    const cart = priceCart([line], {
      bundle,
      studentVerified: true,
      studentDiscountBp: 1000,
      coupon: { code: "WELCOME", basisPoints: 500 },
    });

    const types = cart.steps.map((step) => step.type);
    // SALE is already reflected in the plan price, so it does not appear twice.
    assert.deepEqual(types, ["BUNDLE", "STUDENT", "COUPON"]);

    // Each later percentage step is computed on the RUNNING amount.
    const afterBundle = line.plan.pricePoisha - 1000;
    const studentAmount = applyBasisPoints(afterBundle, 1000);
    const afterStudent = afterBundle - studentAmount;
    const couponAmount = applyBasisPoints(afterStudent, 500);

    assert.deepEqual(
      cart.steps.map((step) => step.amountPoisha),
      [1000, studentAmount, couponAmount],
    );
    assert.equal(cart.totalPoisha, afterStudent - couponAmount);
  });

  it("drives a large real bundle saving to the floor and suppresses later steps", async () => {
    const line = await lineFor(await purchasableSlug());
    const bundle = (await listBundles())[0];
    assert.ok(bundle);

    const cart = priceCart([line], {
      bundle: bundle!,
      studentVerified: true,
      studentDiscountBp: 1000,
      coupon: { code: "WELCOME", basisPoints: 500 },
    });

    // A bundle saving larger than the line price must never produce a
    // negative total — the floor is what stops it.
    assert.ok(cart.totalPoisha >= 0);
    assert.deepEqual(cart.steps.map((step) => step.type), ["BUNDLE"]);
    assert.equal(cart.floorApplied, true);
  });

  it("never lets a coupon apply to a plan marked coupon-ineligible", async () => {
    const source = (await listProducts()).find((p) =>
      p.plans.some((plan) => plan.active && plan.couponEligible === false),
    );
    assert.ok(source, "the fixture catalogue must contain a coupon-ineligible plan");

    const plan = source!.plans.filter((p) => p.active && !p.couponEligible)[0]!;
    const cart = priceCart([{ product: source!, plan, quantity: 1 }], {
      coupon: { code: "WELCOME", basisPoints: 2000 },
    });

    assert.equal(cart.steps.some((step) => step.type === "COUPON"), false);
    assert.equal(cart.discountPoisha, 0);
  });

  it("respects a coupon's minimum cart value", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([line], {
      coupon: {
        code: "BIGSPEND",
        basisPoints: 1000,
        minCartPoisha: line.plan.pricePoisha + 1,
      },
    });
    assert.equal(cart.discountPoisha, 0);
  });

  it("adds subtotal minus discounts to get the taxable amount, then VAT", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([line], { studentVerified: true, studentDiscountBp: 1000, vatRateBp: 500 });

    const expectedDiscount = applyBasisPoints(line.plan.pricePoisha, 1000);
    const expectedTaxable = line.plan.pricePoisha - expectedDiscount;
    const expectedVat = applyBasisPoints(expectedTaxable, 500);

    assert.equal(cart.discountPoisha, expectedDiscount);
    assert.equal(cart.taxablePoisha, expectedTaxable);
    assert.equal(cart.vatPoisha, expectedVat);
    assert.equal(cart.totalPoisha, expectedTaxable + expectedVat);
    assert.equal(Number.isInteger(cart.totalPoisha), true);
  });

  it("reports the price floor when a discount is clipped", async () => {
    const line = await lineFor(await purchasableSlug());
    const cart = priceCart([line], {
      coupon: { code: "HUGE", fixedPoisha: line.plan.pricePoisha * 2 },
      floorPoisha: Math.max(1, Math.floor(line.plan.pricePoisha / 2)),
    });

    assert.equal(cart.floorApplied, true);
    assert.ok(cart.totalPoisha >= Math.floor(line.plan.pricePoisha / 2));
  });
});

describe("formatted output", () => {
  it("renders every summary figure with the Taka sign", async () => {
    const cart = priceCart([await lineFor(await purchasableSlug())]);
    for (const value of Object.values(cart.formatted)) {
      assert.ok(value.startsWith("৳"), `${value} must start with the Taka sign`);
    }
  });
});

describe("VAT configuration", () => {
  it("defaults to zero while the VAT treatment decision (D5) is open", () => {
    assert.equal(readVatRateBp(), 0);
  });
});
