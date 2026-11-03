/**
 * Support — spec §8.2 `/support`, §13.19.
 *
 * The full ticket system (SLA timers, CSAT, canned responses, escalation) is
 * launch-wave 1 work behind Auth.js. This page gives real, working routes to a
 * human in the meantime and states plainly which parts are not yet built
 * instead of rendering a form that silently discards its contents.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BRAND } from "@/lib/brand";
import { EMAIL_CONNECTED } from "@/lib/checkout";
import { listFaqs } from "@/lib/repository";
import { breadcrumbJsonLd } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Help & support",
  description:
    "Contact support, check order and delivery status, read the refund process, and find answers to the questions we are asked most often.",
  alternates: { canonical: "/support" },
};

const CHANNELS = [
  {
    icon: "Mail" as const,
    title: "Email support",
    detail: "The reliable channel. Quote your order or request reference and we can find the record immediately.",
    action: { label: "support@marketplace.example", href: "mailto:support@marketplace.example" },
    sla: "First reply within 1 business day",
  },
  {
    icon: "Tools" as const,
    title: "A service request went wrong",
    detail: "Tell us the reference, what was agreed in the quotation, and how the delivery differs. Escalation is reviewed by someone independent of the work.",
    action: { label: "Read the services policy", href: "/legal/services-policy" },
    sla: "Escalation answer within 5 business days",
  },
  {
    icon: "Wallet" as const,
    title: "A payment or refund question",
    detail: "Money questions are handled against the ledger, not against memory. Send the payment reference from your wallet or bank alongside your order number.",
    action: { label: "Read the refund policy", href: "/legal/refunds" },
    sla: "Acknowledged within 1 business day",
  },
  {
    icon: "Shield" as const,
    title: "Report a suspected fraud attempt",
    detail: "If anyone asked you for a wallet PIN or OTP while claiming to be our staff, report it. We will never ask for those values.",
    action: { label: "Read acceptable use", href: "/legal/acceptable-use" },
    sla: "Same-day review",
  },
];

export default function SupportPage() {
  const faqs = listFaqs();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Support", path: "/support" },
            ]),
          ),
        }}
      />

      <div className="border-b border-line bg-surface-1/50">
        <div className="container-page py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-caption text-muted">
            <Link href="/" className="hover:text-link">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-secondary">Support</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Sat–Thu, 10:00–19:00 GMT+6</Badge>
            <Badge tone={EMAIL_CONNECTED ? "success" : "warning"}>
              {EMAIL_CONNECTED ? "Email delivery configured" : "Outbound email not configured"}
            </Badge>
          </div>

          <h1 className="mt-4 max-w-3xl font-display text-h1 font-bold tracking-tight text-primary [text-wrap:balance]">
            Help &amp; support
          </h1>
          <p className="mt-4 max-w-2xl text-body text-secondary [text-wrap:pretty]">
            A real person reads every message. Include your order or request reference and we can
            pull the record — including the price snapshot, the delivery log and the audit trail —
            instead of asking you to repeat yourself.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        <section aria-labelledby="channels">
          <h2 id="channels" className="sr-only">Contact channels</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {CHANNELS.map((channel) => {
              const Glyph = Icon[channel.icon];
              return (
                <li key={channel.title} className="card card-elevated flex h-full flex-col gap-3 p-6">
                  <span className="inline-flex size-10 items-center justify-center rounded-button bg-accent-soft text-accent">
                    <Glyph size={18} />
                  </span>
                  <h3 className="text-body font-semibold text-primary">{channel.title}</h3>
                  <p className="text-caption leading-relaxed text-secondary">{channel.detail}</p>
                  <p className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-caption text-muted">
                    <Icon.Clock size={13} />
                    {channel.sla}
                  </p>
                  <Link
                    href={channel.action.href}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-button border border-line text-caption font-medium text-primary transition-colors hover:border-accent hover:text-link"
                  >
                    {channel.action.label}
                    <Icon.ArrowRight size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-14 rounded-card border border-warning/30 bg-warning/[0.07] p-6" aria-labelledby="tickets">
          <h2 id="tickets" className="flex items-center gap-2 text-body font-semibold text-warning">
            <Icon.Info size={17} /> The in-app ticket console is not built yet
          </h2>
          <p className="mt-3 max-w-3xl text-caption leading-relaxed text-secondary">
            {BRAND.name} ships the full support centre — authenticated tickets, SLA timers,
            assignment, canned responses, CSAT capture and escalation — in launch wave 1 behind
            Auth.js. Until the identity layer is connected there is no authenticated user to attach
            a ticket to, so this page routes you to a human directly rather than accepting a form
            submission that would go nowhere. A form that silently discards its contents would be a
            fake feature.
          </p>
          <p className="mt-3 text-caption text-muted">
            Service requests are the exception: those are live and validated at{" "}
            <code className="rounded bg-surface-2 px-1">POST /api/v1/service-requests</code>, and
            they appear in the admin review queue immediately.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="selfserve">
          <h2 id="selfserve" className="text-h2 font-bold tracking-tight text-primary">
            Before you write to us
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Check delivery status",
                body: "Automated lines are released the moment payment is verified. If the code has not arrived, the payment verification itself may still be pending at the gateway.",
                href: "/dashboard",
                label: "Open your dashboard",
              },
              {
                title: "Activation not working",
                body: "Each product page carries its own activation guide, step by step, including what to do when a code is reported as already used.",
                href: "/explore",
                label: "Find your product",
              },
              {
                title: "Renewal or expiry",
                body: "Some subscriptions renew through us, some only through the provider, and some we can only remind you about. The listing states which.",
                href: "/pricing",
                label: "See renewal terms",
              },
              {
                title: "Student discount not applied",
                body: "The student step applies only after verification is approved, and only at step 3 of the discount ladder — after sale and bundle.",
                href: "/students",
                label: "Check verification",
              },
              {
                title: "Refund timing",
                body: "Mobile-wallet refunds typically land in 3–7 business days; card refunds depend on the issuer and can take up to 15.",
                href: "/legal/refunds",
                label: "Read the policy",
              },
              {
                title: "Invoice or VAT",
                body: "Every order generates a VAT-compliant invoice from its immutable price snapshot, downloadable from the order record.",
                href: "/legal/terms",
                label: "Read the terms",
              },
            ].map((item) => (
              <li key={item.title} className="card flex h-full flex-col gap-2 p-5">
                <h3 className="text-caption font-semibold text-primary">{item.title}</h3>
                <p className="flex-1 text-caption leading-relaxed text-secondary">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-1 inline-flex items-center gap-1.5 text-caption font-medium text-link hover:underline"
                >
                  {item.label}
                  <Icon.ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="faq">
          <h2 id="faq" className="text-h2 font-bold tracking-tight text-primary">
            Frequently asked
          </h2>
          <div className="mx-auto mt-6 max-w-3xl divide-y divide-line rounded-card-lg border border-line bg-surface-1">
            {faqs.map((faq) => (
              <details key={faq.id} className="group px-5 py-4 sm:px-6">
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
      </div>
    </>
  );
}
