/**
 * Checkout — spec §8.2 `/checkout`, §13.4–§13.8, §6 rules 1–2 and 6.
 *
 * What this page does:
 *   · Reads SKUs from the query string, resolves every price SERVER-SIDE from
 *     the catalogue and re-runs the compliance gate on each line (§11.2).
 *     Nothing the browser sent is trusted as a price.
 *   · Prices through `priceCart`, which applies the fixed discount ladder
 *     Sale → Bundle → Student → Coupon with the price floor (§13.8).
 *   · Renders the order-line snapshot fields exactly as they will be
 *     persisted, so an old order's price can never change (§6 rule 2).
 *
 * What this page does NOT do:
 *   · It does not fake a payment. With no gateway credential configured it
 *     renders an explicit "payment not connected" notice instead of a button
 *     that pretends to succeed (§28.5, FINAL RULES).
 *   · It never collects a card number, PIN or OTP — payment happens on the
 *     gateway's own hosted page (§19.4).
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Badge, OfferingTypeBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";
import { formatBDT } from "@/lib/money";
import { formatDurationDays } from "@/lib/format";
import { REFUND_LABEL, RENEWAL_LABEL } from "@/lib/types";
import { getBundleBySlug, getPlanBySku } from "@/lib/repository";
import {
  COUPON_CONFIGURED,
  PAYMENT_CONNECTED,
  STUDENT_DISCOUNT_CONFIGURED,
  priceCart,
  studentDiscountBp,
  type CartLineInput,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

interface CheckoutParams {
  sku?: string | string[];
  bundle?: string;
  coupon?: string;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutParams>;
}) {
  const params = await searchParams;
  const skus = (Array.isArray(params.sku) ? params.sku : params.sku ? [params.sku] : []).filter(
    Boolean,
  );
  const bundle = params.bundle ? (await getBundleBySlug(params.bundle)) : undefined;
  const couponCode = params.coupon?.trim().toUpperCase();

  // Unknown SKUs are dropped silently: a stale or hand-edited link must not be
  // able to inject a line the catalogue does not contain.
  const resolved = (await Promise.all(skus.map((sku) => getPlanBySku(sku)))).filter(
    (entry): entry is NonNullable<typeof entry> => entry !== undefined,
  );

  const cartLines: CartLineInput[] = resolved.map(({ product, plan }) => ({
    product,
    plan,
    quantity: 1,
  }));

  // Plan metadata the priced line does not carry (duration), keyed by SKU.
  const planBySku = new Map(resolved.map(({ plan }) => [plan.sku, plan]));

  const cart = priceCart(cartLines, {
    bundle,
    // No session in this environment, so no shopper can be treated as verified.
    // The flag is wired to Auth.js in Phase 3; until then the step is inert.
    studentVerified: false,
    studentDiscountBp: STUDENT_DISCOUNT_CONFIGURED ? studentDiscountBp() : 0,
    coupon:
      couponCode && COUPON_CONFIGURED
        ? { code: couponCode, basisPoints: 0 }
        : undefined,
  });

  const isEmpty = cartLines.length === 0;

  return (
    <div className="container-page py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-caption text-muted">
        <Link href="/" className="hover:text-link">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-secondary">Checkout</span>
      </nav>

      <h1 className="font-display text-h1 font-bold tracking-tight text-primary">Checkout</h1>

      {isEmpty ? (
        <div className="card mt-8 flex flex-col items-center gap-4 px-6 py-20 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-card bg-surface-2 text-muted">
            <Icon.Cart size={22} />
          </span>
          <div>
            <h2 className="text-body font-semibold text-primary">Your cart is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-caption text-secondary">
              Choose a plan from any listing and it will appear here with its price, licence terms
              and refund eligibility before you pay.
            </p>
          </div>
          <Link
            href="/explore"
            className="mt-2 inline-flex h-12 items-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Browse the marketplace
            <Icon.ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-4">
            {cart.blocked.length > 0 ? (
              <div className="rounded-card border border-danger/30 bg-danger/[0.06] p-5">
                <h2 className="flex items-center gap-2 text-body font-semibold text-danger">
                  <Icon.Alert size={17} />
                  {cart.blocked.length} item{cart.blocked.length === 1 ? "" : "s"} cannot be
                  purchased
                </h2>
                <p className="mt-2 text-caption text-secondary">
                  The compliance gate re-runs on every cart load, at checkout and again inside the
                  create-order transaction. These lines are excluded from the total below.
                </p>
                <ul className="mt-4 space-y-2">
                  {cart.blocked.map(({ line, gate }) => (
                    <li
                      key={line.plan.sku}
                      className="flex items-start justify-between gap-3 rounded-input border border-line bg-surface-1 px-4 py-3"
                    >
                      <div>
                        <p className="text-caption font-medium text-primary">
                          {line.product.name} — {line.plan.label}
                        </p>
                        <p className="mt-0.5 text-caption text-danger">{gate.detail}</p>
                      </div>
                      <Link
                        href={`/products/${line.product.slug}`}
                        className="shrink-0 text-caption text-link underline underline-offset-4"
                      >
                        Details
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cart.lines.map((line) => (
              <article key={line.sku} className="card p-5">
                <div className="flex items-start gap-4">
                  <LogoTile
                    monogram={line.productName.slice(0, 2).toUpperCase()}
                    hue="243"
                    size="sm"
                    label={line.productName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-body font-semibold text-primary">{line.productName}</h2>
                      <OfferingTypeBadge offeringType={line.offeringType} compact />
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {line.planLabel} ·{" "}
                      {formatDurationDays(planBySku.get(line.sku)?.durationDays ?? 0)} ·{" "}
                      {line.quantity} × {formatBDT(line.unitListPoisha)}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-body font-semibold text-primary">
                    {formatBDT(line.finalPoisha)}
                  </span>
                </div>

                {line.unitCompareAtPoisha && line.unitCompareAtPoisha > line.unitListPoisha ? (
                  <p className="mt-3 text-caption text-success">
                    <span className="tnum text-muted line-through">
                      {formatBDT(line.unitCompareAtPoisha)}
                    </span>{" "}
                    sale applied — you save{" "}
                    {formatBDT(line.unitCompareAtPoisha - line.unitListPoisha)}
                  </p>
                ) : null}

                {/* Order-line snapshot fields (§6 rule 2) */}
                <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-caption sm:grid-cols-2">
                  <SnapshotRow term="SKU" value={line.sku} mono />
                  <SnapshotRow term="List price snapshot" value={formatBDT(line.unitListPoisha)} mono />
                  <SnapshotRow
                    term="Delivery"
                    value={
                      line.deliverySlaHours <= 0
                        ? "Instant — automated"
                        : `${line.deliverySlaHours} business hours`
                    }
                  />
                  <SnapshotRow term="Renewal" value={RENEWAL_LABEL[line.renewalCapability]} />
                  <SnapshotRow term="Refunds" value={REFUND_LABEL[line.refundEligibility]} />
                  <SnapshotRow
                    term="Line discounts"
                    value={
                      line.steps.length > 0
                        ? line.steps.map((step) => `−${formatBDT(step.amountPoisha)} ${step.type}`).join(", ")
                        : "None"
                    }
                    mono
                  />
                </dl>
              </article>
            ))}

            <section className="card p-5" aria-labelledby="discounts">
              <h2 id="discounts" className="text-body font-semibold text-primary">
                Discount breakdown
              </h2>
              <p className="mt-1 text-caption text-muted">
                Applied in the fixed order Sale → Bundle → Student → Coupon, half-up rounding at
                each step, with a price floor that stacked discounts cannot pass.
              </p>
              <ol className="mt-4 space-y-2">
                {cart.steps.map((step, index) => (
                  <li
                    key={`${step.type}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-input border border-line bg-surface-2 px-4 py-2.5 text-caption"
                  >
                    <span className="flex items-center gap-2 text-secondary">
                      <span className="tnum inline-flex size-5 items-center justify-center rounded-pill bg-surface-1 text-muted">
                        {index + 1}
                      </span>
                      {step.label}
                    </span>
                    <span className="tnum shrink-0 font-medium text-success">
                      − {formatBDT(step.amountPoisha)}
                    </span>
                  </li>
                ))}
                {cart.steps.length === 0 ? (
                  <li className="rounded-input border border-line bg-surface-2 px-4 py-2.5 text-caption text-muted">
                    No discounts apply to this cart.
                  </li>
                ) : null}
              </ol>
              {cart.floorApplied ? (
                <p className="mt-3 flex items-start gap-2 rounded-input border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
                  <Icon.Alert size={14} className="mt-0.5 shrink-0" />
                  The price floor was reached, so a discount step was reduced. The floor is
                  enforced server-side, not in the browser.
                </p>
              ) : null}
              {couponCode && !COUPON_CONFIGURED ? (
                <p className="mt-3 flex items-start gap-2 rounded-input border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
                  <Icon.Info size={14} className="mt-0.5 shrink-0" />
                  Coupon <strong className="font-semibold">{couponCode}</strong> was not applied —
                  no coupon service is configured in this environment.
                </p>
              ) : null}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card card-elevated p-6">
              <h2 className="text-body font-semibold text-primary">Order summary</h2>

              <dl className="mt-4 space-y-2.5 text-caption">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">
                    Subtotal ({cart.lines.length} line{cart.lines.length === 1 ? "" : "s"})
                  </dt>
                  <dd className="tnum text-primary">{cart.formatted.subtotal}</dd>
                </div>
                {cart.discountPoisha > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Discounts</dt>
                    <dd className="tnum text-success">− {cart.formatted.discount}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">
                    VAT{cart.vatRateBp > 0 ? ` (${(cart.vatRateBp / 100).toFixed(2)}%)` : ""}
                  </dt>
                  <dd className="tnum text-primary">{cart.formatted.vat}</dd>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
                  <dt className="font-medium text-primary">Total</dt>
                  <dd className="tnum text-h2 text-primary">{cart.formatted.total}</dd>
                </div>
              </dl>

              {PAYMENT_CONNECTED ? (
                <div className="mt-5 space-y-3">
                  <p className="text-caption text-muted">
                    You will be redirected to the gateway&apos;s hosted page. We never see or store
                    your card number, PIN or OTP.
                  </p>
                  <form action="/api/v1/checkout/sessions" method="post">
                    {cart.lines.map((line) => (
                      <input key={line.sku} type="hidden" name="sku" value={line.sku} />
                    ))}
                    {bundle ? <input type="hidden" name="bundle" value={bundle.slug} /> : null}
                    <button
                      type="submit"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                    >
                      <Icon.Wallet size={17} />
                      Pay {cart.formatted.total}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mt-5 rounded-input border border-warning/30 bg-warning/10 p-4">
                  <h3 className="flex items-center gap-2 text-caption font-semibold text-warning">
                    <Icon.Alert size={15} /> Payment not connected
                  </h3>
                  <p className="mt-2 text-caption leading-relaxed text-secondary">
                    No gateway credential is configured in this environment, so there is no pay
                    button. A fake confirmation would violate the platform&apos;s core rules —
                    fulfilment is only ever triggered by a server-verified{" "}
                    <code className="rounded bg-surface-2 px-1">Payment.SUCCEEDED</code> callback.
                  </p>
                  <p className="mt-2 text-caption text-muted">
                    Set <code className="rounded bg-surface-2 px-1">SSLCOMMERZ_STORE_ID</code> +{" "}
                    <code className="rounded bg-surface-2 px-1">SSLCOMMERZ_STORE_PASSWORD</code> (or
                    the bKash / Nagad credentials) in <code>.env</code> to enable checkout.
                  </p>
                </div>
              )}

              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-caption text-secondary">
                {[
                  { icon: "Shield" as const, text: "Prices re-verified inside the order transaction" },
                  { icon: "File" as const, text: "VAT-compliant invoice generated per order" },
                  { icon: "Bolt" as const, text: "Automated lines delivered the moment payment clears" },
                ].map((row) => {
                  const Glyph = Icon[row.icon];
                  return (
                    <li key={row.text} className="flex items-start gap-2.5">
                      <Glyph size={14} className="mt-0.5 shrink-0 text-accent" />
                      {row.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card mt-4 p-5">
              <h2 className="text-caption font-semibold text-primary">Discount modules</h2>
              <ul className="mt-3 space-y-2.5">
                <ModuleRow
                  label="Student verification"
                  connected={STUDENT_DISCOUNT_CONFIGURED}
                  detail={
                    STUDENT_DISCOUNT_CONFIGURED
                      ? "Verified accounts receive the configured discount at step 3."
                      : "Not connected — the student step contributes 0 until verification is live."
                  }
                />
                <ModuleRow
                  label="Coupons"
                  connected={COUPON_CONFIGURED}
                  detail={
                    COUPON_CONFIGURED
                      ? "Coupon validated server-side at step 4, after the other discounts."
                      : "No coupon service is configured in this environment."
                  }
                />
              </ul>
            </div>

            {bundle ? (
              <p className="mt-4 text-caption text-muted">
                Bundle <strong className="font-medium text-secondary">{bundle.name}</strong>{" "}
                applied — its saving is step 2 of the ladder, allocated across the lines above.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="neutral">BDT pricing</Badge>
              <Badge tone="neutral">No card data stored</Badge>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SnapshotRow({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{term}</dt>
      <dd className={`mt-0.5 text-primary ${mono ? "tnum" : ""}`}>{value}</dd>
    </div>
  );
}

function ModuleRow({
  label,
  connected,
  detail,
}: {
  label: string;
  connected: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={`mt-1 size-2 shrink-0 rounded-full ${connected ? "bg-success" : "bg-warning"}`}
      />
      <div>
        <p className="text-caption font-medium text-primary">{label}</p>
        <p className="text-caption text-muted">{detail}</p>
      </div>
    </li>
  );
}
