/**
 * Category — spec §8.2 `/categories/[slug]`.
 *
 * Reuses the product card grid; filters to one category and shows the
 * category blurb plus a link into the full marketplace with the category
 * pre-applied.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/marketplace/product-card";
import { Badge } from "@/components/ui/badge";
import { Icon, CATEGORY_ICON, type IconName } from "@/components/ui/icon";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { getCategory, listByCategory, listCategories, listServices } from "@/lib/repository";
import type { CategorySlug } from "@/lib/types";
import { VERTICAL_META } from "@/lib/types";

export async function generateStaticParams() {
  return (await listCategories()).map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };

  return {
    title: `${category.label} tools in Bangladesh`,
    description: `${category.blurb}. Authorized ${category.label.toLowerCase()} subscriptions priced in BDT, with sourcing disclosure on every listing.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const items = await listByCategory(slug as CategorySlug);
  const purchasable = items.filter((item) => item.availability !== "UNAVAILABLE");
  const relatedServices = (await listServices()).filter((service) =>
    service.categoryLabel.toLowerCase().includes(category.label.split(" ")[0]!.toLowerCase()),
  );
  const iconName: IconName = CATEGORY_ICON[category.slug] ?? "Tag";
  const Glyph = Icon[iconName];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Marketplace", path: "/explore" },
              { name: category.label, path: `/categories/${category.slug}` },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-12 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/explore" className="hover:text-link">Marketplace</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">{category.label}</span>
          </nav>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-card bg-accent-soft text-accent">
              <Glyph size={26} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{VERTICAL_META[category.vertical].label} vertical</Badge>
                <Badge tone="neutral">
                  {items.length} {items.length === 1 ? "listing" : "listings"}
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-h1 font-bold tracking-tight text-primary">
                {category.label}
              </h1>
              <p className="mt-3 max-w-2xl text-body text-secondary [text-wrap:pretty]">
                {category.blurb}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-20 text-center">
            <h2 className="text-body font-semibold text-primary">Nothing listed here yet</h2>
            <p className="max-w-md text-caption text-secondary">
              We publish a category only once it has at least one listing with current
              authorization evidence.
            </p>
            <Link
              href="/explore"
              className="mt-2 inline-flex h-11 items-center rounded-button bg-accent px-5 text-caption font-medium text-accent-contrast hover:bg-accent-hover"
            >
              Browse all tools
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-caption text-muted">
                {purchasable.length} of {items.length} available to buy now
              </p>
              <Link
                href={`/explore?category=${category.slug}`}
                className="group inline-flex h-10 items-center gap-1.5 rounded-button border border-line px-3.5 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
              >
                Filter and sort in the marketplace
                <Icon.ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <li key={item.product.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          </>
        )}

        {relatedServices.length > 0 ? (
          <section className="mt-16 rounded-card border border-line bg-surface-1 p-6" aria-labelledby="related-services">
            <h2 id="related-services" className="text-body font-semibold text-primary">
              Need a person, not a tool?
            </h2>
            <p className="mt-2 text-caption text-secondary">
              Our own specialists handle work in this area under a fixed quote.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {relatedServices.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex h-10 items-center gap-2 rounded-button border border-line px-3.5 text-caption text-secondary transition-colors hover:border-accent/40 hover:text-link"
                  >
                    <Icon.Tools size={14} />
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav aria-label="Other categories" className="mt-16 border-t border-line pt-10">
          <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">
            Other categories
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {(await listCategories())
              .filter((other) => other.slug !== category.slug)
              .map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/categories/${other.slug}`}
                    className="inline-flex h-10 items-center rounded-button border border-line px-3.5 text-caption text-secondary transition-colors hover:border-accent/40 hover:text-primary"
                  >
                    {other.label}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
