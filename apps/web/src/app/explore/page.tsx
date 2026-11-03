/**
 * Marketplace — spec §8.2 `/explore`, §9.2.1.
 *
 * Required controls: search, category filter, vertical filter, offering-type
 * filter, student-only toggle, in-stock toggle, sort, and pagination. All
 * filters are URL query params so results are shareable and the page works
 * with JavaScript disabled (§10.2 progressive enhancement).
 */

import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/marketplace/product-card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BRAND } from "@/lib/brand";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { listCategories, listProductItems, listVerticals } from "@/lib/repository";
import type { BrandVertical, OfferingType } from "@/lib/types";
import { OFFERING_TYPE_LABEL, VERTICAL_META } from "@/lib/types";

export const metadata: Metadata = {
  title: "Marketplace — AI, academic & pro tools",
  description:
    "Browse authorized AI, academic, productivity and developer subscriptions available in Bangladesh. Filter by category, offering type, student pricing and availability. Prices in BDT.",
  alternates: { canonical: "/explore" },
};

const PAGE_SIZE = 12;

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "name", label: "Name A–Z" },
];

interface ExploreParams {
  q?: string;
  category?: string;
  vertical?: string;
  offering?: string;
  student?: string;
  available?: string;
  sort?: string;
  page?: string;
}

function sortItems(items: ReturnType<typeof listProductItems>, sort: SortKey) {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort(
        (a, b) => (a.fromPricePoisha ?? Number.MAX_SAFE_INTEGER) - (b.fromPricePoisha ?? Number.MAX_SAFE_INTEGER),
      );
    case "price-desc":
      return sorted.sort((a, b) => (b.fromPricePoisha ?? 0) - (a.fromPricePoisha ?? 0));
    case "name":
      return sorted.sort((a, b) => a.product.name.localeCompare(b.product.name));
    case "featured":
    default:
      return sorted.sort((a, b) => {
        if (a.product.isFeatured !== b.product.isFeatured) return a.product.isFeatured ? -1 : 1;
        if (a.product.isTrending !== b.product.isTrending) return a.product.isTrending ? -1 : 1;
        return a.product.name.localeCompare(b.product.name);
      });
  }
}

