/**
 * Bundles — spec §8.2 `/bundles`, §11.5.
 *
 * Bundle pricing is applied in the fixed discount order Sale → Bundle →
 * Student → Coupon (§13.8). This page shows the bundle saving only; stacking
 * is resolved in the cart where every step is itemised.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatBDT, savingsPercentPoisha, savingsPoisha } from "@/lib/money";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { getPlanBySku, listBundles } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Bundles — save on combined tools",
  description:
    "Combine AI, writing and productivity subscriptions into one bundle priced in BDT. Bundle discounts apply after any active sale and before student and coupon discounts.",
  alternates: { canonical: "/bundles" },
};

export default async function BundlesPage() {
  const bundles = await listBundles();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Bundles", path: "/bundles" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Bundles</span>
          </nav>
          <h1 className="max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            Bundles
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            A bundle groups subscriptions and service packages you would buy anyway, at one lower
            price. Every line is itemised in your cart and on your invoice.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        {bundles.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-card bg-surface-2 text-muted">
              <Icon.Tag size={22} />
            </span>
            <h2 className="text-body font-semibold text-primary">No bundles are live right now</h2>
            <p className="max-w-md text-caption text-secondary">
              Bundles are published only when every component listing has current authorization
              evidence. Browse individual tools instead.
            </p>
            <Link
              href="/explore"
              className="mt-2 inline-flex h-11 items-center rounded-button bg-accent px-5 text-caption font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2">
            {bundles.map((bundle) => {
              const saved = savingsPoisha(bundle.pricePoisha, bundle.compareAtPoisha) ?? 0;
              const percent = savingsPercentPoisha(bundle.pricePoisha, bundle.compareAtPoisha);
              return (
                <li key={bundle.id}>
                  <article className="card card-elevated flex h-full flex-col gap-5 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">
                        <Icon.Tag size={12} /> {bundle.items.length} items
                      </Badge>
                      {bundle.isStudentOnly ? (
                        <Badge tone="info">
                          <Icon.Users size={12} /> Verified students only
                        </Badge>
                      ) : null}
                      {saved > 0 ? <Badge tone="success">Save {percent}%</Badge> : null}
                    </div>

                    <div>
                      <h2 className="text-h3 font-semibold text-primary">{bundle.name}</h2>
                      <p className="mt-2 text-caption leading-relaxed text-secondary">
                        {bundle.description}
                      </p>
                    </div>

                    <ul className="divide-y divide-line rounded-input border border-line">
                      {bundle.items.map((item) => {
                        const plan = getPlanBySku(item.sku);
                        const href = plan
                          ? `/products/${plan.product.slug}`
                          : `/services`;
                        return (
                          <li key={item.sku} className="flex items-center justify-between gap-3 px-4 py-3">
                            <Link
                              href={href}
                              className="min-w-0 flex-1 text-caption text-secondary transition-colors hover:text-link"
                            >
                              {item.label}
                              <span className="mt-0.5 block text-caption text-muted">
                                {item.itemType === "PRODUCT_PLAN" ? "Subscription plan" : "Service package"}
                              </span>
                            </Link>
                            <span className="tnum shrink-0 text-caption text-muted">
                              {formatBDT(item.valuePoisha)}
                            </span>
                          </li>
                        );
                      })}
                      <li className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-3">
                        <span className="text-caption font-medium text-primary">
                          Bought separately
                        </span>
                        <span className="tnum text-caption text-muted line-through">
                          {formatBDT(bundle.compareAtPoisha)}
                        </span>
                      </li>
                    </ul>

                    <footer className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-5">
                      <div>
                        <p className="text-caption text-muted">Bundle price</p>
                        <p className="tnum text-h2 text-primary">{formatBDT(bundle.pricePoisha)}</p>
                        {saved > 0 ? (
                          <p className="text-caption text-success">
                            You save {formatBDT(saved)}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={`/bundles/${bundle.slug}`}
                        className="inline-flex h-11 items-center gap-1.5 rounded-button bg-accent px-4 text-caption font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                      >
                        View bundle
                        <Icon.ArrowRight size={15} />
                      </Link>
                    </footer>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        <section className="mt-14 rounded-card border border-line bg-surface-1 p-6" aria-labelledby="stacking">
          <h2 id="stacking" className="text-body font-semibold text-primary">
            How bundle pricing stacks
          </h2>
          <p className="mt-3 max-w-3xl text-caption leading-relaxed text-secondary">
            Discounts are applied in one fixed order, and every step is shown separately on the
            cart line and the invoice. The order is:
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", name: "Sale", note: "Any active listing sale price" },
              { step: "2", name: "Bundle", note: "The bundle saving shown here" },
              { step: "3", name: "Student", note: "After verification is approved" },
              { step: "4", name: "Coupon", note: "Applied last, on the reduced amount" },
            ].map((item) => (
              <li key={item.name} className="rounded-input border border-line bg-surface-2 p-4">
                <span className="tnum inline-flex size-6 items-center justify-center rounded-pill bg-accent-soft text-caption font-semibold text-accent">
                  {item.step}
                </span>
                <p className="mt-2 text-caption font-medium text-primary">{item.name}</p>
                <p className="mt-0.5 text-caption text-muted">{item.note}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-caption text-muted">
            A price floor applies: stacked discounts can never take a line below the configured
            minimum, and the floor is enforced server-side, not in the browser.
          </p>
        </section>
      </div>
    </>
  );
}
