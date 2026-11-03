/**
 * Navbar — spec §9.1.2: sticky, transparent-to-solid, full keyboard operation,
 * mobile drawer with focus trap. Responsive matrix (§10.1): full navigation on
 * desktop, compact on tablet, drawer on mobile.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoTile } from "@/components/ui/logo-tile";

interface NavItem {
  href: string;
  label: string;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/explore", label: "Explore" },
  { href: "/services", label: "Services" },
  { href: "/bundles", label: "Bundles" },
  { href: "/students", label: "Student Zone" },
  { href: "/pricing", label: "Pricing" },
];

const CATEGORY_NAV: (NavItem & { icon: IconName })[] = [
  { href: "/categories/ai-assistants", label: "AI Assistants", icon: "Sparkle" },
  { href: "/categories/academic-writing", label: "Academic Writing", icon: "Book" },
  { href: "/categories/research-tools", label: "Research Tools", icon: "Search" },
  { href: "/categories/productivity", label: "Design & Productivity", icon: "Palette" },
  { href: "/categories/development", label: "Developer Tools", icon: "Code" },
  { href: "/categories/language-learning", label: "Language & Learning", icon: "Globe" },
];

export function Navbar({ brandName }: { brandName: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on navigation and on Escape; trap focus while open.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        openButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-contrast"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-base ease-brand ${
          scrolled
            ? "border-b border-line bg-surface-1/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="container-page flex h-[var(--spacing-header)] items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-button pr-2"
            aria-label={`${brandName} home`}
          >
            <LogoTile monogram={brandName.slice(0, 2).toUpperCase()} hue="243" size="sm" label={brandName} />
            <span className="font-display text-body font-bold tracking-tight text-primary">
              {brandName}
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={`rounded-button px-3 py-2 text-caption font-medium transition-colors duration-fast ${
                  pathname.startsWith(item.href)
                    ? "bg-accent-soft text-accent"
                    : "text-secondary hover:bg-surface-2 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/explore"
              className="hidden h-11 items-center gap-2 rounded-button border border-line px-3 text-caption text-muted transition-colors hover:border-accent/40 hover:text-primary md:inline-flex"
            >
              <Icon.Search size={15} />
              <span>Search tools and services…</span>
            </Link>

            <ThemeToggle />

            <Link
              href="/dashboard"
              className="hidden h-11 items-center rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent/40 sm:inline-flex"
            >
              Sign in
            </Link>

            <Link
              href="/explore"
              className="hidden h-11 items-center rounded-button bg-accent px-4 text-caption font-medium text-accent-contrast transition-colors hover:bg-accent-hover sm:inline-flex"
            >
              Get started
            </Link>

            <button
              ref={openButtonRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              className="inline-flex size-11 items-center justify-center rounded-button border border-line text-secondary transition-colors hover:text-primary lg:hidden"
            >
              <Icon.Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-midnight/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto border-l border-line bg-surface-1"
          >
            <div className="flex h-[var(--spacing-header)] items-center justify-between border-b border-line px-4">
              <span className="font-display text-body font-bold text-primary">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-11 items-center justify-center rounded-button border border-line text-secondary hover:text-primary"
              >
                <Icon.Close size={18} />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex flex-col gap-1 p-4">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-button px-3 py-3 text-body font-medium text-primary transition-colors hover:bg-surface-2"
                >
                  {item.label}
                </Link>
              ))}

              <p className="mt-4 px-3 text-caption font-medium text-muted">Categories</p>
              {CATEGORY_NAV.map((item) => {
                const Glyph = Icon[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-button px-3 py-2.5 text-caption text-secondary transition-colors hover:bg-surface-2 hover:text-primary"
                  >
                    <Glyph size={16} />
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-4 grid gap-2 border-t border-line pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center rounded-button border border-line text-body font-medium text-primary"
                >
                  Sign in
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex h-12 items-center justify-center rounded-button bg-accent text-body font-medium text-accent-contrast"
                >
                  Get started
                </Link>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
