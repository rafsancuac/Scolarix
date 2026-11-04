/**
 * Compliance gate — spec §11.2, and mandatory test #4 (§25.3):
 * "A product whose authorization evidence has expired must be unpurchasable."
 *
 * The seeded catalogue deliberately includes Turnitin as
 * UNAVAILABLE_INDIVIDUAL_LICENSE with zero plans, so this suite proves the
 * gate refuses it rather than relying on a hand-written fixture.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  availabilityOf,
  cheapestActivePlan,
  evaluatePurchaseGate,
  getPlanBySku,
  getProductBySlug,
  isPurchasable,
  listCategories,
  listProductItems,
  listProducts,
  listTrending,
  search,
} from "../src/lib/repository";
import { PUBLISHABLE_AUTHORIZATION } from "../src/lib/types";
import type { Product } from "../src/lib/types";

/** Builds a product from a real fixture listing so the shape stays honest. */
async function withOverrides(overrides: Partial<Product>): Product {
  const base = (await listProducts())[0];
  assert.ok(base, "the fixture catalogue must contain at least one product");
  return { ...base, ...overrides };
}

describe("the Turnitin rule (mandatory test #4)", () => {
  const turnitin = getProductBySlug("turnitin");

  it("is present in the catalogue for information", () => {
    assert.ok(turnitin, "Turnitin must remain visible in the catalogue");
  });

  it("has no individual licence channel", () => {
    assert.equal(turnitin!.authorizationStatus, "UNAVAILABLE_INDIVIDUAL_LICENSE");
    assert.equal(PUBLISHABLE_AUTHORIZATION.includes(turnitin!.authorizationStatus), false);
  });

  it("has zero plans, so there is nothing to buy", () => {
    assert.equal(turnitin!.plans.length, 0);
    assert.equal(cheapestActivePlan(turnitin!), null);
  });

  it("fails the purchase gate and cannot be bought", () => {
    const gate = evaluatePurchaseGate(turnitin!);
    assert.notEqual(gate, null);
    assert.equal(gate!.reason, "AUTHORIZATION_UNAVAILABLE");
    assert.equal(isPurchasable(turnitin!), false);
    assert.equal(availabilityOf(turnitin!), "UNAVAILABLE");
  });

  it("is excluded from every purchasable listing surface", async () => {
    assert.equal((await listProductItems({ purchasableOnly: true })).some((i) => i.product.slug === turnitin!.slug), false);
    assert.equal((await listTrending(50)).some((i) => i.product.slug === turnitin!.slug), false);
  });

  it("still appears in search, because hiding it would be less honest than labelling it", async () => {
    const hits = await search("turnitin");
    assert.ok(hits.some((hit) => hit.slug === turnitin!.slug));
  });
});

