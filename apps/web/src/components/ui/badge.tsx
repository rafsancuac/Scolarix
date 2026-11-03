/**
 * Badge — spec §10.3 requires: Neutral · Info · Success · Warning · Danger ·
 * offering-type variants. Semantic tokens only (§7.1): no hex literals.
 */

import type { ReactNode } from "react";
import { OFFERING_TYPE_LABEL, type OfferingType } from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-2 text-secondary border-line",
  info: "bg-highlight-soft text-highlight border-transparent",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  accent: "bg-accent-soft text-accent border-accent/25",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-caption font-medium whitespace-nowrap ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Offering-type disclosure badge (§9.2.2).
 *
 * Binding rule: a personal plan, gift voucher, institutional licence and
 * education referral must never be presented as the same kind of subscription.
 * This badge is mandatory on cards, detail pages, cart lines, order lines,
 * invoices and the dashboard.
 */
export function OfferingTypeBadge({
  offeringType,
  compact = false,
}: {
  offeringType: OfferingType;
  compact?: boolean;
}) {
  const label = OFFERING_TYPE_LABEL[offeringType];
  const tone: Tone =
    offeringType === "GIFT_VOUCHER"
      ? "info"
      : offeringType === "EDUCATION_REFERRAL"
        ? "accent"
        : offeringType === "INSTITUTIONAL_LICENSE"
          ? "warning"
          : offeringType === "SERVICE"
            ? "success"
            : "neutral";

  return (
    <Badge tone={tone} className={compact ? "px-2 py-0.5" : undefined}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
      {compact ? shortLabel(offeringType) : label}
    </Badge>
  );
}

function shortLabel(offeringType: OfferingType): string {
  switch (offeringType) {
    case "GIFT_VOUCHER":
      return "Voucher";
    case "EDUCATION_REFERRAL":
      return "Education referral";
    case "INSTITUTIONAL_LICENSE":
      return "Institutional";
    case "PERSONAL_SUBSCRIPTION":
      return "Personal plan";
    case "OWN_PRODUCT":
      return "Our product";
    case "SERVICE":
      return "Service";
  }
}
