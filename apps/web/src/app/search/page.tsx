/**
 * Search — spec §8.2 `/search`, §13.16.
 *
 * Server-rendered from the `q` query param so results are indexable, shareable
 * and work without JavaScript. Production swaps the repository's in-memory
 * matcher for Postgres full-text search behind the same interface.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/marketplace/product-card";
import { ServiceCard } from "@/components/marketplace/service-card";
import { Badge } from "@/components/ui/badge";
import { Icon, CATEGORY_ICON, type IconName } from "@/components/ui/icon";
import { listProductItems, getServiceBySlug, listCategories, search } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const SUGGESTIONS = [
  "ChatGPT",
  "Claude",
  "Grammarly",
  "thesis formatting",
  "citation",
  "Canva",
  "data analysis",
  "student",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const hasQuery = query.length > 0;
  const hits = hasQuery ? (await search(query, 24)) : [];

  const allItems = hasQuery ? await listProductItems() : [];
  const productHits = hits
    .filter((hit) => hit.kind === "product")
    .map((hit) => allItems.find((item) => item.product.slug === hit.slug))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  const serviceHits = (
    await Promise.all(
      hits
        .filter((hit) => hit.kind === "service")
        .map((hit) => getServiceBySlug(hit.slug)),
    )
  ).filter((service): service is NonNullable<typeof service> => service !== undefined);

  const categories = await listCategories();

  return (
    <div className="container-page py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-caption text-muted">
        <Link href="/" className="hover:text-link">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-secondary">Search</span>
      </nav>

      <h1 className="font-display text-h1 font-bold tracking-tight text-primary">Search</h1>

      <form action="/search" method="get" role="search" className="mt-6 max-w-2xl">
        <label htmlFor="q" className="sr-only">Search tools and services</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Icon.Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search a tool, a provider or a service…"
              className="h-12 w-full rounded-button border border-line bg-surface-1 pl-11 pr-4 text-body text-primary outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="h-12 shrink-0 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Search
          </button>
        </div>
      </form>

      {!hasQuery ? (
        <div className="mt-10">
          <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">
            Popular searches
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <Link
                  href={`/search?q=${encodeURIComponent(suggestion)}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-line bg-surface-1 px-4 text-caption text-secondary transition-colors hover:border-accent/40 hover:text-link"
                >
                  <Icon.Search size={13} />
                  {suggestion}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-caption font-semibold tracking-wide text-muted uppercase">
            Browse by category
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const iconName: IconName = CATEGORY_ICON[category.slug] ?? "Tag";
              const Glyph = Icon[iconName];
              return (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/40 hover:bg-surface-2"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                      <Glyph size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-caption font-medium text-primary">
                        {category.label}
                      </span>
                      <span className="block truncate text-caption text-muted">
                        {category.itemCount} listing{category.itemCount === 1 ? "" : "s"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-caption text-muted">
              {hits.length} result{hits.length === 1 ? "" : "s"} for{" "}
              <strong className="font-medium text-primary">“{query}”</strong>
            </p>
            <Badge tone="neutral">{productHits.length} tools</Badge>
            <Badge tone="neutral">{serviceHits.length} services</Badge>
            <Link
              href={`/explore?q=${encodeURIComponent(query)}`}
              className="ml-auto text-caption text-link underline underline-offset-4"
            >
              Open in the marketplace with filters
            </Link>
          </div>

          {hits.length === 0 ? (
            <div className="card mt-6 flex flex-col items-center gap-4 px-6 py-16 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-card bg-surface-2 text-muted">
                <Icon.Search size={22} />
              </span>
              <div>
                <h2 className="text-body font-semibold text-primary">
                  Nothing matched “{query}”
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-caption leading-relaxed text-secondary">
                  We list a third-party tool only where we hold authorization evidence or the
                  provider runs a public referral programme — so an unmatched search can mean we
                  genuinely cannot source it legitimately. Request it and we will check the channel.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/explore"
                  className="inline-flex h-11 items-center rounded-button bg-accent px-5 text-caption font-medium text-accent-contrast hover:bg-accent-hover"
                >
                  Browse everything
                </Link>
                <Link
                  href="/services"
                  className="inline-flex h-11 items-center rounded-button border border-line px-5 text-caption font-medium text-primary hover:border-accent/40"
                >
                  Request a service instead
                </Link>
              </div>
              <ul className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.slice(0, 5).map((suggestion) => (
                  <li key={suggestion}>
                    <Link
                      href={`/search?q=${encodeURIComponent(suggestion)}`}
                      className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-caption text-muted hover:text-link"
                    >
                      {suggestion}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              {productHits.length > 0 ? (
                <section aria-labelledby="product-results">
                  <h2 id="product-results" className="text-h3 font-semibold text-primary">
                    Tools & subscriptions
                  </h2>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {productHits.map((item) => (
                      <li key={item.product.id}>
                        <ProductCard item={item} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {serviceHits.length > 0 ? (
                <section aria-labelledby="service-results">
                  <h2 id="service-results" className="text-h3 font-semibold text-primary">
                    Services from our specialists
                  </h2>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {serviceHits.map((service) => (
                      <li key={service.id}>
                        <ServiceCard service={service} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
