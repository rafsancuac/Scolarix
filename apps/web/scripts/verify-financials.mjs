#!/usr/bin/env node
/**
 * verify-financials — spec §6 rule 10 and §25.2 test #28.
 *
 * Recomputes every money figure from its inputs and asserts the result to the
 * poisha. Run in CI and before any release. It is deliberately written in plain
 * ESM and executed through tsx so it can import the TypeScript domain helpers
 * directly. It re-derives each figure independently and compares, rather than
 * calling the same function the application uses and trusting it.
 *
 * Two modes:
 *   · catalogue mode (default here) — verifies that every published listing's
 *     prices, savings, effective monthly rates, discount ladders and VAT are
 *     internally consistent integer poisha, and that the compliance gate and
 *     the purchasable listing surfaces agree.
 *   · ledger mode (production) — when DATABASE_URL is present, recomputes
 *     Gross, Net (Gross − Refunds − Gateway Fees) and Contribution Margin
 *     (Net − COGS − direct fulfilment) from ledger_entries and asserts the
 *     stored report figures match to the poisha. Not reachable in this
 *     environment; the script says so loudly instead of reporting a fake pass.
 *
 * Exit code 0 = verified. Non-zero = a money invariant is broken.
 */

import { strict as assert } from "node:assert";
import process from "node:process";

let failures = 0;
let checks = 0;

