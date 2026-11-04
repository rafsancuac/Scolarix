/**
 * Customer dashboard — spec §8.2 `/dashboard`, §9.3.
 *
 * HONEST STATE: Auth.js v5 is specified (§17.6) but the database and session
 * adapters are not connected in this environment, so there is no authenticated
 * customer to render data for. Rather than show a fabricated account with
 * invented subscriptions — which §28.5 and the FINAL RULES prohibit — this page
 * renders the real dashboard shell, states exactly what is not connected, and
 * proves the wiring by reading live data that does exist (the service-request
 * store and the catalogue compliance gate).
 *
 * When `DATA_ADAPTER=prisma` and Auth.js are configured, each panel below is
 * replaced by its repository query without changing the layout.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { DemoDataTag } from "@/components/layout/demo-mode-ribbon";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BRAND } from "@/lib/brand";
import { capabilityMatrix, DATABASE_CONNECTED, EMAIL_CONNECTED } from "@/lib/checkout";
import { countServiceRequests, listServiceRequests } from "@/lib/request-store";
import { listProductItems } from "@/lib/repository";
import { breadcrumbJsonLd } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const PANELS = [
  {
    key: "subscriptions",
    icon: "Refresh" as const,
    title: "Subscriptions",
    body: "Active plans, renewal dates, licence keys and the renewal button that matches each item's actual renewal capability.",
    needs: "Auth.js session + PostgreSQL",
  },
  {
    key: "orders",
    icon: "Cart" as const,
    title: "Orders & invoices",
    body: "Every order with its immutable price snapshot, payment state, fulfilment state and a downloadable VAT-compliant invoice.",
    needs: "Auth.js session + PostgreSQL",
  },
  {
    key: "services",
    icon: "Tools" as const,
    title: "Service requests",
    body: "Quotes, milestones, revision allowance, secure file exchange and the specialist assigned to each request.",
    needs: "Auth.js session + PostgreSQL",
  },
  {
    key: "student",
    icon: "Users" as const,
    title: "Student verification",
    body: "Verification status, expiry date, and which listings the student price is currently applied to.",
    needs: "Verification provider configured",
  },
];

export default async function DashboardPage() {
  const [requestCounts, recentRequests] = await Promise.all([
    countServiceRequests(),
    listServiceRequests(),
  ]);
  const catalogue = await listProductItems();
  const unavailable = catalogue.filter((item) => item.availability === "UNAVAILABLE");
  const matrix = capabilityMatrix();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Dashboard", path: "/dashboard" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-10">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Dashboard</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Customer area</Badge>
            {!DATABASE_CONNECTED ? <Badge tone="warning">Auth not connected</Badge> : null}
            <DemoDataTag />
          </div>

          <h1 className="mt-3 font-display text-h1 font-bold tracking-tight text-primary">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-body text-secondary">
            Subscriptions, orders, invoices, service requests and renewal reminders in one place —
            signed in as <strong className="font-medium text-primary">you</strong>, with your own
            data and nobody else&apos;s.
          </p>
        </div>
      </div>

      <div className="container-page py-10">
        {!DATABASE_CONNECTED ? (
          <section
            aria-labelledby="status"
            className="rounded-card-lg border border-warning/30 bg-warning/[0.07] p-6"
          >
            <h2 id="status" className="flex items-center gap-2 text-body font-semibold text-warning">
              <Icon.Alert size={18} />
              This environment has no connected database or session store
            </h2>
            <p className="mt-3 max-w-3xl text-caption leading-relaxed text-secondary">
              {BRAND.name} cannot sign you in here, so the panels below are shown as their real
              specification rather than filled with invented data. A dashboard with fabricated
              subscriptions would be a fake feature — the platform rules forbid it. Connect the
              adapters and every panel populates from its own repository query.
            </p>

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {matrix.map((entry) => (
                <li
                  key={entry.key}
                  className="flex items-start gap-2.5 rounded-input border border-line bg-surface-1 px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1 size-2 shrink-0 rounded-full ${entry.connected ? "bg-success" : "bg-warning"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-caption font-medium text-primary">
                      {entry.label}
                      {entry.required ? (
                        <span className="ml-1.5 text-muted">· required</span>
                      ) : (
                        <span className="ml-1.5 text-muted">· optional</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-caption leading-relaxed text-muted">{entry.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-caption text-muted">
              Configure these in <code className="rounded bg-surface-2 px-1">.env</code> using{" "}
              <code className="rounded bg-surface-2 px-1">.env.example</code> as the template, then
              run <code className="rounded bg-surface-2 px-1">docker compose up</code> for
              PostgreSQL and Redis. See <code>README.md</code> §5.
            </p>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="panels">
          <h2 id="panels" className="text-h2 font-bold tracking-tight text-primary">
            Your panels
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {PANELS.map((panel) => {
              const Glyph = Icon[panel.icon];
              return (
                <li key={panel.key} className="card card-elevated flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-button bg-accent-soft text-accent">
                      <Glyph size={18} />
                    </span>
                    <Badge tone={DATABASE_CONNECTED ? "success" : "warning"}>
                      {DATABASE_CONNECTED ? "Live" : "Awaiting connection"}
                    </Badge>
                  </div>
                  <h3 className="text-body font-semibold text-primary">{panel.title}</h3>
                  <p className="text-caption leading-relaxed text-secondary">{panel.body}</p>
                  <p className="mt-auto border-t border-line pt-3 text-caption text-muted">
                    Requires: {panel.needs}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Live data that genuinely exists in this environment                */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12" aria-labelledby="live">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="live" className="text-h2 font-bold tracking-tight text-primary">
                Live from this environment
              </h2>
              <p className="mt-2 max-w-2xl text-caption text-secondary">
                These figures are real reads, not samples: service requests submitted through the
                public API and stored by the append-only adapter, and the catalogue compliance gate
                evaluated over every published listing.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center gap-1.5 rounded-button border border-line px-3.5 text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
            >
              Open the admin console
              <Icon.ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-body font-semibold text-primary">Service requests</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{requestCounts.total} total</Badge>
                  <Badge tone="warning">{requestCounts.reviewRequired} need review</Badge>
                  <Badge tone="success">{requestCounts.quotePending} awaiting quote</Badge>
                </div>
              </div>

              {recentRequests.length === 0 ? (
                <div className="mt-5 rounded-input border border-dashed border-line-strong bg-surface-2 px-4 py-10 text-center">
                  <p className="text-caption font-medium text-primary">No requests yet</p>
                  <p className="mx-auto mt-1.5 max-w-md text-caption text-muted">
                    Submit one from any service page. The request is validated server-side, screened
                    against the prohibited-scope list, and appended to the store with its
                    declaration timestamp and IP.
                  </p>
                  <Link
                    href="/services"
                    className="mt-4 inline-flex h-10 items-center rounded-button bg-accent px-4 text-caption font-medium text-accent-contrast hover:bg-accent-hover"
                  >
                    Go to services
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-line">
                  {recentRequests.slice(0, 6).map((request) => (
                    <li key={request.reference} className="flex items-start gap-3 py-3">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          request.outcome === "REVIEW_REQUIRED" ? "bg-warning" : "bg-success"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="tnum text-caption font-medium text-primary">
                          {request.reference}
                        </p>
                        <p className="text-caption text-secondary">
                          {request.serviceName} · {request.contact.email}
                        </p>
                        {request.matchedFlags.length > 0 ? (
                          <p className="mt-1 flex flex-wrap gap-1.5">
                            {request.matchedFlags.map((flag) => (
                              <Badge key={flag} tone="warning" className="px-2 py-0.5">
                                {flag.replace(/_/g, " ").toLowerCase()}
                              </Badge>
                            ))}
                          </p>
                        ) : null}
                      </div>
                      <span className="tnum shrink-0 text-caption text-muted">
                        {new Date(request.createdAt).toISOString().slice(0, 10)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-body font-semibold text-primary">Catalogue compliance</h3>
              <p className="mt-1 text-caption text-muted">
                §11.2 gate evaluated over all {catalogue.length} published listings.
              </p>
              <dl className="mt-4 space-y-2.5 text-caption">
                <MetricRow
                  label="Purchasable"
                  value={catalogue.length - unavailable.length}
                  total={catalogue.length}
                  tone="success"
                />
                <MetricRow
                  label="Visible but blocked"
                  value={unavailable.length}
                  total={catalogue.length}
                  tone="danger"
                />
              </dl>
              {unavailable.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-line pt-4">
                  {unavailable.map((item) => (
                    <li key={item.product.id}>
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="flex items-start justify-between gap-3 rounded-input border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-danger/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-caption font-medium text-primary">
                            {item.product.name}
                          </span>
                          <span className="block text-caption text-muted">
                            {item.product.authorizationStatus.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </span>
                        <Icon.ArrowRight size={14} className="mt-1 shrink-0 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-4 text-caption leading-relaxed text-muted">
                A blocked listing stays visible for information but its purchase CTA is disabled and
                checkout refuses it. This is how Turnitin behaves: no legitimate individual licence
                channel exists, so it is never sold.
              </p>
            </div>
          </div>
        </section>

        {!EMAIL_CONNECTED ? (
          <p className="mt-10 rounded-input border border-line bg-surface-1 px-4 py-3 text-caption text-muted">
            <Icon.Mail size={14} className="mr-1.5 inline-block align-text-bottom" />
            Transactional email is not configured, so renewal reminders and order confirmations will
            not be delivered from this environment.
          </p>
        ) : null}
      </div>
    </>
  );
}

function MetricRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "success" | "danger";
}) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted">{label}</dt>
        <dd className="tnum font-medium text-primary">
          {value} <span className="text-muted">/ {total}</span>
        </dd>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-3"
        role="img"
        aria-label={`${label}: ${percent}%`}
      >
        <div
          className={`h-full rounded-pill ${tone === "success" ? "bg-success" : "bg-danger"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
