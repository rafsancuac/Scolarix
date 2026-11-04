/**
 * Bundle detail — spec §9.2.5.
 *
 * Shows every component line with its standalone value, the bundle price, and
 * the itemised saving. The CTA carries bundle SKUs only; prices are re-derived
 * server-side in the create-order transaction (§6 rules 1–2).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatBDT, savingsPercentPoisha, savingsPoisha } from "@/lib/money";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { getBundleBySlug, getPlanBySku, listBundles } from "@/lib/repository";

export async function generateStaticParams() {
  return (await listBundles()).map((bundle) => ({ slug: bundle.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) return { title: "Bundle not found", robots: { index: false } };

  return {
    title: `${bundle.name} bundle`,
    description: bundle.description,
    alternates: { canonical: `/bundles/${bundle.slug}` },
  };
}

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const saved = savingsPoisha(bundle.pricePoisha, bundle.compareAtPoisha) ?? 0;
  const percent = savingsPercentPoisha(bundle.pricePoisha, bundle.compareAtPoisha);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Bundles", path: "/bundles" },
              { name: bundle.name, path: `/bundles/${bundle.slug}` },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-6">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
              <li><Link href="/" className="hover:text-link">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/bundles" className="hover:text-link">Bundles</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-secondary">{bundle.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="container-page py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  <Icon.Tag size={12} /> Bundle of {bundle.items.length}
                </Badge>
                {bundle.isStudentOnly ? (
                  <Badge tone="info">
                    <Icon.Users size={12} /> Verified students only
                  </Badge>
                ) : null}
                {saved > 0 ? <Badge tone="success">Save {percent}%</Badge> : null}
              </div>

              <h1 className="mt-4 font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
                {bundle.name}
              </h1>
              <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
                {bundle.description}
              </p>
            </header>

            <section className="mt-10" aria-labelledby="contents">
              <h2 id="contents" className="text-h3 font-semibold text-primary">
                What is in this bundle
              </h2>
              <ul className="mt-5 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-1">
                {bundle.items.map((item) => {
                  const plan = getPlanBySku(item.sku);
                  const href = plan ? `/products/${plan.product.slug}` : "/services";
                  return (
                    <li key={item.sku} className="flex items-center gap-4 p-5">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                        <Icon.Check size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={href}
                          className="text-body font-medium text-primary transition-colors hover:text-link"
                        >
                          {item.label}
                        </Link>
                        <p className="mt-0.5 text-caption text-muted">
                          {item.itemType === "PRODUCT_PLAN"
                            ? plan
                              ? `${plan.product.provider} · subscription plan`
                              : "Subscription plan"
                            : "Service package"}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-caption text-muted">
                        {formatBDT(item.valuePoisha)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-10 rounded-card border border-line bg-surface-1 p-6" aria-labelledby="terms">
              <h2 id="terms" className="text-body font-semibold text-primary">Bundle terms</h2>
              <ul className="mt-4 space-y-2.5">
                {[
                  "Each component keeps its own licence terms, renewal capability and refund eligibility — the bundle does not extend them.",
                  "Bundle pricing is applied after any active sale price and before student and coupon discounts.",
                  "If a component becomes unavailable after purchase, we refund that component's standalone value or replace it with your agreement.",
                  bundle.isStudentOnly
                    ? "This bundle requires a verified student account. Verification is reviewed before the discount is applied."
                    : "This bundle is available to any verified customer account.",
                  "Bundles are for a single named user unless a component states otherwise. Reselling a delivered code is prohibited.",
                ].map((term) => (
                  <li key={term} className="flex items-start gap-2.5 text-caption leading-relaxed text-secondary">
                    <Icon.Info size={14} className="mt-0.5 shrink-0 text-accent" />
                    {term}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card card-elevated p-6">
              <h2 className="text-body font-semibold text-primary">Bundle price</h2>

              <dl className="mt-4 space-y-2.5 text-caption">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Bought separately</dt>
                  <dd className="tnum text-muted line-through">{formatBDT(bundle.compareAtPoisha)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Bundle saving</dt>
                  <dd className="tnum text-success">− {formatBDT(saved)}</dd>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
                  <dt className="font-medium text-primary">You pay</dt>
                  <dd className="tnum text-h2 text-primary">{formatBDT(bundle.pricePoisha)}</dd>
                </div>
              </dl>

              <form action="/checkout" method="get" className="mt-5">
                {bundle.items.map((item) => (
                  <input key={item.sku} type="hidden" name="sku" value={item.sku} />
                ))}
                <input type="hidden" name="bundle" value={bundle.slug} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover active:translate-y-px"
                >
                  <Icon.Cart size={17} />
                  Add bundle — {formatBDT(bundle.pricePoisha)}
                </button>
              </form>

              <p className="mt-3 text-caption text-muted">
                Price is confirmed again at checkout. Student and coupon discounts are applied
                there, in that order.
              </p>

              <ul className="mt-5 space-y-2 border-t border-line pt-5">
                {[
                  { icon: "Wallet" as const, text: "bKash · Nagad · Rocket · card" },
                  { icon: "File" as const, text: "VAT-compliant invoice per order" },
                  { icon: "Shield" as const, text: "Refund terms per component, stated above" },
                ].map((row) => {
                  const Glyph = Icon[row.icon];
                  return (
                    <li key={row.text} className="flex items-start gap-2.5 text-caption text-secondary">
                      <Glyph size={14} className="mt-0.5 shrink-0 text-accent" />
                      {row.text}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
