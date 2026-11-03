/**
 * Student Zone — spec §8.2 `/students`, §13.12, §11.4.
 *
 * Student eligibility is a verified state, not a checkbox: the discount step
 * contributes zero until verification is approved (§13.8). This page shows the
 * verification steps honestly, lists only genuinely student-eligible products
 * from the repository, and links student-only bundles.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/marketplace/product-card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatBDT } from "@/lib/money";
import { breadcrumbJsonLd } from "@/lib/metadata";
import {
  listBundles,
  listFaqs,
  listStudentEligible,
} from "@/lib/repository";
import { STUDENT_DISCOUNT_CONFIGURED } from "@/lib/checkout";

export const metadata: Metadata = {
  title: "Student Zone — verified student pricing",
  description:
    "Verify your university email or student ID once and keep student pricing on eligible AI, writing and productivity subscriptions all year. BDT pricing, local payment methods.",
  alternates: { canonical: "/students" },
};

const VERIFICATION_STEPS = [
  {
    icon: "Mail" as const,
    title: "1. Use your university email",
    body: "Sign up with your institution-issued address (for example name@student.uct.ac.bd). This is the fastest path and usually verifies instantly.",
  },
  {
    icon: "File" as const,
    title: "2. Or upload your student ID",
    body: "A current ID card or a semester registration slip works. Upload a clear photo — we redact everything except your name, institution and validity date.",
  },
  {
    icon: "Clock" as const,
    title: "3. We review within one business day",
    body: "Most submissions clear automatically. Anything ambiguous is reviewed by a person, and we email you if we need a better image.",
  },
  {
    icon: "Refresh" as const,
    title: "4. Re-verify when it expires",
    body: "Verification carries an expiry date matching your document. We remind you before it lapses so your pricing does not change mid-semester.",
  },
];

const STUDENT_PERKS = [
  {
    icon: "Tag" as const,
    title: "Student pricing on eligible plans",
    body: "Shown as a separate price on every eligible listing, applied at step 3 of the discount ladder — after sale and bundle, before coupons.",
  },
  {
    icon: "Users" as const,
    title: "Student-only bundles",
    body: "Combinations built for a semester: a writing assistant, a reference manager and a design tool, priced together.",
  },
  {
    icon: "Book" as const,
    title: "Education referrals at no cost",
    body: "Where a provider runs its own education programme, we send you the official link instead of reselling — you get the provider's discount directly.",
  },
  {
    icon: "Clock" as const,
    title: "Renewal reminders",
    body: "We remind you before a subscription lapses, so you never lose access in the middle of a submission deadline.",
  },
];

export default function StudentsPage() {
  const studentItems = listStudentEligible(9);
  const studentBundles = listBundles().filter((bundle) => bundle.isStudentOnly);
  const studentFaqs = listFaqs().filter((faq) =>
    /student|verification|university|\.edu|discount/i.test(`${faq.question} ${faq.answer}`),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Student Zone", path: "/students" },
            ]),
          ),
        }}
      />

      <div className="relative overflow-hidden border-b border-line bg-surface-1/50">
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 -z-10" />
        <div className="container-page py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Student Zone</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              <Icon.Users size={12} /> Student vertical
            </Badge>
            <Badge tone={STUDENT_DISCOUNT_CONFIGURED ? "success" : "warning"}>
              {STUDENT_DISCOUNT_CONFIGURED
                ? "Verification live"
                : "Verification pending setup"}
            </Badge>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            Verify once. Keep student pricing all year.
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            Bangladeshi students pay in Taka for the same tools used worldwide. Prove you are
            enrolled, and the student price applies automatically to every eligible plan — no
            re-uploading, no re-asking, no hidden conversion.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Start verification
              <Icon.ArrowRight size={16} />
            </Link>
            <Link
              href="#eligible"
              className="inline-flex h-12 items-center justify-center rounded-button border border-line bg-surface-1 px-6 text-body font-medium text-primary transition-colors hover:border-accent/40 hover:text-link"
            >
              See eligible tools
            </Link>
          </div>

          {!STUDENT_DISCOUNT_CONFIGURED ? (
            <p className="mt-6 max-w-2xl rounded-input border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
              <strong className="font-semibold">Honest status:</strong> the verification provider is
              not configured in this environment, so the student discount step currently contributes
              zero at checkout. Student prices are still displayed on each listing because they come
              from the catalogue, not from this notice.
            </p>
          ) : null}
        </div>
      </div>

      <div className="container-page py-14">
        <section aria-labelledby="how">
          <h2 id="how" className="text-h2 font-bold tracking-tight text-primary">
            How verification works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VERIFICATION_STEPS.map((step) => {
              const Glyph = Icon[step.icon];
              return (
                <li key={step.title} className="card p-5">
                  <span className="inline-flex size-10 items-center justify-center rounded-button bg-accent-soft text-accent">
                    <Glyph size={18} />
                  </span>
                  <h3 className="mt-3.5 text-body font-semibold text-primary">{step.title}</h3>
                  <p className="mt-1.5 text-caption leading-relaxed text-secondary">{step.body}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 max-w-3xl text-caption leading-relaxed text-muted">
            We store only what verification requires: your name, institution, document type, issue
            and expiry date, and a hashed reference to the uploaded image. Uploaded documents are
            held in a private bucket, released only through short-lived signed URLs, and every
            access is written to the audit log.
          </p>
        </section>

        <section className="mt-16" aria-labelledby="perks">
          <h2 id="perks" className="text-h2 font-bold tracking-tight text-primary">
            What you get
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {STUDENT_PERKS.map((perk) => {
              const Glyph = Icon[perk.icon];
              return (
                <li key={perk.title} className="card flex items-start gap-4 p-5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-button bg-success/12 text-success">
                    <Glyph size={18} />
                  </span>
                  <div>
                    <h3 className="text-body font-semibold text-primary">{perk.title}</h3>
                    <p className="mt-1.5 text-caption leading-relaxed text-secondary">{perk.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {studentBundles.length > 0 ? (
          <section className="mt-16" aria-labelledby="student-bundles">
            <h2 id="student-bundles" className="text-h2 font-bold tracking-tight text-primary">
              Student-only bundles
            </h2>
            <ul className="mt-8 grid gap-4 lg:grid-cols-2">
              {studentBundles.map((bundle) => (
                <li key={bundle.id}>
                  <Link
                    href={`/bundles/${bundle.slug}`}
                    className="card card-elevated group flex h-full flex-col gap-4 border-accent/20 bg-accent-soft/40 p-6 transition-[border-color,transform] duration-base hover:-translate-y-0.5 hover:border-accent/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">
                        <Icon.Users size={12} /> Verified students only
                      </Badge>
                      <Badge tone="success">
                        Save {formatBDT(bundle.compareAtPoisha - bundle.pricePoisha)}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-h3 font-semibold text-primary">{bundle.name}</h3>
                      <p className="mt-2 text-caption text-secondary">{bundle.description}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {bundle.items.map((item) => (
                        <li key={item.sku} className="flex items-center gap-2 text-caption text-secondary">
                          <Icon.Check size={13} className="shrink-0 text-success" />
                          <span className="flex-1">{item.label}</span>
                          <span className="tnum text-muted">{formatBDT(item.valuePoisha)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-auto border-t border-accent/20 pt-4 text-caption text-muted">
                      Bundle price{" "}
                      <span className="tnum text-h3 font-semibold text-primary">
                        {formatBDT(bundle.pricePoisha)}
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="eligible" className="mt-16 scroll-mt-24" aria-labelledby="eligible-heading">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="eligible-heading" className="text-h2 font-bold tracking-tight text-primary">
                Tools with student pricing
              </h2>
              <p className="mt-2 max-w-2xl text-caption text-secondary">
                {studentItems.length} listing{studentItems.length === 1 ? "" : "s"} carry a verified
                student price. Each card shows the offering type, so you can tell a personal plan
                from a gift voucher or an education referral.
              </p>
            </div>
            <Link
              href="/explore?student=1"
              className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-button border border-line px-4 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
            >
              Filter the marketplace
              <Icon.ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {studentItems.length === 0 ? (
            <div className="card px-6 py-16 text-center">
              <h3 className="text-body font-semibold text-primary">
                No student-eligible listings right now
              </h3>
              <p className="mx-auto mt-2 max-w-md text-caption text-secondary">
                Student pricing is shown only where the provider or our supplier agreement actually
                permits it.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentItems.map((item) => (
                <li key={item.product.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {studentFaqs.length > 0 ? (
          <section className="mt-16" aria-labelledby="student-faq">
            <h2 id="student-faq" className="text-h2 font-bold tracking-tight text-primary">
              Student questions
            </h2>
            <div className="mx-auto mt-6 max-w-3xl divide-y divide-line rounded-card-lg border border-line bg-surface-1">
              {studentFaqs.map((faq) => (
                <details key={faq.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-primary [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <Icon.Chevron
                      size={18}
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
    </>
  );
}