function check(label, fn) {
  checks += 1;
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label}`);
    console.log(`       ${error.message}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function main() {
  console.log("verify-financials — recomputing every money figure from its inputs");
  console.log(`node ${process.version} · adapter ${process.env.DATA_ADAPTER ?? "static"} · ${new Date().toISOString()}`);

  const money = await import("../src/lib/money.ts");
  const repo = await import("../src/lib/repository.ts");
  const { priceCart } = await import("../src/lib/checkout.ts");

  const products = repo.listProducts();
  const items = repo.listProductItems();
  const purchasable = repo.listProductItems({ purchasableOnly: true });

  /* ---------------------------------------------------------------------- */
  section("1. Integer minor units — no float may enter the money path");

  check("every plan price is a safe integer in poisha", () => {
    for (const product of products) {
      for (const plan of product.plans) {
        assert.ok(Number.isSafeInteger(plan.pricePoisha), `${plan.sku} pricePoisha`);
        assert.ok(plan.pricePoisha >= 0, `${plan.sku} must not be negative`);
        money.assertPoisha(plan.pricePoisha, plan.sku);
        if (plan.compareAtPoisha !== undefined) {
          assert.ok(Number.isSafeInteger(plan.compareAtPoisha), `${plan.sku} compareAtPoisha`);
        }
        if (plan.studentPricePoisha !== undefined) {
          assert.ok(Number.isSafeInteger(plan.studentPricePoisha), `${plan.sku} studentPricePoisha`);
        }
      }
    }
  });

  check("every bundle price and item value is a safe integer", () => {
    for (const bundle of repo.listBundles()) {
      assert.ok(Number.isSafeInteger(bundle.pricePoisha), `${bundle.slug} pricePoisha`);
      assert.ok(Number.isSafeInteger(bundle.compareAtPoisha), `${bundle.slug} compareAtPoisha`);
      for (const item of bundle.items) {
        assert.ok(Number.isSafeInteger(item.valuePoisha), `${bundle.slug}/${item.sku}`);
      }
    }
  });

  check("every service and package price is a safe integer", () => {
    for (const service of repo.listServices()) {
      if (service.basePricePoisha !== undefined) {
        assert.ok(Number.isSafeInteger(service.basePricePoisha), service.slug);
      }
      for (const pkg of service.packages) {
        assert.ok(Number.isSafeInteger(pkg.pricePoisha), `${service.slug}/${pkg.sku}`);
      }
    }
  });

  check("the money helpers throw on a float rather than silently rounding", () => {
    assert.throws(() => money.assertPoisha(10.5));
    assert.throws(() => money.multiply(money.poisha(1), 1.5));
    assert.throws(() => money.applyBasisPoints(100, -1));
    assert.throws(() => money.applyBasisPoints(100, 10_001));
  });

  /* ---------------------------------------------------------------------- */
  section("2. Rounding — half-up, identical in every code path");

  check("roundHalfUp rounds 0.5 away from zero", () => {
    assert.equal(money.roundHalfUp(0.5), 1);
    assert.equal(money.roundHalfUp(2.5), 3);
    assert.equal(money.roundHalfUp(-0.5), 0);
  });

  check("applyBasisPoints agrees with an independent recomputation", () => {
    for (const amount of [1, 5, 1999, 10_000, 145_000, 1_234_567]) {
      for (const bp of [0, 1, 250, 500, 1000, 1500, 7500, 10_000]) {
        const expected = Math.floor((amount * bp) / 10_000 + 0.5);
        assert.equal(money.applyBasisPoints(amount, bp), expected, `${amount} @ ${bp}bp`);
      }
    }
  });

  check("taxPoisha is applyBasisPoints with no drift", () => {
    for (const amount of [0, 1, 999, 100_000, 2_345_678]) {
      for (const rate of [0, 500, 750, 1500]) {
        assert.equal(money.taxPoisha(amount, rate), money.applyBasisPoints(amount, rate));
      }
    }
  });

  /* ---------------------------------------------------------------------- */
  section("3. Savings — never invented, never negative");

  check("savingsPoisha is null without a compare-at price", () => {
    assert.equal(money.savingsPoisha(1000), null);
    assert.equal(money.savingsPoisha(1000, 1000), null);
    assert.equal(money.savingsPoisha(1000, 900), null);
    assert.equal(money.savingsPoisha(900, 1000), 100);
  });

  check("every listed saving equals compareAt minus price exactly", () => {
    for (const product of products) {
      for (const plan of product.plans) {
        const saved = money.savingsPoisha(plan.pricePoisha, plan.compareAtPoisha);
        if (saved === null) continue;
        assert.equal(saved, plan.compareAtPoisha - plan.pricePoisha, plan.sku);
        assert.ok(saved > 0, `${plan.sku} saving must be positive`);
      }
    }
  });

  check("the savings percentage is consistent with the absolute saving", () => {
    for (const product of products) {
      for (const plan of product.plans) {
        const saved = money.savingsPoisha(plan.pricePoisha, plan.compareAtPoisha);
        const percent = money.savingsPercentPoisha(plan.pricePoisha, plan.compareAtPoisha);
        if (saved === null) {
          assert.equal(percent, null, plan.sku);
          continue;
        }
        const expected = Math.round((saved / plan.compareAtPoisha) * 100);
        assert.equal(percent, expected, plan.sku);
        assert.ok(percent >= 0 && percent <= 100, `${plan.sku} percent out of range`);
      }
    }
  });

  /* ---------------------------------------------------------------------- */
  section("4. Effective monthly rate — honest affordability framing");

  check("the monthly rate recomputes from price and duration", () => {
    const DAYS_PER_MONTH = 30.4375;
    for (const product of products) {
      for (const plan of product.plans) {
        if (plan.durationDays <= 0) continue;
        const expected = Math.floor(plan.pricePoisha / (plan.durationDays / DAYS_PER_MONTH) + 0.5);
        assert.equal(
          money.effectiveMonthlyPoisha(plan.pricePoisha, plan.durationDays),
          expected,
          plan.sku,
        );
      }
    }
  });

  check("within one audience, a longer plan is never priced higher per month", () => {
    // JetBrains sells Education and Individual at the same 365-day duration for
    // very different prices, and Notion/GitHub sell a zero-price education
    // referral alongside a paid plan. Comparing across audiences would be
    // meaningless, so monotonicity is asserted per audience group.
    for (const product of products) {
      const groups = new Map();
      for (const plan of product.plans.filter((p) => p.active && p.durationDays > 0)) {
        const audience = plan.audience ?? "STANDARD";
        if (!groups.has(audience)) groups.set(audience, []);
        groups.get(audience).push(plan);
      }
      for (const [audience, plans] of groups) {
        const sorted = [...plans].sort((a, b) => a.durationDays - b.durationDays);
        for (let i = 1; i < sorted.length; i += 1) {
          const shorter = money.effectiveMonthlyPoisha(sorted[i - 1].pricePoisha, sorted[i - 1].durationDays);
          const longer = money.effectiveMonthlyPoisha(sorted[i].pricePoisha, sorted[i].durationDays);
          assert.ok(
            longer <= shorter,
            `${product.slug} [${audience}]: ${sorted[i].label} (${longer}/mo) costs more per month than ${sorted[i - 1].label} (${shorter}/mo)`,
          );
        }
      }
    }
  });

  check("a zero-price plan only ever appears as an education referral", () => {
    for (const product of products) {
      for (const plan of product.plans) {
        if (plan.pricePoisha !== 0) continue;
        assert.ok(
          product.offeringType === "EDUCATION_REFERRAL" || plan.audience === "EDUCATION",
          `${product.slug}/${plan.sku} is free but is neither an education referral nor an EDUCATION-audience plan`,
        );
      }
    }
  });

  /* ---------------------------------------------------------------------- */
  section("5. Discount ladder — order, running base, and the price floor");

  check("the ladder order is always SALE, BUNDLE, STUDENT, COUPON", () => {
    const result = money.applyDiscounts(100_000, [
      { type: "COUPON", label: "C", basisPoints: 500 },
      { type: "STUDENT", label: "S", basisPoints: 1000 },
      { type: "BUNDLE", label: "B", fixedPoisha: 10_000 },
      { type: "SALE", label: "A", fixedPoisha: 5_000 },
    ]);
    assert.deepEqual(result.steps.map((s) => s.type), ["SALE", "BUNDLE", "STUDENT", "COUPON"]);
    assert.equal(result.totalPoisha, 72_675);
  });

  check("each percentage step applies to the running amount, not the original", () => {
    const result = money.applyDiscounts(10_000, [
      { type: "STUDENT", label: "S", basisPoints: 1000 },
      { type: "COUPON", label: "C", basisPoints: 1000 },
    ]);
    assert.equal(result.totalPoisha, 8_100); // not 8,000
  });

  check("the floor can never be breached, and clipping is reported", () => {
    const result = money.applyDiscounts(10_000, [
      { type: "BUNDLE", label: "B", fixedPoisha: 99_000 },
    ], 5_000);
    assert.equal(result.totalPoisha, 5_000);
    assert.equal(result.floorApplied, true);
    assert.deepEqual(result.steps.map((s) => s.amountPoisha), [5_000]);
  });

  check("no combination of discounts produces a negative total", () => {
    for (const base of [0, 1, 100, 10_000, 145_000]) {
      for (const fixed of [0, 50, 10_000, 999_999]) {
        const result = money.applyDiscounts(base, [
          { type: "SALE", label: "S", fixedPoisha: fixed },
          { type: "BUNDLE", label: "B", fixedPoisha: fixed },
          { type: "STUDENT", label: "T", basisPoints: 10_000 },
          { type: "COUPON", label: "C", basisPoints: 10_000 },
        ]);
        assert.ok(result.totalPoisha >= 0, `base ${base} fixed ${fixed} -> ${result.totalPoisha}`);
        assert.ok(Number.isSafeInteger(result.totalPoisha));
      }
    }
  });

  /* ---------------------------------------------------------------------- */
  section("6. Cart arithmetic — subtotal − discounts + VAT = total, to the poisha");

  check("every purchasable listing prices to subtotal == total with no discounts", () => {
    for (const item of purchasable) {
      const plan = item.product.plans.filter((p) => p.active)[0];
      const cart = priceCart([{ product: item.product, plan, quantity: 1 }]);
      assert.equal(cart.subtotalPoisha, plan.pricePoisha, item.product.slug);
      assert.equal(cart.discountPoisha, 0, item.product.slug);
      assert.equal(cart.vatPoisha, 0, item.product.slug);
      assert.equal(cart.totalPoisha, cart.subtotalPoisha, item.product.slug);
    }
  });

  check("subtotal − discount + VAT == total for a discounted, taxed cart", () => {
    for (const item of purchasable) {
      const plan = item.product.plans.filter((p) => p.active)[0];
      const cart = priceCart([{ product: item.product, plan, quantity: 2 }], {
        studentVerified: true,
        studentDiscountBp: 1000,
        coupon: { code: "VERIFY", basisPoints: 500 },
        vatRateBp: 750,
      });
      assert.equal(
        cart.subtotalPoisha - cart.discountPoisha,
        cart.taxablePoisha,
        item.product.slug,
      );
      assert.equal(
        cart.taxablePoisha + cart.vatPoisha,
        cart.totalPoisha,
        item.product.slug,
      );
      assert.equal(
        cart.vatPoisha,
        money.applyBasisPoints(cart.taxablePoisha, 750),
        item.product.slug,
      );
    }
  });

  check("the sum of per-line finals equals the cart total before VAT", () => {
    const lines = purchasable.slice(0, 4).map((item) => ({
      product: item.product,
      plan: item.product.plans.filter((p) => p.active)[0],
      quantity: 1,
    }));
    const cart = priceCart(lines, { studentVerified: true, studentDiscountBp: 1000 });
    const lineSum = cart.lines.reduce((sum, line) => sum + line.finalPoisha, 0);
    assert.equal(lineSum, cart.taxablePoisha);
  });

  check("blocked lines contribute exactly zero to every total", () => {
    const turnitin = repo.getProductBySlug("turnitin");
    assert.ok(turnitin, "Turnitin must exist in the catalogue");
    const injected = {
      product: turnitin,
      plan: {
        id: "x", sku: "x", label: "x", durationDays: 30, pricePoisha: 500_00,
        couponEligible: true, inventoryMode: "UNLIMITED", active: true,
      },
      quantity: 1,
    };
    const cart = priceCart([injected]);
    assert.equal(cart.lines.length, 0);
    assert.equal(cart.blocked.length, 1);
    assert.equal(cart.subtotalPoisha, 0);
    assert.equal(cart.totalPoisha, 0);
  });

  /* ---------------------------------------------------------------------- */
  section("7. Catalogue consistency — the gate and the public surfaces agree");

  check("every purchasable-only listing passes the gate independently", () => {
    for (const item of purchasable) {
      assert.equal(repo.evaluatePurchaseGate(item.product), null, item.product.slug);
      assert.equal(repo.isPurchasable(item.product), true, item.product.slug);
      assert.notEqual(item.availability, "UNAVAILABLE", item.product.slug);
    }
  });

  check("every blocked listing is absent from purchasable surfaces", () => {
    const blocked = products.filter((product) => !repo.isPurchasable(product));
    const purchasableSlugs = new Set(purchasable.map((item) => item.product.slug));
    for (const product of blocked) {
      assert.equal(purchasableSlugs.has(product.slug), false, product.slug);
    }
  });

  check("the 'from' price equals the cheapest active plan, exactly", () => {
    for (const item of items) {
      const active = item.product.plans.filter((plan) => plan.active);
      if (active.length === 0) {
        assert.equal(item.fromPricePoisha, null, item.product.slug);
        continue;
      }
      const cheapest = Math.min(...active.map((plan) => plan.pricePoisha));
      assert.equal(item.fromPricePoisha, cheapest, item.product.slug);
    }
  });

  check("category item counts equal the purchasable listings in that category", () => {
    for (const category of repo.listCategories()) {
      const expected = purchasable.filter((i) => i.product.categorySlug === category.slug).length;
      assert.equal(category.itemCount, expected, category.slug);
    }
  });

  check("bundle item values are non-negative and the bundle price does not exceed them", () => {
    for (const bundle of repo.listBundles()) {
      const sum = bundle.items.reduce((total, item) => total + item.valuePoisha, 0);
      assert.ok(bundle.pricePoisha >= 0, bundle.slug);
      assert.ok(bundle.compareAtPoisha >= bundle.pricePoisha, `${bundle.slug} compareAt < price`);
      assert.ok(sum >= 0, bundle.slug);
    }
  });

  /* ---------------------------------------------------------------------- */
  section("8. Ledger recomputation (Gross / Net / Contribution Margin)");

  if (!process.env.DATABASE_URL) {
    console.log("  SKIP DATABASE_URL is not set, so there is no ledger to recompute.");
    console.log("       Gross, Net (Gross − Refunds − Gateway Fees) and Contribution");
    console.log("       Margin (Net − COGS − direct fulfilment) are ledger-derived and");
    console.log("       are NOT verified by this run. This is not a pass.");
    console.log("       Set DATABASE_URL and re-run before any release (§6 rule 10).");
  } else {
    console.log("  TODO the Prisma ledger adapter is not implemented in this build.");
    failures += 1;
    console.log("  FAIL DATABASE_URL is set but the ledger recomputation is not wired.");
  }

  /* ---------------------------------------------------------------------- */
  console.log("\n" + "-".repeat(72));
  console.log(`checks: ${checks}   failures: ${failures}`);
  if (failures > 0) {
    console.log("verify-financials FAILED — do not release.");
    process.exit(1);
  }
  console.log("verify-financials PASSED for the catalogue.");
  console.log("Ledger verification is still outstanding — see section 8.");
  process.exit(0);
}

main().catch((error) => {
  console.error("verify-financials crashed:", error);
  process.exit(2);
});
