/**
 * Product card — spec §9.2.2.
 *
 * Every element is mandatory: logo placeholder, name, category, short
 * description, AUTHORIZATION / SOURCING DISCLOSURE, "starting from" price,
 * availability, and the details CTA.
 *
 * States (§10.3): Default · Hover · Unavailable · Skeleton.
 * No hardcoded prices — everything comes from the repository (§6 rule 1).
 */

import Link from "next/link";
import { formatBDT } from "@/lib/money";
import { formatDurationDays } from "@/lib/format";
import type { Availability, ProductListItem } from "@/lib/types";
import { Badge, OfferingTypeBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";

const AVAILABILITY_COPY: Record<Availability, { label: string; tone: "success" | "warning" | "danger" }> = {
  IN_STOCK: { label: "Available", tone: "success" },
  LOW_STOCK: { label: "Low stock", tone: "warning" },
  UNAVAILABLE: { label: "Not available", tone: "danger" },
};

export function ProductCard({ item }: { item: ProductListItem }) {
  const { product, fromPricePoisha, availability, activePlanCount } = item;
  const unavailable = availability === "UNAVAILABLE";
  const availabilityCopy = AVAILABILITY_COPY[availability];
  const cheapestPlan = product.plans
    .filter((plan) => plan.active)
    .sort((a, b) => a.pricePoisha - b.pricePoisha)[0];

  return (
    <article
      className={`card card-elevated group relative flex h-full flex-col gap-4 p-5 transition-[border-color,transform] duration-base ease-brand hover:-translate-y-0.5 hover:border-accent/40 ${
        unavailable ? "opacity-90" : ""
      }`}
    >
      <header className="flex items-start gap-3">
        <LogoTile
          monogram={product.monogram}
          hue={product.accentHue}
          label={product.name}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-semibold text-primary">{product.name}</h3>
          <p className="truncate text-caption text-muted">{product.provider}</p>
        </div>
        <Badge tone={availabilityCopy.tone}>{availabilityCopy.label}</Badge>
      </header>

      <p className="line-clamp-2 text-caption text-secondary">{product.shortDescription}</p>

      {/* Authorization / sourcing disclosure (§9.2.2, §11.7) */}
      <div className="flex flex-wrap items-center gap-2">
        <OfferingTypeBadge offeringType={product.offeringType} compact />
        {product.isStudentEligible ? (
          <Badge tone="accent">
            <Icon.Users size={12} /> Student price
          </Badge>
        ) : null}
      </div>

      {product.deliveryMethod === "AUTOMATED_CODE" || product.deliveryMethod === "AUTOMATED_API" ? (
        <p className="flex items-center gap-1.5 text-caption text-muted">
          <Icon.Bolt size={13} /> Instant delivery
        </p>
      ) : product.deliverySlaHours > 0 ? (
        <p className="flex items-center gap-1.5 text-caption text-muted">
          <Icon.Clock size={13} /> Within {product.deliverySlaHours} business hours
        </p>
      ) : null}

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          {fromPricePoisha === null ? (
            <p className="text-caption text-muted">Not sold individually</p>
          ) : fromPricePoisha === 0 ? (
            <p className="text-caption text-muted">
              <span className="tnum text-body font-semibold text-success">Free</span>
              <span className="block">via the provider</span>
            </p>
          ) : (
            <p className="text-caption text-muted">
              Starting from
              <span className="tnum block text-h3 leading-tight text-primary">
                {formatBDT(fromPricePoisha)}
              </span>
            </p>
          )}
          {cheapestPlan && fromPricePoisha !== null && fromPricePoisha > 0 ? (
            <p className="text-caption text-muted">
              {formatDurationDays(cheapestPlan.durationDays)} · {activePlanCount} plan
              {activePlanCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-button border border-line px-3.5 text-caption font-medium text-primary transition-colors duration-fast group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast"
        >
          {unavailable ? "View details" : "View plans"}
          <Icon.ArrowRight size={15} />
        </Link>
      </footer>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card flex h-full flex-col gap-4 p-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="skeleton size-12 rounded-card" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3 rounded-pill" />
          <div className="skeleton h-3 w-1/3 rounded-pill" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded-pill" />
      <div className="skeleton h-3 w-4/5 rounded-pill" />
      <div className="skeleton h-6 w-28 rounded-pill" />
      <div className="mt-auto flex items-end justify-between border-t border-line pt-4">
        <div className="skeleton h-8 w-24 rounded-pill" />
        <div className="skeleton h-11 w-28 rounded-button" />
      </div>
    </div>
  );
}
