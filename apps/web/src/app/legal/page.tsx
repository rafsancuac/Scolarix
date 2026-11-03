/**
 * Legal index — spec §8.2. Lists every policy document with its last-updated
 * date, so a reader can see at a glance which version they are looking at.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { LEGAL_REVIEW_NOTICE, legalDocuments } from "@/data/legal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Legal & policies",
  description:
    "Terms of service, privacy policy, refund policy, acceptable use and the academic integrity services policy.",
  alternates: { canonical: "/legal" },
};

export default function LegalIndexPage() {
  return (
    <div className="container-page py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-caption text-muted">
        <Link href="/" className="hover:text-link">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-secondary">Legal</span>
      </nav>

      <h1 className="font-display text-h1 font-bold tracking-tight text-primary">
        Legal &amp; policies
      </h1>
      <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
        Five documents govern how this platform operates. They are written to be read and relied on,
        not to be decorative — each one states what we do, what we refuse to do, and what happens
        when something goes wrong.
      </p>

      <div className="mt-8 rounded-card border border-warning/30 bg-warning/[0.07] p-5">
        <h2 className="flex items-center gap-2 text-caption font-semibold text-warning">
          <Icon.Alert size={15} /> Review status
        </h2>
        <p className="mt-2 text-caption leading-relaxed text-secondary">{LEGAL_REVIEW_NOTICE}</p>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {legalDocuments.map((document) => (
          <li key={document.slug}>
            <Link
              href={`/legal/${document.slug}`}
              className="card card-elevated group flex h-full flex-col gap-3 p-6 transition-[border-color,transform] duration-base hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-button bg-accent-soft text-accent">
                  <Icon.File size={18} />
                </span>
                <Icon.ArrowRight
                  size={16}
                  className="mt-1 text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </div>
              <h2 className="text-body font-semibold text-primary">{document.title}</h2>
              <p className="text-caption leading-relaxed text-secondary">{document.summary}</p>
              <p className="mt-auto border-t border-line pt-3 text-caption text-muted">
                {document.sections.length} sections · updated{" "}
                <time dateTime={document.updated}>{formatDate(document.updated)}</time>
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-card border border-line bg-surface-1 p-6" aria-labelledby="statutes">
        <h2 id="statutes" className="text-body font-semibold text-primary">
          Bangladeshi statutes these documents are drafted against
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            "VAT and Supplementary Duty Act 2012 (NBR)",
            "Consumer Rights Protection Act 2009 and DNFPM Rules 2020",
            "Cyber Security Act 2023",
            "Information and Communication Technology Act 2006",
            "Draft Data Protection Act",
            "Trademarks Act 2009",
            "Copyright Act 2000",
            "Bangladesh Bank MFS-PSPD circulars (licensed PSPs only)",
          ].map((statute) => (
            <li key={statute} className="flex items-start gap-2.5 text-caption text-secondary">
              <Icon.Check size={14} className="mt-0.5 shrink-0 text-success" />
              {statute}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-muted">
          Institutional academic regulations apply in addition to these statutes, and where they are
          stricter we follow them.
        </p>
      </section>
    </div>
  );
}
