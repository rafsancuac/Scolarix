/**
 * Service card — Vertical B (§9.2.4).
 *
 * Deliberately distinct from a product card: different CTA ("Request service"),
 * turnaround and revision information instead of a subscription duration, so
 * authorized third-party products and original services are never confused
 * (spec §4).
 */

import Link from "next/link";
import { formatBDT } from "@/lib/money";
import { formatTurnaround } from "@/lib/format";
import type { Service } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";

export function ServiceCard({ service }: { service: Service }) {
  const pricedPackages = service.packages.filter((pkg) => pkg.pricePoisha > 0);
  const fromPrice = pricedPackages.length
    ? Math.min(...pricedPackages.map((pkg) => pkg.pricePoisha))
    : null;

  return (
    <article className="card card-elevated group flex h-full flex-col gap-4 p-5 transition-[border-color,transform] duration-base ease-brand hover:-translate-y-0.5 hover:border-accent/40">
      <header className="flex items-start gap-3">
        <LogoTile monogram={service.monogram} hue={service.accentHue} label={service.name} />
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-semibold text-primary">{service.name}</h3>
          <p className="text-caption text-muted">{service.categoryLabel}</p>
        </div>
        <Badge tone="success">
          <Icon.Tools size={12} /> Our service
        </Badge>
      </header>

      <p className="line-clamp-2 text-caption text-secondary">{service.shortDescription}</p>

      <dl className="grid grid-cols-2 gap-2 text-caption">
        <div className="rounded-input bg-surface-2 px-2.5 py-2">
          <dt className="text-muted">Turnaround</dt>
          <dd className="font-medium text-primary">{formatTurnaround(service.turnaroundDays)}</dd>
        </div>
        <div className="rounded-input bg-surface-2 px-2.5 py-2">
          <dt className="text-muted">Revisions</dt>
          <dd className="font-medium text-primary">
            {service.revisionsIncluded} included
          </dd>
        </div>
      </dl>

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          {service.requiresQuotation && fromPrice === null ? (
            <p className="text-caption text-muted">Custom quote</p>
          ) : fromPrice === null ? (
            <p className="text-caption text-muted">Priced per {service.unitLabel ?? "unit"}</p>
          ) : (
            <p className="text-caption text-muted">
              From
              <span className="tnum block text-h3 leading-tight text-primary">
                {formatBDT(fromPrice)}
              </span>
            </p>
          )}
        </div>

        <Link
          href={`/services/${service.slug}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-button border border-line px-3.5 text-caption font-medium text-primary transition-colors duration-fast group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast"
        >
          Request service
          <Icon.ArrowRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
