/**
 * Product detail — spec §9.2.2.
 *
 * Mandatory elements: gallery/logo, name, provider, offering-type badge,
 * authorization / sourcing disclosure, plan picker with synchronized CTA,
 * feature list, delivery information, refund eligibility, activation guide,
 * product FAQ, related products and breadcrumbs.
 *
 * The compliance gate is evaluated server-side (§11.2) and passed to the
 * client picker as a read-only verdict — the client cannot make an
 * unpurchasable listing purchasable.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlanPicker } from "@/components/marketplace/plan-picker";
import { ProductCard } from "@/components/marketplace/product-card";
import { Badge, OfferingTypeBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LogoTile } from "@/components/ui/logo-tile";
import { BRAND } from "@/lib/brand";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/metadata";
import {
  availabilityOf,
  cheapestActivePlan,
  evaluatePurchaseGate,
  getCategory,
  getProductBySlug,
  listProducts,
  listRelated,
} from "@/lib/repository";
import type { Product } from "@/lib/types";

export function generateStaticParams() {
  return listProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };

  const category = getCategory(product.categorySlug);
  return {
    title: `${product.name} price in Bangladesh`,
    description: `${product.shortDescription} Sourced through ${product.relationshipLabel.toLowerCase()}. ${product.disclosureText}`,
    alternates: { canonical: `/products/${product.slug}` },
    keywords: [product.name, product.provider, category?.label ?? "", "BDT", "Bangladesh"],
  };
}

const AVAILABILITY_COPY = {
  IN_STOCK: { label: "Available now", tone: "success" as const },
  LOW_STOCK: { label: "Low stock", tone: "warning" as const },
  UNAVAILABLE: { label: "Not available", tone: "danger" as const },
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const gate = evaluatePurchaseGate(product);
  const availability = availabilityOf(product);
  const cheapest = cheapestActivePlan(product);
  const category = getCategory(product.categorySlug);
  const related = listRelated(product, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Marketplace", path: "/explore" },
              ...(category ? [{ name: category.label, path: `/categories/${category.slug}` }] : []),
              { name: product.name, path: `/products/${product.slug}` },
            ]),
            productJsonLd({
              name: product.name,
              description: product.shortDescription,
              slug: product.slug,
              pricePoisha: cheapest?.pricePoisha ?? null,
              availability,
              brandName: product.provider,
            }),
          ]),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-6">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
              <li>
                <Link href="/" className="hover:text-link">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/explore" className="hover:text-link">Marketplace</Link>
              </li>
              {category ? (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href={`/categories/${category.slug}`} className="hover:text-link">
                      {category.label}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-secondary">{product.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="container-page py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
          {/* ---------------------------------------------------------- */}
          {/* Main column                                                  */}
          {/* ---------------------------------------------------------- */}
          <div className="min-w-0">
            <header className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <OfferingTypeBadge offeringType={product.offeringType} />
                <Badge tone={AVAILABILITY_COPY[availability].tone}>
                  {AVAILABILITY_COPY[availability].label}
                </Badge>
                {product.isStudentEligible ? (
                  <Badge tone="accent">
                    <Icon.Users size={12} /> Student pricing
                  </Badge>
                ) : null}
                {product.isBestseller ? <Badge tone="info">Popular choice</Badge> : null}
              </div>

              <div className="flex items-start gap-4">
                <LogoTile
                  monogram={product.monogram}
                  hue={product.accentHue}
                  size="lg"
                  label={product.name}
                />
                <div className="min-w-0">
                  <h1 className="font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
                    {product.name}
                  </h1>
                  <p className="mt-1.5 text-body text-secondary">
                    by {product.provider}
                    {category ? ` · ${category.label}` : ""}
                  </p>
                </div>
              </div>

              <p className="max-w-2xl text-body text-secondary [text-wrap:pretty]">
                {product.shortDescription}
              </p>
            </header>

            {/* Authorization / sourcing disclosure (§11.7 — shown above the fold) */}
            <DisclosurePanel product={product} />

            <section className="mt-12" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-h3 font-semibold text-primary">
                About {product.name}
              </h2>
              <p className="mt-4 max-w-2xl text-body leading-relaxed text-secondary [text-wrap:pretty]">
                {product.description}
              </p>
            </section>

            {product.features.length > 0 ? (
              <section className="mt-12" aria-labelledby="features-heading">
                <h2 id="features-heading" className="text-h3 font-semibold text-primary">
                  What is included
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {product.features.map((feature) => (
                    <li
                      key={feature.id}
                      className="flex items-start gap-3 rounded-input border border-line bg-surface-1 p-4"
                    >
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-pill bg-success/15 text-success">
                        <Icon.Check size={13} />
                      </span>
                      <span className="text-caption text-secondary">{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {product.activationGuide.length > 0 ? (
              <section className="mt-12" aria-labelledby="activation-heading">
                <h2 id="activation-heading" className="text-h3 font-semibold text-primary">
                  How activation works
                </h2>
                <ol className="mt-5 space-y-3">
                  {product.activationGuide.map((step, index) => (
                    <li key={step} className="flex items-start gap-4">
                      <span className="tnum inline-flex size-8 shrink-0 items-center justify-center rounded-pill border border-line bg-surface-1 text-caption font-semibold text-accent">
                        {index + 1}
                      </span>
                      <p className="pt-1.5 text-caption leading-relaxed text-secondary">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {product.faqs.length > 0 ? (
              <section className="mt-12" aria-labelledby="faq-heading">
                <h2 id="faq-heading" className="text-h3 font-semibold text-primary">
                  Questions about {product.name}
                </h2>
                <div className="mt-5 divide-y divide-line rounded-card border border-line bg-surface-1">
                  {product.faqs.map((faq) => (
                    <details key={faq.id} className="group px-5 py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-caption font-medium text-primary [&::-webkit-details-marker]:hidden">
                        {faq.question}
                        <Icon.Chevron
                          size={16}
                          className="shrink-0 text-muted transition-transform duration-base group-open:rotate-180"
                        />
                      </summary>
                      <p className="mt-3 text-caption leading-relaxed text-secondary">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Sticky purchase column                                       */}
          {/* ---------------------------------------------------------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PlanPicker product={product} gate={gate} />

            <div className="card mt-4 p-5">
              <h2 className="text-caption font-semibold text-primary">Buying with confidence</h2>
              <ul className="mt-3 space-y-2.5">
                <Assurance
                  icon="Wallet"
                  text="Pay with bKash, Nagad, Rocket or card through a licensed Bangladeshi gateway."
                />
                <Assurance
                  icon="Shield"
                  text="We never ask for your card number, PIN or OTP — payment happens on the gateway page."
                />
                <Assurance
                  icon="File"
                  text="Every order generates a VAT-compliant invoice you can download from your dashboard."
                />
                <Assurance
                  icon="Clock"
                  text={
                    product.deliverySlaHours <= 0
                      ? "Codes are released automatically the moment payment is verified."
                      : `Our team delivers within ${product.deliverySlaHours} business hours, or you are refunded.`
                  }
                />
              </ul>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20" aria-labelledby="related-heading">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-h2 font-bold tracking-tight text-primary">
                Related tools
              </h2>
              <Link
                href={`/explore?category=${product.categorySlug}`}
                className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
              >
                More in {category?.label ?? "this category"}
                <Icon.ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.product.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-16 border-t border-line pt-8 text-caption leading-relaxed text-muted">
          {BRAND.name} is an independent reseller and service provider. {product.name} is a
          trademark of {product.provider}. This listing describes the sourcing relationship as
          “{product.relationshipLabel}” and does not imply endorsement by {product.provider}.
        </p>
      </div>
    </>
  );
}

function DisclosurePanel({ product }: { product: Product }) {
  const isReferral = product.offeringType === "EDUCATION_REFERRAL";
  const tone = isReferral ? "accent" : product.authorizationStatus === "AUTHORIZED_RESELLER" ? "success" : "info";

  return (
    <section
      aria-labelledby="disclosure-heading"
      className="mt-8 rounded-card border border-line bg-surface-1 p-5 sm:p-6"
    >
      <h2 id="disclosure-heading" className="flex items-center gap-2 text-body font-semibold text-primary">
        <Icon.Shield size={17} className={tone === "success" ? "text-success" : "text-accent"} />
        Authorization & sourcing disclosure
      </h2>

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <DisclosureRow term="Relationship" definition={product.relationshipLabel} />
        <DisclosureRow term="Offering type" definition={offeringCopy(product.offeringType)} />
        <DisclosureRow term="You receive" definition={product.disclosureText} wide />
        {product.supplier ? (
          <DisclosureRow
            term="Fulfilled by"
            definition={`${product.supplier.legalName} (${product.supplier.agreementType})`}
          />
        ) : null}
      </dl>

      {isReferral ? (
        <p className="mt-4 rounded-input border border-accent/25 bg-accent-soft px-4 py-3 text-caption leading-relaxed text-secondary">
          <strong className="font-medium text-primary">How an education referral works: </strong>
          you are sent the provider&apos;s official education programme link. You apply with your own
          academic email and the provider grants the discount directly. {BRAND.name} never touches
          your account credentials and is not the seller of record for this item.
        </p>
      ) : null}
    </section>
  );
}

function DisclosureRow({
  term,
  definition,
  wide,
}: {
  term: string;
  definition: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-caption text-muted">{term}</dt>
      <dd className="mt-0.5 text-caption leading-relaxed text-primary">{definition}</dd>
    </div>
  );
}

function Assurance({ icon, text }: { icon: keyof typeof Icon; text: string }) {
  const Glyph = Icon[icon];
  return (
    <li className="flex items-start gap-2.5">
      <Glyph size={15} className="mt-0.5 shrink-0 text-accent" />
      <span className="text-caption leading-relaxed text-secondary">{text}</span>
    </li>
  );
}

function offeringCopy(offeringType: Product["offeringType"]): string {
  switch (offeringType) {
    case "PERSONAL_SUBSCRIPTION":
      return "Personal subscription for one named user";
    case "GIFT_VOUCHER":
      return "Gift voucher or redemption code";
    case "INSTITUTIONAL_LICENSE":
      return "Institutional licence assigned by your organization";
    case "EDUCATION_REFERRAL":
      return "Education referral — the provider grants the discount";
    case "OWN_PRODUCT":
      return "Our own product";
    case "SERVICE":
      return "Service delivered by our specialists";
  }
}
