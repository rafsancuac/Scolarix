/**
 * Pricing — spec §8.2 `/pricing`.
 *
 * A comparison table built entirely from repository data. No price appears in
 * this template; every figure is read from the catalogue at render time
 * (§6 rule 1), and the effective monthly rate is computed by `money.ts`.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Badge, OfferingTypeBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { effectiveMonthlyPoisha, formatBDT, savingsPoisha } from "@/lib/money";
import { formatDurationDays } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { listProductItems } from "@/lib/repository";
import { RENEWAL_LABEL } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pricing in BDT",
  description:
    "Every subscription price in Bangladeshi Taka, with the effective monthly rate, student price, renewal capability and refund terms. No hidden conversion fees.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const items = (await listProductItems()).sort((a, b) =>
    a.product.name.localeCompare(b.product.name),
  );
  const pricedRows = items.filter((item) => item.fromPricePoisha !== null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Pricing", path: "/pricing" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Pricing</span>
          </nav>
          <h1 className="max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            Every price, in Taka, in one table
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            Prices are maintained in the catalogue, not in the page — so what you see here is what
            checkout will charge. The effective monthly rate lets you compare a 30-day plan against
            a 365-day plan honestly.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="neutral"><Icon.Wallet size={12} /> BDT, integer poisha internally</Badge>
            <Badge tone="neutral"><Icon.Shield size={12} /> VAT shown at checkout</Badge>
            <Badge tone="neutral"><Icon.Users size={12} /> Student prices listed separately</Badge>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse text-caption">
              <caption className="sr-only">
                Subscription prices in Bangladeshi Taka, with effective monthly rate, student price,
                renewal capability and refund terms.
              </caption>
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-primary">Tool</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-primary">Offering</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-primary">Plans</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-primary">From</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-primary">
                    Effective / month
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-primary">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-primary">Renewal</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-primary">Refunds</th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pricedRows.map((item) => {
                  const { product } = item;
                  const cheapest = product.plans
                    .filter((plan) => plan.active)
                    .sort((a, b) => a.pricePoisha - b.pricePoisha)[0];
                  const bestValue = [...product.plans]
                    .filter((plan) => plan.active && plan.durationDays > 0)
                    .sort(
                      (a, b) =>
                        effectiveMonthlyPoisha(a.pricePoisha, a.durationDays) -
                        effectiveMonthlyPoisha(b.pricePoisha, b.durationDays),
                    )[0];
                  const studentPrice = product.plans
                    .map((plan) => plan.studentPricePoisha)
                    .filter((value): value is number => typeof value === "number")
                    .sort((a, b) => a - b)[0];
                  const sale = cheapest
                    ? savingsPoisha(cheapest.pricePoisha, cheapest.compareAtPoisha)
                    : null;

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-surface-2/60">
                      <th scope="row" className="px-4 py-3.5 text-left font-medium">
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-primary transition-colors hover:text-link"
                        >
                          {product.name}
                        </Link>
                        <span className="mt-0.5 block font-normal text-muted">
                          {product.provider}
                        </span>
                      </th>
                      <td className="px-4 py-3.5">
                        <OfferingTypeBadge offeringType={product.offeringType} compact />
                      </td>
                      <td className="tnum px-4 py-3.5 text-muted">{item.activePlanCount}</td>
                      <td className="px-4 py-3.5 text-right">
                        {item.fromPricePoisha === 0 ? (
                          <span className="font-medium text-success">Free</span>
                        ) : (
                          <>
                            <span className="tnum font-semibold text-primary">
                              {formatBDT(item.fromPricePoisha ?? 0)}
                            </span>
                            {cheapest ? (
                              <span className="mt-0.5 block text-muted">
                                {formatDurationDays(cheapest.durationDays)}
                              </span>
                            ) : null}
                            {sale && sale > 0 ? (
                              <span className="block text-success">
                                save {formatBDT(sale)}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {bestValue ? (
                          <>
                            <span className="tnum font-semibold text-primary">
                              {formatBDT(effectiveMonthlyPoisha(bestValue.pricePoisha, bestValue.durationDays))}
                            </span>
                            <span className="mt-0.5 block text-muted">
                              on {formatDurationDays(bestValue.durationDays)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {studentPrice !== undefined ? (
                          <span className="tnum font-medium text-accent">
                            {formatBDT(studentPrice)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {RENEWAL_LABEL[product.renewalCapability]}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {item.availability === "UNAVAILABLE" ? (
                          <span className="text-danger">Not sold</span>
                        ) : (
                          refundShort(product.refundEligibility)
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex h-9 items-center gap-1 rounded-button border border-line px-3 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
                        >
                          Plans
                          <Icon.ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: "Tag" as const,
              title: "How discounts stack",
              body: "Sale first, then bundle, then student, then coupon. Each step is half-up rounded on the running amount and shown separately on your invoice.",
            },
            {
              icon: "Shield" as const,
              title: "A price floor protects the line",
              body: "Stacked discounts can never take a line below the configured minimum. The floor is enforced server-side, so no browser trick can bypass it.",
            },
            {
              icon: "Chart" as const,
              title: "Gross, net and margin",
              body: "Our reporting always separates gross revenue from net (gross − refunds − gateway fees) and contribution margin (net − cost of goods − direct fulfilment).",
            },
          ].map((card) => {
            const Glyph = Icon[card.icon];
            return (
              <section key={card.title} className="card p-5">
                <Glyph size={18} className="text-accent" />
                <h2 className="mt-3 text-body font-semibold text-primary">{card.title}</h2>
                <p className="mt-1.5 text-caption leading-relaxed text-secondary">{card.body}</p>
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-caption leading-relaxed text-muted">
          Listed prices exclude VAT unless stated. Where a listing is an education referral, the
          provider sets the price and grants the discount directly — no amount is collected by us
          for that item.
        </p>
      </div>
    </>
  );
}

function refundShort(eligibility: string): string {
  switch (eligibility) {
    case "NON_REFUNDABLE":
      return "Non-refundable once delivered";
    case "REFUNDABLE_BEFORE_DELIVERY":
      return "Before delivery";
    case "REFUNDABLE_WITHIN_WINDOW":
      return "Within window";
    default:
      return "See policy";
  }
}
