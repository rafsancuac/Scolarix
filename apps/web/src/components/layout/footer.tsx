/**
 * Footer — spec §9.1.2 and §8.2 route map.
 *
 * Includes the mandatory trademark disclaimer (§3.1.1, §20) and links to all
 * five policy documents required by the Bangladesh legal baseline.
 */

import Link from "next/link";
import { BRAND, TRADEMARK_DISCLAIMER } from "@/lib/brand";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/explore", label: "All tools" },
      { href: "/categories/ai-assistants", label: "AI assistants" },
      { href: "/categories/academic-writing", label: "Academic writing" },
      { href: "/categories/research-tools", label: "Research tools" },
      { href: "/bundles", label: "Bundles" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services", label: "All services" },
      { href: "/services/document-formatting", label: "Document formatting" },
      { href: "/services/citation-management", label: "Citation management" },
      { href: "/services/data-analysis-support", label: "Data analysis support" },
      { href: "/legal/services-policy", label: "Services policy" },
    ],
  },
  {
    title: "For students",
    links: [
      { href: "/students", label: "Student Zone" },
      { href: "/students", label: "Verify your .edu email" },
      { href: "/dashboard", label: "My subscriptions" },
      { href: "/dashboard", label: "Orders and invoices" },
      { href: "/support", label: "Help centre" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of service" },
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/refunds", label: "Refund policy" },
      { href: "/legal/acceptable-use", label: "Acceptable use" },
      { href: "/legal/services-policy", label: "Academic integrity" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-surface-1">
      <div className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_repeat(4,minmax(0,1fr))]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoTile monogram={BRAND.monogram} hue="243" size="sm" label={BRAND.name} />
              <span className="font-display text-body font-bold tracking-tight text-primary">
                {BRAND.name}
              </span>
            </Link>

            <p className="text-caption text-secondary">{BRAND.tagline}</p>

            {!BRAND.cleared ? (
              <p className="inline-flex items-start gap-2 rounded-input border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-warning">
                <Icon.Alert size={14} className="mt-0.5 shrink-0" />
                <span>{BRAND.provisionalLabel}</span>
              </p>
            ) : null}

            <ul className="space-y-2 text-caption text-muted">
              <li className="flex items-center gap-2">
                <Icon.Pin size={14} /> Chattogram, Bangladesh
              </li>
              <li className="flex items-center gap-2">
                <Icon.Mail size={14} /> support@{BRAND.slug}.example
              </li>
              <li className="flex items-center gap-2">
                <Icon.Clock size={14} /> Support: Sat–Thu, 10:00–19:00 (GMT+6)
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              {["bKash", "Nagad", "Rocket", "SSLCommerz"].map((method) => (
                <span
                  key={method}
                  className="rounded-pill border border-line bg-surface-2 px-2.5 py-1 text-caption text-muted"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-caption font-semibold tracking-wide text-primary uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-caption text-secondary transition-colors duration-fast hover:text-link"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <p className="max-w-4xl text-caption leading-relaxed text-muted">
            {TRADEMARK_DISCLAIMER}
          </p>
          <div className="mt-6 flex flex-col gap-3 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {BRAND.name}. Prices shown in Bangladeshi Taka (BDT), inclusive of
              applicable VAT where stated.
            </p>
            <p className="flex items-center gap-2">
              <Icon.Shield size={14} />
              Secure checkout · PCI-compliant gateway · No card or PIN details stored
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
