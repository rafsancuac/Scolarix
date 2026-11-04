/**
 * Admin console — spec §8.2 `/admin`, §9.4.
 *
 * Access control: in production this whole route tree sits behind Auth.js with
 * `role ∈ {SUPER_ADMIN, ADMIN, FINANCE, SUPPORT, COMPLIANCE}`, Super Admin and
 * Finance require TOTP (§17.6), and every read of supplier cost or compliance
 * evidence is written to the append-only audit log (§6 rules 7 and 14).
 *
 * That identity layer is not connected in this environment. Rather than render
 * an unauthenticated console that looks authorised, the page gates itself: with
 * no database adapter it shows the wiring status and the read-only operational
 * views that are genuinely available (catalogue compliance, service-request
 * review queue). No mutation is offered, because nothing here can be persisted.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { DemoDataTag } from "@/components/layout/demo-mode-ribbon";
import { Badge, OfferingTypeBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BRAND, IS_DEMO_MODE } from "@/lib/brand";
import { capabilityMatrix, DATABASE_CONNECTED, QUEUE_CONNECTED } from "@/lib/checkout";
import { formatBDT } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd } from "@/lib/metadata";
import {
  countServiceRequests,
  listServiceRequests,
} from "@/lib/request-store";
import {
  availabilityOf,
  cheapestActivePlan,
  evaluatePurchaseGate,
  listBundles,
  listCategories,
  listProducts,
  listServices,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin console",
  robots: { index: false, follow: false },
};

/**
 * Role matrix from §16.2 — rendered so the intended access model is reviewable
 * in the UI rather than living only in a document.
 */
const ROLE_MATRIX = [
  { role: "SUPER_ADMIN", totp: true, scopes: "Everything, incl. roles, supplier cost, refunds, audit log" },
  { role: "ADMIN", totp: false, scopes: "Catalogue, CMS, orders, services, support, compliance evidence" },
  { role: "FINANCE", totp: true, scopes: "Ledger, refunds, invoices, payout reports, supplier cost" },
  { role: "SUPPORT", totp: false, scopes: "Orders (read), tickets, service requests, no refunds above threshold" },
  { role: "COMPLIANCE", totp: false, scopes: "Authorization evidence, integrity reviews, takedown queue" },
  { role: "CUSTOMER", totp: false, scopes: "Own subscriptions, orders, invoices, service requests only" },
];

