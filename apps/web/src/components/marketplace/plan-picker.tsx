/**
 * Plan picker — spec §9.2.2, binding rule.
 *
 * The purchase CTA and the price shown must ALWAYS be synchronized with the
 * plan the customer has selected. There is no separate "price display" that
 * could drift: the button label and the amount are derived from the same
 * `selectedPlan` state in the same render.
 *
 * The CTA posts to /checkout with the selected plan SKU only. It never sends a
 * price — price is re-derived server-side from the catalogue inside the
 * create-order transaction (§6 rules 1, 2, 6).
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { formatBDT, savingsPercentPoisha, savingsPoisha } from "@/lib/money";
import { formatDurationDays } from "@/lib/format";
import type { PlanAudience, Product, ProductPlan, RenewalCapability } from "@/lib/types";
import {
  DELIVERY_METHOD_LABEL,
  PLAN_AUDIENCE_LABEL,
  REFUND_LABEL,
  RENEWAL_LABEL,
} from "@/lib/types";

const AUDIENCE_LABEL: Record<PlanAudience, string> = PLAN_AUDIENCE_LABEL;
import type { GateFailure } from "@/lib/repository";

export function PlanPicker({
  product,
  gate,
}: {
  product: Product;
  /** Server-side compliance verdict — the client cannot override it. */
  gate: GateFailure | null;
}) {
  const activePlans = useMemo(
    () => product.plans.filter((plan) => plan.active),
    [product.plans],
  );

  const [selectedSku, setSelectedSku] = useState<string | null>(activePlans[0]?.sku ?? null);

  // Single source of truth for BOTH the displayed price and the CTA (§9.2.2).
  const selectedPlan: ProductPlan | undefined = useMemo(
    () => activePlans.find((plan) => plan.sku === selectedSku) ?? activePlans[0],
    [activePlans, selectedSku],
  );

  const purchasable = gate === null && selectedPlan !== undefined;
  const savings = selectedPlan
    ? savingsPoisha(selectedPlan.pricePoisha, selectedPlan.compareAtPoisha)
    : null;
  const savingsPercent = selectedPlan
    ? savingsPercentPoisha(selectedPlan.pricePoisha, selectedPlan.compareAtPoisha)
    : null;

  return (
    <div className="card card-elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-primary">Choose a plan</h2>
        <Badge tone={renewalTone(product.renewalCapability)}>
          <Icon.Refresh size={12} />
          {RENEWAL_LABEL[product.renewalCapability]}
        </Badge>
      </div>

      {activePlans.length === 0 ? (
        <p className="mt-4 rounded-input border border-danger/25 bg-danger/10 px-4 py-3 text-caption text-danger">
          No plan is currently available for this listing.
        </p>
      ) : (
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Available plans for {product.name}</legend>
          {activePlans.map((plan) => {
            const isSelected = plan.sku === selectedPlan?.sku;
            const planSaved = savingsPoisha(plan.pricePoisha, plan.compareAtPoisha);
            return (
              <label
                key={plan.sku}
                className={`flex cursor-pointer items-start gap-3 rounded-input border p-4 transition-colors duration-fast ${
                  isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface-1 hover:border-line-strong"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.sku}
                  checked={isSelected}
                  onChange={() => setSelectedSku(plan.sku)}
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-primary">{plan.label}</span>
                    <span className="text-caption text-muted">
                      {formatDurationDays(plan.durationDays)}
                    </span>
                    {plan.audience && plan.audience !== "STANDARD" ? (
                      <Badge tone="warning" className="px-2 py-0.5">
                        {AUDIENCE_LABEL[plan.audience]}
                      </Badge>
                    ) : null}
                    {planSaved && planSaved > 0 ? (
                      <Badge tone="success" className="px-2 py-0.5">
                        Save {savingsPercentPoisha(plan.pricePoisha, plan.compareAtPoisha)}%
                      </Badge>
                    ) : null}
                    {plan.studentPricePoisha ? (
                      <Badge tone="info" className="px-2 py-0.5">
                        Student {formatBDT(plan.studentPricePoisha)}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="tnum mt-1 block text-h3 text-primary">
                    {formatBDT(plan.pricePoisha)}
                  </span>
                  {plan.stock !== undefined && plan.inventoryMode !== "UNLIMITED" ? (
                    <span className="mt-1 block text-caption text-muted">
                      {plan.stock} left in this batch
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {/* The amount below and the button below are both derived from
          `selectedPlan` in this same render — they cannot disagree. */}
      <div className="mt-5 border-t border-line pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-caption text-muted">Total for {selectedPlan?.label ?? "—"}</p>
            <p className="tnum text-h2 text-primary">
              {selectedPlan ? formatBDT(selectedPlan.pricePoisha) : "—"}
            </p>
            {savings && savings > 0 && selectedPlan?.compareAtPoisha ? (
              <p className="text-caption text-muted">
                <span className="tnum line-through">
                  {formatBDT(selectedPlan.compareAtPoisha)}
                </span>{" "}
                <span className="text-success">
                  you save {formatBDT(savings)} ({savingsPercent}%)
                </span>
              </p>
            ) : null}
          </div>
          <p className="max-w-[10rem] text-right text-caption text-muted">
            Incl. applicable VAT where stated. Price confirmed again at checkout.
          </p>
        </div>

        {purchasable && selectedPlan ? (
          <form action="/checkout" method="get" className="mt-5">
            <input type="hidden" name="sku" value={selectedPlan.sku} />
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover active:translate-y-px"
            >
              <Icon.Wallet size={17} />
              Buy {selectedPlan.label} — {formatBDT(selectedPlan.pricePoisha)}
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-button bg-surface-3 px-6 text-body font-medium text-muted opacity-60"
            >
              <Icon.Alert size={17} />
              Not available for purchase
            </button>
            {gate ? (
              <p className="rounded-input border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
                <strong className="font-semibold">{gateHeading(gate.reason)}.</strong>{" "}
                {gate.detail}
              </p>
            ) : null}
          </div>
        )}

        {product.renewalNote ? (
          <p className="mt-3 flex items-start gap-2 text-caption text-muted">
            <Icon.Info size={14} className="mt-0.5 shrink-0" />
            {product.renewalNote}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <FactRow icon="Bolt" label="Delivery" value={DELIVERY_METHOD_LABEL[product.deliveryMethod]} />
          <FactRow icon="Shield" label="Refunds" value={REFUND_LABEL[product.refundEligibility]} />
          <FactRow icon="Globe" label="Platforms" value={product.platforms.join(", ")} />
          <FactRow icon="Users" label="Licence" value={product.eligibilityNote ?? LICENCE_COPY[product.licenceType]} />
        </div>

        {product.geographicRestrictions ? (
          <p className="mt-3 rounded-input border border-line bg-surface-2 px-4 py-3 text-caption text-secondary">
            <strong className="font-medium text-primary">Regional note: </strong>
            {product.geographicRestrictions}
          </p>
        ) : null}

        <p className="mt-4 text-caption text-muted">
          Need help choosing?{" "}
          <Link href="/support" className="text-link underline underline-offset-4">
            Talk to support
          </Link>{" "}
          or{" "}
          <Link href="/services" className="text-link underline underline-offset-4">
            request a service
          </Link>{" "}
          instead.
        </p>
      </div>
    </div>
  );
}

function FactRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Icon;
  label: string;
  value: string;
}) {
  const Glyph = Icon[icon];
  return (
    <div className="flex items-start gap-2.5 rounded-input border border-line bg-surface-1 px-3 py-2.5">
      <Glyph size={15} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-caption text-muted">{label}</p>
        <p className="text-caption font-medium text-primary">{value}</p>
      </div>
    </div>
  );
}

const LICENCE_COPY: Record<Product["licenceType"], string> = {
  GIFT_CODE: "Gift code, redeemed on your own account",
  RESELLER_PROVISIONED: "Provisioned to you by an authorized reseller",
  EDUCATION_REFERRAL: "You apply through the provider’s education programme",
  INSTITUTIONAL: "Institutional seat — assigned by your organization",
  OWN_PRODUCT: "Our own product licence",
};

const GATE_HEADING: Record<GateFailure["reason"], string> = {
  NOT_PUBLISHED: "Not published",
  AUTHORIZATION_MISSING: "Authorization missing",
  AUTHORIZATION_UNAVAILABLE: "No individual licence available",
  EVIDENCE_MISSING: "Authorization evidence pending",
  EVIDENCE_EXPIRED: "Authorization evidence expired",
  NO_ACTIVE_PLAN: "No active plan",
};

function gateHeading(reason: GateFailure["reason"]): string {
  return GATE_HEADING[reason];
}

function renewalTone(capability: RenewalCapability): "success" | "info" | "warning" {
  if (capability === "PLATFORM_RENEWAL") return "success";
  if (capability === "PROVIDER_BILLING_ONLY") return "info";
  return "warning";
}