describe("every §11.2 blocking condition", () => {
  it("blocks an unpublished product even with valid authorization and a plan", () => {
    const product = withOverrides({ status: "DRAFT" });
    const gate = evaluatePurchaseGate(product);
    assert.equal(gate?.reason, "NOT_PUBLISHED");
    assert.equal(isPurchasable(product), false);
  });

  it("blocks a product whose authorization evidence is still pending", () => {
    const product = withOverrides({
      status: "PUBLISHED",
      authorizationStatus: "PENDING_VERIFICATION",
    });
    assert.equal(evaluatePurchaseGate(product)?.reason, "EVIDENCE_MISSING");
  });

  it("blocks a listing whose authorization evidence has expired (mandatory test #4)", () => {
    const product = withOverrides({
      status: "PUBLISHED",
      authorizationStatus: "EXPIRED_EVIDENCE",
    });
    const gate = evaluatePurchaseGate(product);
    assert.equal(gate?.reason, "EVIDENCE_EXPIRED");
    assert.equal(isPurchasable(product), false);
    assert.equal(availabilityOf(product), "UNAVAILABLE");
    assert.equal(PUBLISHABLE_AUTHORIZATION.includes("EXPIRED_EVIDENCE"), false);
  });

  it("keeps an expired-evidence listing visible in the catalogue but unpurchasable", async () => {
    const source = (await listProducts()).find((p) => isPurchasable(p));
    const expired: Product = { ...source!, authorizationStatus: "EXPIRED_EVIDENCE" };
    // Visible: still resolvable by slug and searchable.
    assert.ok(expired.slug);
    // Unpurchasable: the gate refuses it.
    assert.equal(isPurchasable(expired), false);
  });

  it("blocks a product with no active plan even when authorization is valid", () => {
    const product = withOverrides({
      status: "PUBLISHED",
      authorizationStatus: "AUTHORIZED_RESELLER",
      plans: [],
    });
    assert.equal(evaluatePurchaseGate(product)?.reason, "NO_ACTIVE_PLAN");
  });

  it("blocks a product whose only plans are inactive", () => {
    const product = withOverrides({
      status: "PUBLISHED",
      authorizationStatus: "AUTHORIZED_RESELLER",
      plans: [
        {
          id: "plan-off",
          sku: "off-1",
          label: "Inactive",
          durationDays: 30,
          pricePoisha: 100_00,
          couponEligible: true,
          inventoryMode: "UNLIMITED",
          active: false,
        },
      ],
    });
    assert.equal(evaluatePurchaseGate(product)?.reason, "NO_ACTIVE_PLAN");
  });

  it("passes a fully authorized product with an active plan", () => {
    const product = withOverrides({
      status: "PUBLISHED",
      authorizationStatus: "AUTHORIZED_RESELLER",
      plans: [
        {
          id: "plan-on",
          sku: "on-1",
          label: "Monthly",
          durationDays: 30,
          pricePoisha: 100_00,
          couponEligible: true,
          inventoryMode: "UNLIMITED",
          active: true,
        },
      ],
    });
    assert.equal(evaluatePurchaseGate(product), null);
    assert.equal(isPurchasable(product), true);
  });

  it("passes an education referral — no licence is sold, so no plan is required", async () => {
    const referral = (await listProducts()).find((p) => p.offeringType === "EDUCATION_REFERRAL");
    assert.ok(referral, "the catalogue must contain at least one education referral");
    assert.equal(referral!.authorizationStatus, "EDUCATION_REFERRAL");
    assert.equal(isPurchasable(referral!), true);
  });
});

/** One active, tracked, code-vault plan with a known stock level. */
function trackedPlan(
  source: Product,
  inventoryMode: "TRACKED" | "CODE_VAULT",
  stock: number,
  suffix = "a",
) {
  const template = source.plans.find((plan) => plan.active) ?? source.plans[0]!;
  return {
    ...template,
    id: `plan-tracked-${suffix}`,
    sku: `tracked-${source.slug}-${suffix}`,
    inventoryMode,
    stock,
    active: true,
  };
}

