/**
 * Legal document — spec §8.2 `/legal/[slug]`.
 *
 * Rendered from `src/data/legal.ts` so the text is content, not markup, and a
 * CMS adapter can replace the source in Phase 4 without touching this route.
 * In-page navigation is generated from the section headings.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { LEGAL_REVIEW_NOTICE, getLegalDocument, legalDocuments } from "@/data/legal";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/metadata";

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) return { title: "Document not found", robots: { index: false } };

  return {
    title: document.title,
    description: document.summary,
    alternates: { canonical: `/legal/${document.slug}` },
  };
}

/** Heading → stable fragment, matching GitHub-style slug rules. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  const others = legalDocuments.filter((item) => item.slug !== document.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Legal", path: "/legal" },
              { name: document.title, path: `/legal/${document.slug}` },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-10">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/legal" className="hover:text-link">Legal</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">{document.title}</span>
          </nav>

          <h1 className="max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            {document.title}
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            {document.summary}
          </p>
          <p className="mt-4 text-caption text-muted">
            Last updated <time dateTime={document.updated}>{formatDate(document.updated)}</time>
          </p>
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="card p-4">
            <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">
              On this page
            </h2>
            <ol className="mt-3 space-y-1">
              {document.sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${anchor(section.heading)}`}
                    className="block rounded-button px-2.5 py-1.5 text-caption text-secondary transition-colors hover:bg-surface-2 hover:text-link"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-4 rounded-card border border-warning/30 bg-warning/[0.07] p-4">
            <h2 className="flex items-center gap-2 text-caption font-semibold text-warning">
              <Icon.Alert size={14} /> Review status
            </h2>
            <p className="mt-2 text-caption leading-relaxed text-secondary">
              {LEGAL_REVIEW_NOTICE}
            </p>
          </div>
        </aside>

        <article className="min-w-0">
          {document.sections.map((section) => (
            <section
              key={section.heading}
              id={anchor(section.heading)}
              className="scroll-mt-24 border-b border-line py-8 first:pt-0 last:border-b-0"
            >
              <h2 className="font-display text-h3 font-semibold text-primary">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="mt-4 max-w-3xl text-body leading-relaxed text-secondary [text-wrap:pretty]"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 max-w-3xl space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 48)} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span className="text-caption leading-relaxed text-secondary">{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <nav aria-label="Other policies" className="mt-10 rounded-card border border-line bg-surface-1 p-6">
            <h2 className="text-body font-semibold text-primary">Other policies</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/legal/${other.slug}`}
                    className="flex items-center justify-between gap-3 rounded-input border border-line bg-surface-2 px-4 py-3 text-caption text-primary transition-colors hover:border-accent/40 hover:text-link"
                  >
                    {other.title}
                    <Icon.ArrowRight size={14} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-8 text-caption leading-relaxed text-muted">
            If any part of this document is unclear, contact support before relying on it — we would
            rather explain it now than argue about it later.
          </p>
        </article>
      </div>
    </>
  );
}
