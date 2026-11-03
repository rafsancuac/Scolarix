/**
 * Homepage hero — spec §9.1.1.
 *
 * Required elements: headline, subheadline, primary CTA, secondary CTA,
 * trust signals and a working search entry point. No fake urgency, no
 * countdown timers, no invented review counts (§28.5).
 */

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon } from "@/components/ui/icon";

const TRUST_SIGNALS = [
  { icon: "Shield" as const, label: "Authorized sources only", detail: "Disclosure on every listing" },
  { icon: "Wallet" as const, label: "bKash · Nagad · Rocket", detail: "Priced in BDT, VAT shown" },
  { icon: "Bolt" as const, label: "Instant code delivery", detail: "Automated vault fulfilment" },
  { icon: "Users" as const, label: "Student pricing", detail: "Verify once, save all year" },
];

export function Hero({ trendingCount }: { trendingCount: number }) {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradient + grid. Purely visual, hidden from AT, and the
          only place a raw gradient value appears (token lives in globals.css). */}
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [mask-image:radial-gradient(60rem_30rem_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-1/70 px-3.5 py-1.5 text-caption text-secondary backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {trendingCount} authorized tools live in Bangladesh
          </p>

          <h1 className="mt-6 font-display text-display font-bold tracking-tight text-primary [text-wrap:balance] sm:text-[4rem]">
            {BRAND.tagline}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-body text-secondary [text-wrap:pretty] sm:text-[1.0625rem]">
            Pay in Taka for the AI, research, writing and developer tools your coursework and
            career actually need — sourced from authorized channels, delivered instantly, and
            backed by original academic support services from our own specialists.
          </p>

          {/* Search entry point — posts to /search, no JS required (§10.2) */}
          <form
            action="/search"
            method="get"
            role="search"
            className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search tools and services
            </label>
            <div className="relative flex-1">
              <Icon.Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="hero-search"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Try “ChatGPT”, “thesis formatting”, “Canva”…"
                className="h-12 w-full rounded-button border border-line bg-surface-1 pl-11 pr-4 text-body text-primary shadow-sm outline-none transition-colors duration-fast placeholder:text-muted hover:border-line-strong focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover active:translate-y-px"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button border border-line bg-surface-1 px-6 text-body font-medium text-primary transition-colors duration-fast hover:border-accent/40 hover:text-link sm:w-auto"
            >
              Browse the marketplace
              <Icon.ArrowRight size={16} />
            </Link>
            <Link
              href="/services"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button px-6 text-body font-medium text-secondary transition-colors duration-fast hover:text-primary sm:w-auto"
            >
              Request academic support
            </Link>
          </div>

          <ul className="mt-14 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_SIGNALS.map((signal) => {
              const Glyph = Icon[signal.icon];
              return (
                <li
                  key={signal.label}
                  className="rounded-card border border-line bg-surface-1/60 p-4 backdrop-blur-sm"
                >
                  <Glyph size={18} className="text-accent" />
                  <p className="mt-2.5 text-caption font-medium text-primary">{signal.label}</p>
                  <p className="text-caption text-muted">{signal.detail}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