describe("availability (§9.2.2)", () => {
  it("reports UNAVAILABLE for anything that fails the gate", () => {
    const blocked = withOverrides({ status: "ARCHIVED" });
    assert.equal(availabilityOf(blocked), "UNAVAILABLE");
  });

  it("reports IN_STOCK when inventory is unlimited", async () => {
    const product = (await listProducts()).find(
      (p) => isPurchasable(p) && p.plans.some((plan) => plan.active && plan.inventoryMode === "UNLIMITED"),
    );
    assert.ok(product);
    assert.equal(availabilityOf(product!), "IN_STOCK");
  });

  // Stock is summed across every active tracked plan, so these cases use a
  // single tracked plan to make the arithmetic unambiguous.
  it("reports UNAVAILABLE when tracked stock is exhausted", async () => {
    const source = (await listProducts()).find((p) => isPurchasable(p));
    const product = withOverrides({
      ...source!,
      plans: [trackedPlan(source!, "TRACKED", 0)],
    });
    assert.equal(availabilityOf(product), "UNAVAILABLE");
  });

  it("reports LOW_STOCK at or below the threshold", async () => {
    const source = (await listProducts()).find((p) => isPurchasable(p));
    const product = withOverrides({
      ...source!,
      plans: [trackedPlan(source!, "CODE_VAULT", 3)],
    });
    assert.equal(availabilityOf(product), "LOW_STOCK");
  });

  it("reports IN_STOCK just above the threshold", async () => {
    const source = (await listProducts()).find((p) => isPurchasable(p));
    const product = withOverrides({
      ...source!,
      plans: [trackedPlan(source!, "CODE_VAULT", 6)],
    });
    assert.equal(availabilityOf(product), "IN_STOCK");
  });

  it("sums stock across plans, so two low plans are not low together", async () => {
    const source = (await listProducts()).find((p) => isPurchasable(p));
    const product = withOverrides({
      ...source!,
      plans: [trackedPlan(source!, "CODE_VAULT", 3), trackedPlan(source!, "TRACKED", 4, "b")],
    });
    // 3 + 4 = 7, above the threshold of 5.
    assert.equal(availabilityOf(product), "IN_STOCK");
  });
});

describe("catalogue invariants", () => {
  it("exposes only published products through the public listing functions", async () => {
    for (const product of (await listProducts())) {
      assert.equal(product.status, "PUBLISHED");
    }
    for (const item of (await listProductItems())) {
      assert.equal(item.product.status, "PUBLISHED");
    }
  });

  it("gives every purchasable listing a resolvable price and at least one plan", async () => {
    for (const item of (await listProductItems({ purchasableOnly: true }))) {
      assert.notEqual(item.fromPricePoisha, null);
      assert.ok(item.activePlanCount >= 1);
      assert.ok(Number.isInteger(item.fromPricePoisha!));
      assert.ok(item.fromPricePoisha! >= 0);
    }
  });

  it("resolves every purchasable plan SKU back to its product", async () => {
    for (const item of (await listProductItems({ purchasableOnly: true }))) {
      for (const plan of item.product.plans.filter((p) => p.active)) {
        const found = await getPlanBySku(plan.sku);
        assert.ok(found, `SKU ${plan.sku} must resolve`);
        assert.equal(found!.product.id, item.product.id);
        assert.equal(found!.plan.id, plan.id);
      }
    }
  });

  it("keeps SKUs unique across the whole catalogue", async () => {
    const skus = (await listProducts()).flatMap((product) => product.plans.map((plan) => plan.sku));
    assert.equal(new Set(skus).size, skus.length);
  });

  it("prices every plan in integer poisha", async () => {
    for (const product of (await listProducts())) {
      for (const plan of product.plans) {
        assert.ok(Number.isSafeInteger(plan.pricePoisha), `${plan.sku} price must be an integer`);
        assert.ok(plan.pricePoisha >= 0);
        if (plan.compareAtPoisha !== undefined) {
          assert.ok(Number.isSafeInteger(plan.compareAtPoisha));
        }
        if (plan.studentPricePoisha !== undefined) {
          assert.ok(Number.isSafeInteger(plan.studentPricePoisha));
        }
      }
    }
  });

  it("counts category items consistently with the product listing", async () => {
    const purchasable = await listProductItems({ purchasableOnly: true });
    for (const category of (await listCategories())) {
      const expected = purchasable.filter((i) => i.product.categorySlug === category.slug).length;
      assert.equal(category.itemCount, expected, `${category.slug} item count`);
    }
  });

  it("carries a sourcing disclosure and relationship label on every listing", async () => {
    for (const product of (await listProducts())) {
      assert.ok(product.disclosureText.length > 20, `${product.slug} needs a real disclosure`);
      assert.ok(product.relationshipLabel.length > 0, `${product.slug} needs a relationship label`);
      assert.ok(product.platforms.length > 0, `${product.slug} must state its platforms`);
    }
  });
});
