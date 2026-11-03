/**
 * Homepage sections — spec §9.1.1 order:
 * Hero → Categories → Verticals → Trending → Services → Bundles → Student
 * Zone → FAQ → Final CTA. Testimonials are rendered only when the repository
 * returns verified entries, so the section disappears instead of inventing
 * quotes (§9.1.2, §28.5).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, CATEGORY_ICON, type IconName } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { LogoTile } from "@/components/ui/logo-tile";
import { formatBDT, savingsPoisha } from "@/lib/money";
import { formatTurnaround } from "@/lib/format";
import type { Bundle, Category, Faq, Service } from "@/lib/types";

export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`container-page py-16 sm:py-20 lg:py-24 ${className}`}>
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-2 text-caption font-semibold tracking-[0.08em] text-accent uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-h2 font-bold tracking-tight text-primary [text-wrap:balance]">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-body text-secondary [text-wrap:pretty]">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors duration-fast hover:border-accent hover:text-link"
          >
            {action.label}
            <Icon.ArrowRight
              size={15}
              className="transition-transform duration-fast group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export function CategoryGrid({ categories }: { categories: (Category & { itemCount: number })[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const iconName: IconName = CATEGORY_ICON[category.slug] ?? "Tag";
        const Glyph = Icon[iconName];
        return (
          <li key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              className="card card-elevated group flex h-full flex-col gap-3 p-5 transition-[border-color,transform] duration-base ease-brand hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-button bg-accent-soft text-accent">
                  <Glyph size={20} />
                </span>
                <Icon.ArrowRight
                  size={16}
                  className="text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </div>
              <h3 className="text-body font-semibold text-primary">{category.label}</h3>
              <p className="text-caption text-secondary">{category.blurb}</p>
              <p className="mt-auto pt-1 text-caption text-muted">
                {category.itemCount} {category.itemCount === 1 ? "tool" : "tools"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand verticals (§4)                                                        */
/* -------------------------------------------------------------------------- */

export function VerticalStrip({
  verticals,
}: {
  verticals: { slug: string; label: string; blurb: string; itemCount: number; serviceCount: number }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {verticals.map((vertical) => (
        <li key={vertical.slug}>
          <Link
            href={`/explore?vertical=${vertical.slug}`}
            className="card group flex h-full flex-col gap-2 border-line p-4 transition-colors duration-fast hover:border-accent/40 hover:bg-surface-2"
          >
            <span className="text-caption font-semibold text-primary">{vertical.label}</span>
            <span className="text-caption text-muted">{vertical.blurb}</span>
            <span className="tnum mt-auto pt-2 text-caption text-accent">
              {vertical.itemCount + vertical.serviceCount} listing
              {vertical.itemCount + vertical.serviceCount === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Services (Vertical B)                                                       */
/* -------------------------------------------------------------------------- */

export function ServiceHighlight({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <li key={service.id}>
          <Link
            href={`/services/${service.slug}`}
            className="card card-elevated group flex h-full flex-col gap-4 p-5 transition-[border-color,transform] duration-base ease-brand hover:-translate-y-0.5 hover:border-accent/40"
          >
            <div className="flex items-start gap-3">
              <LogoTile monogram={service.monogram} hue={service.accentHue} label={service.name} />
              <div className="min-w-0">
                <h3 className="text-body font-semibold text-primary">{service.name}</h3>
                <p className="text-caption text-muted">{service.categoryLabel}</p>
              </div>
            </div>

            <p className="line-clamp-3 text-caption text-secondary">{service.description}</p>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className="flex items-center gap-1.5 text-caption text-muted">
                <Icon.Clock size={13} />
                {formatTurnaround(service.turnaroundDays)}
              </span>
              <span className="tnum text-caption font-semibold text-primary">
                {service.requiresQuotation
                  ? "Custom quote"
                  : service.basePricePoisha
                    ? `From ${formatBDT(service.basePricePoisha)}`
                    : "On request"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Bundles                                                                     */
/* -------------------------------------------------------------------------- */

export function BundleRow({ bundles }: { bundles: Bundle[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {bundles.map((bundle) => {
        const saved = savingsPoisha(bundle.pricePoisha, bundle.compareAtPoisha);
        return (
          <li key={bundle.id}>
            <Link
              href={`/bundles/${bundle.slug}`}
              className="card card-elevated group flex h-full flex-col gap-4 border-accent/20 bg-accent-soft/40 p-6 transition-[border-color,transform] duration-base ease-brand hover:-translate-y-0.5 hover:border-accent/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <Icon.Tag size={12} /> Bundle
                </Badge>
                {bundle.isStudentOnly ? (
                  <Badge tone="info">
                    <Icon.Users size={12} /> Students only
                  </Badge>
                ) : null}
                {saved && saved > 0 ? (
                  <Badge tone="success">Save {formatBDT(saved)}</Badge>
                ) : null}
              </div>

              <div>
                <h3 className="text-h3 font-semibold text-primary">{bundle.name}</h3>
                <p className="mt-2 text-caption text-secondary">{bundle.description}</p>
              </div>

              <ul className="space-y-1.5">
                {bundle.items.map((item) => (
                  <li key={item.sku} className="flex items-start gap-2 text-caption text-secondary">
                    <Icon.Check size={14} className="mt-0.5 shrink-0 text-success" />
                    <span className="flex-1">{item.label}</span>
                    <span className="tnum shrink-0 text-muted">{formatBDT(item.valuePoisha)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-end justify-between gap-3 border-t border-accent/20 pt-4">
                <p className="text-caption text-muted">
                  Bundle price
                  <span className="tnum block text-h2 leading-tight text-primary">
                    {formatBDT(bundle.pricePoisha)}
                  </span>
                </p>
                <span className="inline-flex h-11 items-center gap-1.5 rounded-button bg-accent px-4 text-caption font-medium text-accent-contrast transition-colors duration-fast group-hover:bg-accent-hover">
                  View bundle
                  <Icon.ArrowRight size={15} />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-card-lg border border-line bg-surface-1">
      {faqs.map((faq) => (
        <details key={faq.id} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-primary [&::-webkit-details-marker]:hidden">
            {faq.question}
            <Icon.Chevron
              size={18}
              className="shrink-0 text-muted transition-transform duration-base group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 text-caption leading-relaxed text-secondary">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Closing CTA                                                                 */
/* -------------------------------------------------------------------------- */

export function ClosingCta({ brandName }: { brandName: string }) {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-card-lg border border-line bg-surface-1 px-6 py-14 text-center sm:px-12">
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 -z-10" />
        <h2 className="mx-auto max-w-2xl font-display text-h2 font-bold tracking-tight text-primary [text-wrap:balance]">
          Set up your toolkit once. Get back to the work that matters.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body text-secondary">
          Create a free {brandName} account to keep every subscription, renewal reminder, invoice
          and service request in one place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover sm:w-auto"
          >
            Create free account
            <Icon.ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 w-full items-center justify-center rounded-button border border-line px-6 text-body font-medium text-primary transition-colors duration-fast hover:border-accent/40 hover:text-link sm:w-auto"
          >
            Compare plans
          </Link>
        </div>
        <p className="mt-6 text-caption text-muted">
          No card required to browse. Payment happens only at checkout, through a licensed
          Bangladeshi gateway.
        </p>
      </div>
    </section>
  );
}
