/**
 * Service detail — spec §9.2.4 / §12.
 *
 * Vertical B listings are structurally different from product listings: scope
 * included / excluded, an academic-integrity declaration (§12.6) that must be
 * acknowledged before a request can be submitted, turnaround, revision
 * allowance and packages.
 *
 * The request form posts to `/api/v1/service-requests`, which validates the
 * declaration, the prohibited-scope screen and the contact details server-side
 * before anything is queued for quotation.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceRequestForm } from "@/components/marketplace/service-request-form";
import { ServiceCard } from "@/components/marketplace/service-card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";
import { BRAND } from "@/lib/brand";
import { formatBDT } from "@/lib/money";
import { formatTurnaround } from "@/lib/format";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/metadata";
import { getServiceBySlug, listServices } from "@/lib/repository";

export function generateStaticParams() {
  return listServices().map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Service not found", robots: { index: false } };

  return {
    title: `${service.name} — academic support service`,
    description: service.shortDescription,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const others = listServices()
    .filter((item) => item.slug !== service.slug)
    .slice(0, 3);

  const fromPrice = service.packages.length
    ? Math.min(...service.packages.filter((p) => p.pricePoisha > 0).map((p) => p.pricePoisha) || [0])
    : (service.basePricePoisha ?? null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: service.name, path: `/services/${service.slug}` },
            ]),
            serviceJsonLd({
              name: service.name,
              description: service.shortDescription,
              slug: service.slug,
              pricePoisha: fromPrice,
            }),
          ]),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-6">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
              <li><Link href="/" className="hover:text-link">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/services" className="hover:text-link">Services</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-secondary">{service.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="container-page py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  <Icon.Tools size={12} /> Our own service
                </Badge>
                <Badge tone="neutral">{service.categoryLabel}</Badge>
                {service.requiresQuotation ? <Badge tone="info">Quote before payment</Badge> : null}
              </div>

              <div className="mt-5 flex items-start gap-4">
                <LogoTile
                  monogram={service.monogram}
                  hue={service.accentHue}
                  size="lg"
                  label={service.name}
                />
                <div>
                  <h1 className="font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
                    {service.name}
                  </h1>
                  <p className="mt-2 text-body text-secondary">{service.shortDescription}</p>
                </div>
              </div>
            </header>

            <section className="mt-10" aria-labelledby="overview">
              <h2 id="overview" className="text-h3 font-semibold text-primary">Overview</h2>
              <p className="mt-4 max-w-2xl text-body leading-relaxed text-secondary [text-wrap:pretty]">
                {service.description}
              </p>
            </section>

            {/* §12.6 — permitted / prohibited scope, always visible together */}
            <section className="mt-10 grid gap-4 md:grid-cols-2" aria-labelledby="scope">
              <h2 id="scope" className="sr-only">Scope</h2>
              <div className="rounded-card border border-success/25 bg-success/[0.06] p-5">
                <h3 className="flex items-center gap-2 text-body font-semibold text-success">
                  <Icon.Check size={17} /> What we do
                </h3>
                <ul className="mt-3 space-y-2">
                  {service.scopeIncluded.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-caption text-secondary">
                      <Icon.Check size={13} className="mt-1 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-danger/25 bg-danger/[0.06] p-5">
                <h3 className="flex items-center gap-2 text-body font-semibold text-danger">
                  <Icon.Close size={17} /> What we will not do
                </h3>
                <ul className="mt-3 space-y-2">
                  {service.scopeExcluded.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-caption text-secondary">
                      <Icon.Close size={13} className="mt-1 shrink-0 text-danger" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-10" aria-labelledby="integrity">
              <div className="rounded-card border border-warning/30 bg-warning/[0.07] p-5 sm:p-6">
                <h2 id="integrity" className="flex items-center gap-2 text-body font-semibold text-warning">
                  <Icon.Alert size={17} /> Academic integrity notice
                </h2>
                <p className="mt-3 text-caption leading-relaxed text-secondary">
                  {service.integrityNotice}
                </p>
                <p className="mt-3 text-caption text-muted">
                  Requests that mention ghost-writing, exam or assessment completion, plagiarism
                  evasion or fabricated data are routed to review before any quotation is issued,
                  and are refused where the request cannot be delivered within these boundaries.{" "}
                  <Link href="/legal/services-policy" className="text-link underline underline-offset-4">
                    Read the full services policy
                  </Link>.
                </p>
              </div>
            </section>

            {service.packages.length > 0 ? (
              <section className="mt-10" aria-labelledby="packages">
                <h2 id="packages" className="text-h3 font-semibold text-primary">Packages</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {service.packages.map((pkg) => (
                    <article key={pkg.id} className="card flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-body font-semibold text-primary">{pkg.label}</h3>
                        <span className="tnum shrink-0 text-body font-semibold text-primary">
                          {pkg.pricePoisha > 0 ? formatBDT(pkg.pricePoisha) : "On quote"}
                        </span>
                      </div>
                      <p className="text-caption text-muted">
                        {formatTurnaround(pkg.turnaroundDays)} · {pkg.revisionsIncluded} revision
                        {pkg.revisionsIncluded === 1 ? "" : "s"} included
                        {pkg.unitLabel ? ` · per ${pkg.unitLabel}` : ""}
                      </p>
                      <ul className="space-y-1.5">
                        {pkg.scope.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-caption text-secondary">
                            <Icon.Check size={13} className="mt-1 shrink-0 text-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ServiceRequestForm service={service} />

            <div className="card mt-4 p-5">
              <h2 className="text-caption font-semibold text-primary">How a request works</h2>
              <ol className="mt-3 space-y-3">
                {[
                  "You describe the work and acknowledge the integrity declaration. Your timestamp and IP are recorded with the request.",
                  "A specialist reviews scope. If anything falls outside our permitted scope, we decline and explain why.",
                  "You receive a fixed quote with turnaround and revision allowance. The quote does not change after you accept it.",
                  "You pay through the gateway. Work starts only after payment is verified.",
                  "You review the delivery, request your included revisions, then close or escalate the request.",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="tnum inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-caption font-semibold text-accent">
                      {index + 1}
                    </span>
                    <p className="text-caption leading-relaxed text-secondary">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        {others.length > 0 ? (
          <section className="mt-20" aria-labelledby="other-services">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="other-services" className="text-h2 font-bold tracking-tight text-primary">
                Other services
              </h2>
              <Link
                href="/services"
                className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
              >
                All services
                <Icon.ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <li key={item.id}><ServiceCard service={item} /></li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-16 border-t border-line pt-8 text-caption leading-relaxed text-muted">
          Services are performed by {BRAND.name} specialists or vetted contractors under our
          supervision. We do not complete graded assessments, sit examinations, or produce work
          intended to be submitted as your own where your institution prohibits it.
        </p>
      </div>
    </>
  );
}