/** Rebuilds the query string with one param changed — keeps filters shareable. */
function hrefWith(current: ExploreParams, patch: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  const merged: ExploreParams = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === "string" && value.length > 0) params.set(key, value);
  }
  // Changing a filter resets pagination; only an explicit page patch survives.
  if (!("page" in patch)) params.delete("page");
  const query = params.toString();
  return query ? `/explore?${query}` : "/explore";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<ExploreParams>;
}) {
  const params = await searchParams;
  const categories = listCategories();
  const verticals = listVerticals();

  const query = (params.q ?? "").trim();
  const category = params.category;
  const vertical = params.vertical as BrandVertical | undefined;
  const offering = params.offering as OfferingType | undefined;
  const studentOnly = params.student === "1";
  const availableOnly = params.available === "1";
  const sort = (SORTS.find((s) => s.key === params.sort)?.key ?? "featured") as SortKey;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let items = listProductItems();

  if (query) {
    const needle = query.toLowerCase();
    items = items.filter((item) =>
      [item.product.name, item.product.provider, item.product.shortDescription, item.product.categorySlug]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  if (category) items = items.filter((item) => item.product.categorySlug === category);
  if (vertical) items = items.filter((item) => item.product.vertical === vertical);
  if (offering) items = items.filter((item) => item.product.offeringType === offering);
  if (studentOnly) items = items.filter((item) => item.product.isStudentEligible);
  if (availableOnly) items = items.filter((item) => item.availability !== "UNAVAILABLE");

  items = sortItems(items, sort);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilters = [
    query ? { label: `Search: “${query}”`, clear: hrefWith(params, { q: undefined }) } : null,
    category
      ? {
          label: categories.find((c) => c.slug === category)?.label ?? category,
          clear: hrefWith(params, { category: undefined }),
        }
      : null,
    vertical
      ? { label: VERTICAL_META[vertical]?.label ?? vertical, clear: hrefWith(params, { vertical: undefined }) }
      : null,
    offering
      ? { label: OFFERING_TYPE_LABEL[offering] ?? offering, clear: hrefWith(params, { offering: undefined }) }
      : null,
    studentOnly ? { label: "Student eligible", clear: hrefWith(params, { student: undefined }) } : null,
    availableOnly ? { label: "Available now", clear: hrefWith(params, { available: undefined }) } : null,
  ].filter((filter): filter is { label: string; clear: string } => filter !== null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Marketplace", path: "/explore" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-10 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Marketplace</span>
          </nav>
          <h1 className="font-display text-h1 font-bold tracking-tight text-primary">Marketplace</h1>
          <p className="mt-3 max-w-2xl text-body text-secondary">
            {items.length} authorized {items.length === 1 ? "listing" : "listings"} in Taka. Each
            one states how it is sourced and exactly what you receive.
          </p>
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[var(--spacing-sidebar)_minmax(0,1fr)]">
        {/* ------------------------------------------------------------- */}
        {/* Filters — collapsible on mobile, persistent rail on desktop    */}
        {/* ------------------------------------------------------------- */}
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <details open className="card p-4 lg:block lg:border-0 lg:bg-transparent lg:p-0">
            <summary className="flex cursor-pointer list-none items-center justify-between text-body font-semibold text-primary lg:hidden [&::-webkit-details-marker]:hidden">
              Filters
              <Icon.Chevron size={18} className="text-muted" />
            </summary>

            <div className="mt-4 space-y-6 lg:mt-0">
              <FilterGroup label="Search">
                <form action="/explore" method="get" role="search">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {vertical ? <input type="hidden" name="vertical" value={vertical} /> : null}
                  {offering ? <input type="hidden" name="offering" value={offering} /> : null}
                  {studentOnly ? <input type="hidden" name="student" value="1" /> : null}
                  {availableOnly ? <input type="hidden" name="available" value="1" /> : null}
                  <input type="hidden" name="sort" value={sort} />
                  <div className="relative">
                    <Icon.Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                      type="search"
                      name="q"
                      defaultValue={query}
                      placeholder="Search tools…"
                      aria-label="Search the marketplace"
                      className="h-11 w-full rounded-button border border-line bg-surface-1 pl-9 pr-3 text-caption text-primary outline-none transition-colors placeholder:text-muted focus:border-accent"
                    />
                  </div>
                </form>
              </FilterGroup>

              <FilterGroup label="Category">
                <FilterLinks
                  hrefBase={(value) => hrefWith(params, { category: value || undefined })}
                  options={[
                    { value: "", label: "All categories", count: items.length },
                    ...categories.map((c) => ({ value: c.slug, label: c.label, count: c.itemCount })),
                  ]}
                  active={category ?? ""}
                />
              </FilterGroup>

              <FilterGroup label="Vertical">
                <FilterLinks
                  hrefBase={(value) => hrefWith(params, { vertical: value || undefined })}
                  options={[
                    { value: "", label: "All verticals", count: items.length },
                    ...verticals.map((v) => ({
                      value: v.slug,
                      label: v.label,
                      count: v.itemCount,
                    })),
                  ]}
                  active={vertical ?? ""}
                />
              </FilterGroup>

              <FilterGroup label="Offering type">
                <FilterLinks
                  hrefBase={(value) => hrefWith(params, { offering: value || undefined })}
                  options={[
                    { value: "", label: "All types" },
                    ...(["PERSONAL_SUBSCRIPTION", "GIFT_VOUCHER", "INSTITUTIONAL_LICENSE", "EDUCATION_REFERRAL"] as OfferingType[]).map(
                      (type) => ({ value: type, label: OFFERING_TYPE_LABEL[type] }),
                    ),
                  ]}
                  active={offering ?? ""}
                />
              </FilterGroup>

              <FilterGroup label="Options">
                <div className="space-y-1">
                  <FilterToggle
                    label="Student eligible"
                    href={hrefWith(params, { student: studentOnly ? undefined : "1" })}
                    active={studentOnly}
                  />
                  <FilterToggle
                    label="Available now"
                    href={hrefWith(params, { available: availableOnly ? undefined : "1" })}
                    active={availableOnly}
                  />
                </div>
              </FilterGroup>

              {activeFilters.length > 0 ? (
                <Link
                  href="/explore"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-button border border-line text-caption font-medium text-secondary transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Icon.Close size={14} />
                  Clear all filters
                </Link>
              ) : null}
            </div>
          </details>
        </aside>

        {/* ------------------------------------------------------------- */}
        {/* Results                                                        */}
        {/* ------------------------------------------------------------- */}
        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p aria-live="polite" className="text-caption text-muted">
                Showing {pageItems.length} of {items.length}
              </p>
              {activeFilters.map((filter) => (
                <Link key={filter.label} href={filter.clear}>
                  <Badge tone="info" className="cursor-pointer hover:opacity-80">
                    {filter.label}
                    <Icon.Close size={11} />
                  </Badge>
                </Link>
              ))}
            </div>

            <form action="/explore" method="get" className="flex items-center gap-2">
              {query ? <input type="hidden" name="q" value={query} /> : null}
              {category ? <input type="hidden" name="category" value={category} /> : null}
              {vertical ? <input type="hidden" name="vertical" value={vertical} /> : null}
              {offering ? <input type="hidden" name="offering" value={offering} /> : null}
              {studentOnly ? <input type="hidden" name="student" value="1" /> : null}
              {availableOnly ? <input type="hidden" name="available" value="1" /> : null}
              <label htmlFor="sort" className="text-caption text-muted">Sort</label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="h-10 rounded-button border border-line bg-surface-1 px-3 text-caption text-primary outline-none focus:border-accent"
              >
                {SORTS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <noscript>
                <button
                  type="submit"
                  className="h-10 rounded-button border border-line px-3 text-caption text-primary"
                >
                  Apply
                </button>
              </noscript>
            </form>
          </div>

          {pageItems.length === 0 ? (
            <div className="card flex flex-col items-center gap-4 px-6 py-20 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-card bg-surface-2 text-muted">
                <Icon.Search size={22} />
              </span>
              <div>
                <h2 className="text-body font-semibold text-primary">No listings match those filters</h2>
                <p className="mt-2 max-w-md text-caption text-secondary">
                  Try clearing a filter or searching for a provider name. If we cannot source a tool
                  through an authorized channel, we do not list it — request it and we will check.
                </p>
              </div>
              <Link
                href="/explore"
                className="inline-flex h-11 items-center rounded-button bg-accent px-5 text-caption font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((item) => (
                <li key={item.product.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
              {currentPage > 1 ? (
                <PageLink params={params} page={currentPage - 1} label="Previous" rel="prev" />
              ) : null}
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
                <PageLink
                  key={n}
                  params={params}
                  page={n}
                  label={String(n)}
                  current={n === currentPage}
                />
              ))}
              {currentPage < totalPages ? (
                <PageLink params={params} page={currentPage + 1} label="Next" rel="next" />
              ) : null}
            </nav>
          ) : null}

          <p className="mt-8 text-caption text-muted">
            {BRAND.name} lists a third-party subscription only where we hold authorization evidence
            or the provider operates a public referral programme. Listings without that evidence are
            marked not available and cannot be purchased.
          </p>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter primitives                                                           */
/* -------------------------------------------------------------------------- */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2.5 text-caption font-semibold tracking-wide text-primary uppercase">
        {label}
      </h2>
      {children}
    </div>
  );
}

function FilterLinks({
  options,
  active,
  hrefBase,
}: {
  options: { value: string; label: string; count?: number }[];
  active: string;
  hrefBase: (value: string) => string;
}) {
  return (
    <ul className="space-y-0.5">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <li key={option.value || "all"}>
            <Link
              href={hrefBase(option.value)}
              aria-current={isActive ? "true" : undefined}
              className={`flex items-center justify-between gap-2 rounded-button px-2.5 py-2 text-caption transition-colors duration-fast ${
                isActive
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-secondary hover:bg-surface-2 hover:text-primary"
              }`}
            >
              <span>{option.label}</span>
              {typeof option.count === "number" ? (
                <span className="tnum text-caption text-muted">{option.count}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FilterToggle({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      role="checkbox"
      aria-checked={active}
      className={`flex items-center gap-2.5 rounded-button px-2.5 py-2 text-caption transition-colors duration-fast ${
        active ? "text-primary" : "text-secondary hover:bg-surface-2 hover:text-primary"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
          active ? "border-accent bg-accent text-accent-contrast" : "border-line-strong bg-surface-1"
        }`}
      >
        {active ? <Icon.Check size={11} /> : null}
      </span>
      {label}
    </Link>
  );
}

function PageLink({
  params,
  page,
  label,
  current,
  rel,
}: {
  params: ExploreParams;
  page: number;
  label: string;
  current?: boolean;
  rel?: "prev" | "next";
}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") next.set(key, value);
  }
  next.set("page", String(page));
  const search = next.toString();

  return (
    <Link
      href={`/explore?${search}`}
      rel={rel}
      aria-current={current ? "page" : undefined}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-button border px-3 text-caption font-medium transition-colors duration-fast ${
        current
          ? "border-accent bg-accent text-accent-contrast"
          : "border-line text-secondary hover:border-accent/40 hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
