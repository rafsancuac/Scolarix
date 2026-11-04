/**
 * Homepage — spec §9.1.1. Server component: all data comes from the
 * repository, no price or listing is hardcoded in the template (§6 rule 1).
 */

import type { Metadata } from "next";

import { Hero } from "@/components/home/hero";
import {
  BundleRow,
  CategoryGrid,
  ClosingCta,
  FaqList,
  Section,
  ServiceHighlight,
  VerticalStrip,
} from "@/components/home/sections";
import { ProductCard } from "@/components/marketplace/product-card";
import { BRAND } from "@/lib/brand";
import {
  faqJsonLd,
  breadcrumbJsonLd,
} from "@/lib/metadata";
import {
  listBundles,
  listCategories,
  listFaqs,
  listServices,
  listTrending,
  listTestimonials,
  listVerticals,
} from "@/lib/repository";

export const metadata: Metadata = {
  title: `${BRAND.name} — Authorized AI & academic subscriptions for Bangladesh`,
  description:
    "Pay in Taka for authorized AI, research, writing and developer subscriptions, plus original academic support services. Instant delivery, student pricing, bKash / Nagad / Rocket / card.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const categories = await listCategories();
  const verticals = await listVerticals();
  const trending = await listTrending(6);
  const services = (await listServices()).slice(0, 3);
  const bundles = (await listBundles()).slice(0, 2);
  const faqs = await listFaqs();
  const testimonials = await listTestimonials();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Marketplace", path: "/explore" },
              { name: "Services", path: "/services" },
            ]),
            faqJsonLd(faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
          ]),
        }}
      />

      <Hero trendingCount={trending.length + (await listServices()).length} />

      <Section
        id="categories"
        eyebrow="Browse by need"
        title="Find the right tool for the work in front of you"
        description="Six curated categories covering the AI, academic, professional and developer tools students and early-career professionals in Bangladesh actually use."
        action={{ href: "/explore", label: "All categories" }}
      >
        <CategoryGrid categories={categories} />
      </Section>

      <Section
        id="verticals"
        eyebrow="Five ways to shop"
        title="One marketplace, five clear shelves"
        description="Authorized third-party subscriptions and our own original services are kept visually and structurally separate — you always know which kind of thing you are buying."
      >
        <VerticalStrip verticals={verticals} />
      </Section>

      <Section
        id="trending"
        eyebrow="Most requested this month"
        title="Trending subscriptions"
        description="Every listing shows its sourcing relationship and what you actually receive, before you pay."
        action={{ href: "/explore", label: "See all tools" }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((item) => (
            <ProductCard key={item.product.id} item={item} />
          ))}
        </div>
      </Section>

      <Section
        id="services"
        eyebrow="Vertical B — our own work"
        title="Academic support services, done by our specialists"
        description="Formatting, citations, editing of your own draft, data preparation and statistics guidance. We never write assessed work for you, and every request carries an academic integrity declaration."
        action={{ href: "/services", label: "All services" }}
        className="rounded-none bg-surface-1/50 py-16 sm:py-20"
      >
        <ServiceHighlight services={services} />
      </Section>

      {bundles.length > 0 ? (
        <Section
          id="bundles"
          eyebrow="Save more together"
          title="Bundles"
          description="Bundle pricing is applied after any active sale and before student and coupon discounts — the exact order is shown on every cart line."
          action={{ href: "/bundles", label: "All bundles" }}
        >
          <BundleRow bundles={bundles} />
        </Section>
      ) : null}

      {testimonials.length > 0 ? (
        <Section
          id="testimonials"
          eyebrow="From verified customers"
          title="What students say"
          description="Only testimonials attached to a completed, verified order are shown."
        >
          <ul className="grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li key={testimonial.id} className="card card-elevated p-5">
                <blockquote className="text-caption text-secondary">
                  “{testimonial.quote}”
                </blockquote>
                <footer className="mt-4 border-t border-line pt-3">
                  <p className="text-caption font-medium text-primary">{testimonial.name}</p>
                  <p className="text-caption text-muted">{testimonial.role}</p>
                </footer>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        id="faq"
        eyebrow="Before you buy"
        title="Frequently asked questions"
        description="Answers about authorization, delivery, refunds and student verification."
        action={{ href: "/legal/refunds", label: "Refund policy" }}
      >
        <FaqList faqs={faqs} />
      </Section>

      <ClosingCta brandName={BRAND.name} />
    </>
  );
}
