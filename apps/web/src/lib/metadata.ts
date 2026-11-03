/**
 * Site metadata — spec §21.1 (SEO) and §3.1 (brand gate).
 *
 * `metadataBase` is derived from `NEXT_PUBLIC_SITE_URL` so that social cards,
 * canonical links and the sitemap stay correct on the real domain, on the
 * preview host and on localhost alike — never hardcoded per environment.
 */

import type { Metadata, Viewport } from "next";
import { BRAND } from "./brand";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadataBase = new URL(siteUrl);

export const defaultMetadata: Metadata = {
  metadataBase,
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "Authorized AI, academic, productivity and developer subscriptions plus original academic support services for students and professionals in Bangladesh. Prices in BDT, pay with bKash, Nagad, Rocket or card.",
  applicationName: BRAND.name,
  keywords: [
    "AI subscription Bangladesh",
    "ChatGPT Plus Bangladesh",
    "Claude Pro BDT",
    "academic writing tools",
    "student discount Bangladesh",
    "Grammarly Premium",
    "Canva Pro",
    "thesis formatting service",
    "citation management",
    "bKash payment subscription",
  ],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Authorized AI and academic subscriptions plus original academic support services. BDT pricing, bKash / Nagad / Rocket / card.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Authorized AI and academic subscriptions plus original academic support services. BDT pricing, local mobile wallets accepted.",
  },
  robots: {
    index: process.env.NEXT_PUBLIC_ROBOTS_INDEX !== "false",
    follow: process.env.NEXT_PUBLIC_ROBOTS_INDEX !== "false",
    googleBot: {
      index: process.env.NEXT_PUBLIC_ROBOTS_INDEX !== "false",
      follow: process.env.NEXT_PUBLIC_ROBOTS_INDEX !== "false",
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const defaultViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

/**
 * Organization JSON-LD. Intentionally conservative: no `aggregateRating` or
 * review markup until real, attributable reviews exist (§28.5 — no fake
 * reviews), and no `price` on the Organization node (prices come from the
 * repository on product pages only).
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    slogan: BRAND.tagline,
    url: siteUrl,
    areaServed: "BD",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chattogram",
      addressCountry: "BD",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["en"],
    },
  };
}

/** Product JSON-LD built from repository data — never from hardcoded copy. */
export function productJsonLd(args: {
  name: string;
  description: string;
  slug: string;
  pricePoisha: number | null;
  availability: string;
  brandName: string;
}) {
  const { name, description, slug, pricePoisha, availability, brandName } = args;
  const inStock = availability === "IN_STOCK" || availability === "LOW_STOCK";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: `${siteUrl}/products/${slug}`,
    brand: { "@type": "Brand", name: brandName },
    ...(pricePoisha !== null && pricePoisha > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BDT",
            lowPrice: (pricePoisha / 100).toFixed(2),
            highPrice: (pricePoisha / 100).toFixed(2),
            offerCount: 1,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: "0",
            availability: "https://schema.org/OutOfStock",
          },
        }),
  };
}

/** Service JSON-LD for Vertical B listings. */
export function serviceJsonLd(args: {
  name: string;
  description: string;
  slug: string;
  pricePoisha: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: args.name,
    description: args.description,
    url: `${siteUrl}/services/${args.slug}`,
    serviceType: "Academic support service",
    areaServed: { "@type": "Country", name: "Bangladesh" },
    provider: { "@type": "Organization", name: BRAND.name },
    ...(args.pricePoisha && args.pricePoisha > 0
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: (args.pricePoisha / 100).toFixed(2),
          },
        }
      : {}),
  };
}

/** FAQPage JSON-LD from repository FAQ records. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** BreadcrumbList JSON-LD. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}
