/**
 * Services index — spec §8.2 `/services`, §9.2.3, §12.
 *
 * This page carries the platform-wide academic-integrity statement: the
 * permitted / prohibited scope list from §12.6 is not optional marketing copy,
 * it is the boundary the business operates inside.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { ServiceCard } from "@/components/marketplace/service-card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BRAND } from "@/lib/brand";
import { breadcrumbJsonLd } from "@/lib/metadata";
import { listServices } from "@/lib/repository";

export const metadata: Metadata = {
  title: "Academic support services",
  description:
    "Original academic support services performed by our own specialists: document formatting, citation and reference management, editing of your own draft, data preparation and statistics guidance, presentation design and tutoring. Quoted in BDT.",
  alternates: { canonical: "/services" },
};

const PERMITTED = [
  "Document formatting to a university or journal template",
  "Citation and reference management in APA, IEEE, MLA, Chicago or Harvard",
  "Editing, proofreading and restructuring of work you have written",
  "Research strategy, source discovery and annotated bibliographies",
  "Data cleaning, transformation and visualization of your own dataset",
  "Statistics guidance and interpretation of your own results",
  "Presentation and poster design built from your content",
  "Tutoring, and AI workflow or prompt setup on your own tools",
];

const PROHIBITED = [
  "Ghost-writing any work intended for submission as your own",
  "Completing graded assessments, examinations, quizzes or lab work",
  "Plagiarism evasion, “undetectable AI”, or any “beat Turnitin” claim",
  "Fabricating data, citations, references, sources or results",
  "Anything your institution's academic regulations forbid",
];

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Services</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <Icon.Tools size={12} /> Vertical B — our own work
            </Badge>
            <Badge tone="neutral">{services.length} services</Badge>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            Academic support services, done properly
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            These are original services performed by {BRAND.name} specialists and vetted
            contractors — not resold third-party subscriptions. You get a fixed quote before you
            pay, a named revision allowance, and a clear written scope.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        <section aria-labelledby="integrity">
          <div className="rounded-card-lg border border-line bg-surface-1 p-6 sm:p-8">
            <h2 id="integrity" className="flex items-center gap-2 text-h3 font-semibold text-primary">
              <Icon.Shield size={22} className="text-accent" />
              Our academic integrity boundary
            </h2>
            <p className="mt-3 max-w-3xl text-caption leading-relaxed text-secondary">
              Every request you submit carries a declaration acknowledging this boundary, and the
              acknowledgement is stored with a timestamp and your IP address. Requests that fall
              outside the permitted scope are declined — this is a hard business rule, not a
              discretionary policy.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-card border border-success/25 bg-success/[0.06] p-5">
                <h3 className="flex items-center gap-2 text-body font-semibold text-success">
                  <Icon.Check size={17} /> Permitted
                </h3>
                <ul className="mt-3 space-y-2">
                  {PERMITTED.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-caption text-secondary">
                      <Icon.Check size={13} className="mt-1 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-danger/25 bg-danger/[0.06] p-5">
                <h3 className="flex items-center gap-2 text-body font-semibold text-danger">
                  <Icon.Close size={17} /> Prohibited
                </h3>
                <ul className="mt-3 space-y-2">
                  {PROHIBITED.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-caption text-secondary">
                      <Icon.Close size={13} className="mt-1 shrink-0 text-danger" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-5 text-caption text-muted">
              <Link href="/legal/services-policy" className="text-link underline underline-offset-4">
                Full services policy
              </Link>{" "}
              ·{" "}
              <Link href="/legal/acceptable-use" className="text-link underline underline-offset-4">
                Acceptable use
              </Link>
            </p>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="catalogue">
          <h2 id="catalogue" className="text-h2 font-bold tracking-tight text-primary">
            All services
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.id}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="process">
          <h2 id="process" className="text-h2 font-bold tracking-tight text-primary">
            How a service request runs
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              {
                title: "Submit",
                body: "Describe the work, acknowledge the integrity declaration, choose a package.",
                icon: "File" as const,
              },
              {
                title: "Scope review",
                body: "A specialist checks the request against the permitted scope before quoting.",
                icon: "Search" as const,
              },
              {
                title: "Fixed quote",
                body: "Price, turnaround and revision allowance in writing. Immutable once accepted.",
                icon: "Tag" as const,
              },
              {
                title: "Pay securely",
                body: "bKash, Nagad, Rocket or card. Work starts only after verified payment.",
                icon: "Wallet" as const,
              },
              {
                title: "Deliver & revise",
                body: "Review the delivery, use your included revisions, then close or escalate.",
                icon: "Check" as const,
              },
            ].map((step, index) => {
              const Glyph = Icon[step.icon];
              return (
                <li key={step.title} className="card p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 items-center justify-center rounded-button bg-accent-soft text-accent">
                      <Glyph size={17} />
                    </span>
                    <span className="tnum text-caption font-semibold text-muted">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-body font-semibold text-primary">{step.title}</h3>
                  <p className="mt-1.5 text-caption leading-relaxed text-secondary">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