export default async function AdminPage() {
  const [requestCounts, requests] = await Promise.all([
    countServiceRequests(),
    listServiceRequests(),
  ]);

  const products = await listProducts();
  const services = await listServices();
  const bundles = await listBundles();
  const categories = await listCategories();
  const matrix = capabilityMatrix();

  const reviewQueue = requests.filter((request) => request.outcome === "REVIEW_REQUIRED");
  const quoteQueue = requests.filter((request) => request.outcome === "QUOTE_PENDING");

  // Compliance view: the gate verdict for every published listing.
  const compliance = products.map((product) => ({
    product,
    gate: evaluatePurchaseGate(product),
    availability: availabilityOf(product),
    cheapest: cheapestActivePlan(product),
  }));
  const blocked = compliance.filter((row) => row.gate !== null);

  const catalogueValue = compliance.reduce(
    (sum, row) => sum + (row.cheapest?.pricePoisha ?? 0),
    0,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Admin", path: "/admin" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-10">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Admin console</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Internal</Badge>
            {!DATABASE_CONNECTED ? <Badge tone="danger">Identity layer not connected</Badge> : null}
            {IS_DEMO_MODE ? <Badge tone="warning">Demo mode</Badge> : null}
            <DemoDataTag />
          </div>

          <h1 className="mt-3 font-display text-h1 font-bold tracking-tight text-primary">
            Admin console
          </h1>
          <p className="mt-3 max-w-2xl text-body text-secondary">
            Catalogue, compliance evidence, orders, refunds, the ledger, service-request review and
            the audit trail — restricted by role, with TOTP required for Super Admin and Finance.
          </p>
        </div>
      </div>

      <div className="container-page py-10">
        {/* ---------------------------------------------------------------- */}
        {/* Access gate                                                        */}
        {/* ---------------------------------------------------------------- */}
        {!DATABASE_CONNECTED ? (
          <section
            aria-labelledby="gate"
            className="rounded-card-lg border border-danger/30 bg-danger/[0.06] p-6"
          >
            <h2 id="gate" className="flex items-center gap-2 text-body font-semibold text-danger">
              <Icon.Shield size={18} />
              This console is read-only and unauthenticated in this environment
            </h2>
            <p className="mt-3 max-w-3xl text-caption leading-relaxed text-secondary">
              {BRAND.name} refuses to present an admin console that looks authorised but is not.
              With no database adapter there are no roles to check, so no mutation is offered here —
              only the two operational views that read real data: the catalogue compliance gate and
              the service-request review queue. Connect PostgreSQL and Auth.js, and this route tree
              sits behind the role matrix below with audit logging on every sensitive read.
            </p>

            <div className="mt-5 overflow-x-auto rounded-card border border-line bg-surface-1">
              <table className="w-full min-w-[44rem] border-collapse text-caption">
                <caption className="sr-only">Intended role and access matrix</caption>
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Role</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">TOTP required</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Scopes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ROLE_MATRIX.map((row) => (
                    <tr key={row.role}>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-primary">
                        <code className="text-caption">{row.role}</code>
                      </th>
                      <td className="px-4 py-3">
                        {row.totp ? (
                          <Badge tone="danger">Mandatory</Badge>
                        ) : (
                          <Badge tone="neutral">Not required</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary">{row.scopes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Integration status                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-10" aria-labelledby="integrations">
          <h2 id="integrations" className="text-h2 font-bold tracking-tight text-primary">
            Integration status
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matrix.map((entry) => (
              <li
                key={entry.key}
                className={`card p-4 ${entry.connected ? "border-success/30" : "border-warning/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-caption font-semibold text-primary">{entry.label}</p>
                  <span
                    aria-hidden="true"
                    className={`mt-1 size-2 shrink-0 rounded-full ${entry.connected ? "bg-success" : "bg-warning"}`}
                  />
                </div>
                <p className="mt-2 text-caption leading-relaxed text-secondary">{entry.detail}</p>
                <p className="mt-2 text-caption text-muted">
                  {entry.required ? "Required for launch wave 1" : "Optional at launch"}
                </p>
              </li>
            ))}
          </ul>
          {!QUEUE_CONNECTED ? (
            <p className="mt-4 rounded-input border border-warning/30 bg-warning/10 px-4 py-3 text-caption text-warning">
              Without Redis, webhook dedupe (<code>webhook_events.providerEventId</code>) and
              fulfilment job claiming (<code>SKIP LOCKED</code>) cannot run — so a duplicate gateway
              callback could double-deliver. This is a launch blocker, not a nice-to-have.
            </p>
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Catalogue overview                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12" aria-labelledby="overview">
          <h2 id="overview" className="text-h2 font-bold tracking-tight text-primary">
            Catalogue overview
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Published products", value: products.length, href: "/explore" },
              { label: "Categories", value: categories.length, href: "/explore" },
              { label: "Services", value: services.length, href: "/services" },
              { label: "Bundles", value: bundles.length, href: "/bundles" },
              { label: "Blocked by gate", value: blocked.length, href: "#compliance" },
            ].map((stat) => (
              <li key={stat.label}>
                <Link href={stat.href} className="card block p-4 transition-colors hover:border-accent/40">
                  <p className="tnum text-h2 text-primary">{stat.value}</p>
                  <p className="mt-1 text-caption text-muted">{stat.label}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-caption text-muted">
            Sum of the cheapest active plan across all published listings:{" "}
            <span className="tnum font-medium text-secondary">{formatBDT(catalogueValue)}</span>.
            Revenue, refunds, gateway fees and contribution margin are ledger-derived and are not
            shown here — the ledger does not exist until the database adapter is connected. Run{" "}
            <code className="rounded bg-surface-2 px-1">npm run verify-financials</code> to check
            that recomputation once it does.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Compliance gate                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section id="compliance" className="mt-12 scroll-mt-24" aria-labelledby="compliance-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="compliance-heading" className="text-h2 font-bold tracking-tight text-primary">
                Authorization & compliance gate
              </h2>
              <p className="mt-2 max-w-2xl text-caption text-secondary">
                §11.2 evaluated per listing. A row is purchasable only with publishable
                authorization evidence and at least one active plan; otherwise the CTA is disabled
                and checkout refuses the line.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{products.length - blocked.length} purchasable</Badge>
              <Badge tone="danger">{blocked.length} blocked</Badge>
            </div>
          </div>

          <div className="card mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[58rem] border-collapse text-caption">
                <caption className="sr-only">
                  Compliance verdict for every published product
                </caption>
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Product</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Offering</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Authorization</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Supplier</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold text-primary">
                      Cheapest plan
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Availability</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-primary">Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {compliance.map((row) => (
                    <tr key={row.product.id} className="transition-colors hover:bg-surface-2/60">
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <Link
                          href={`/products/${row.product.slug}`}
                          className="text-primary hover:text-link"
                        >
                          {row.product.name}
                        </Link>
                        <span className="mt-0.5 block font-normal text-muted">
                          {row.product.provider}
                        </span>
                      </th>
                      <td className="px-4 py-3">
                        <OfferingTypeBadge offeringType={row.product.offeringType} compact />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.gate ? "text-danger" : "text-success"
                          }
                        >
                          {row.product.authorizationStatus.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {row.product.supplier ? (
                          <>
                            {row.product.supplier.legalName}
                            <span className="mt-0.5 block">
                              {row.product.supplier.agreementType}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">n/a — referral or own product</span>
                        )}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-primary">
                        {row.cheapest ? formatBDT(row.cheapest.pricePoisha) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            row.availability === "IN_STOCK"
                              ? "success"
                              : row.availability === "LOW_STOCK"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {row.availability.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.gate ? (
                          <span className="text-danger" title={row.gate.detail}>
                            <Icon.Close size={14} className="mr-1 inline-block align-text-bottom" />
                            {row.gate.reason.replace(/_/g, " ").toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-success">
                            <Icon.Check size={14} className="mr-1 inline-block align-text-bottom" />
                            pass
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-caption leading-relaxed text-muted">
            Supplier cost price and authorization evidence documents are restricted to{" "}
            <code className="rounded bg-surface-2 px-1">suppliers:read-cost</code> and{" "}
            <code className="rounded bg-surface-2 px-1">compliance:read</code> scopes, are never
            included in a public payload, and every access is audited (§6 rule 14). They are
            therefore absent from this table by design.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Service request queues                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12" aria-labelledby="queues">
          <h2 id="queues" className="text-h2 font-bold tracking-tight text-primary">
            Service-request queues
          </h2>
          <p className="mt-2 max-w-2xl text-caption text-secondary">
            Requests are triaged by the prohibited-scope screen before any quotation. A matched
            request goes to integrity review; a clean request goes to the quotation queue.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <QueueCard
              title="Integrity review"
              tone="warning"
              count={requestCounts.reviewRequired}
              empty="Nothing flagged. The screen matched no prohibited-scope phrase."
              requests={reviewQueue}
            />
            <QueueCard
              title="Awaiting quotation"
              tone="success"
              count={requestCounts.quotePending}
              empty="No clean requests waiting for a quote."
              requests={quoteQueue}
            />
          </div>
        </section>

        <section className="mt-12 rounded-card border border-line bg-surface-1 p-6" aria-labelledby="next">
          <h2 id="next" className="text-body font-semibold text-primary">
            What becomes available once the adapters are connected
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              "Orders with immutable price snapshots and downloadable invoices",
              "Refund processing with ledger entries and recomputed financials",
              "Fulfilment jobs, retries, the manual queue and code-vault stock",
              "Webhook event log with duplicate-callback detection",
              "Authorization evidence uploads, expiry dates and auto-unpublish",
              "Coupons, bundles, affiliates and payout batches",
              "Support tickets, SLA timers and CSAT capture",
              "The append-only audit trail, including sensitive-read logging",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-caption text-secondary">
                <Icon.Check size={14} className="mt-0.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-caption text-muted">
            Last rendered {formatDate(new Date())} (Asia/Dhaka display, UTC storage).
          </p>
        </section>
      </div>
    </>
  );
}

function QueueCard({
  title,
  tone,
  count,
  empty,
  requests,
}: {
  title: string;
  tone: "warning" | "success";
  count: number;
  empty: string;
  requests: Awaited<ReturnType<typeof listServiceRequests>>;
}) {
  return (
    <div className={`card p-5 ${tone === "warning" ? "border-warning/30" : "border-success/30"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-semibold text-primary">{title}</h3>
        <Badge tone={tone}>{count}</Badge>
      </div>

      {requests.length === 0 ? (
        <p className="mt-4 rounded-input border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center text-caption text-muted">
          {empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {requests.slice(0, 8).map((request) => (
            <li key={request.reference} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tnum text-caption font-medium text-primary">{request.reference}</p>
                  <p className="truncate text-caption text-secondary">
                    {request.serviceName} · {request.contact.name}
                  </p>
                  <p className="truncate text-caption text-muted">{request.contact.email}</p>
                </div>
                <span className="tnum shrink-0 text-caption text-muted">
                  {formatDate(request.createdAt)}
                </span>
              </div>
              {request.matchedFlags.length > 0 ? (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {request.matchedFlags.map((flag) => (
                    <Badge key={flag} tone="warning" className="px-2 py-0.5">
                      {flag.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  ))}
                </p>
              ) : null}
              <p className="mt-2 line-clamp-3 rounded-input bg-surface-2 px-3 py-2 text-caption text-secondary">
                {request.brief}
              </p>
              <p className="mt-2 text-caption text-muted">
                Declaration acknowledged {formatDate(request.declaration.acknowledgedAt)} · IP{" "}
                <code className="rounded bg-surface-2 px-1">{request.declaration.ipAddress}</code>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
