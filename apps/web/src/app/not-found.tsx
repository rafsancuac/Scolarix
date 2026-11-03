/**
 * 404 — spec §10.3 error states. Never a dead end: it offers the catalogue,
 * the services and a search box, and says plainly what happened.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { listCategories } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  const categories = listCategories();

  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-card-lg bg-surface-2 text-muted">
        <Icon.Search size={26} />
      </span>

      <p className="tnum mt-6 text-caption font-semibold tracking-[0.12em] text-accent uppercase">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-h1 font-bold tracking-tight text-primary">
        We could not find that page
      </h1>
      <p className="mt-4 max-w-lg text-body text-secondary">
        The link may be old, or the listing may have been removed. We unpublish a product when its
        authorization evidence expires, so a page that used to exist can legitimately stop existing.
      </p>

      <form action="/search" method="get" role="search" className="mt-8 flex w-full max-w-md gap-2">
        <label htmlFor="nf-q" className="sr-only">Search the marketplace</label>
        <input
          id="nf-q"
          name="q"
          type="search"
          placeholder="Search a tool or service…"
          className="h-12 flex-1 rounded-button border border-line bg-surface-1 px-4 text-body text-primary outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-button bg-accent px-5 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/explore"
          className="inline-flex h-11 items-center gap-2 rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent/40 hover:text-link"
        >
          Browse the marketplace
          <Icon.ArrowRight size={14} />
        </Link>
        <Link
          href="/services"
          className="inline-flex h-11 items-center rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent/40 hover:text-link"
        >
          Academic services
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-button px-4 text-caption font-medium text-secondary transition-colors hover:text-primary"
        >
          Back to the homepage
        </Link>
      </div>

      <nav aria-label="Categories" className="mt-12 w-full max-w-2xl">
        <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">
          Popular categories
        </h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex h-10 items-center rounded-pill border border-line bg-surface-1 px-4 text-caption text-secondary transition-colors hover:border-accent/40 hover:text-link"
              >
                {category.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
