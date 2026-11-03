/**
 * Shared domain types — spec §1.1 glossary, §14 data model.
 *
 * These mirror the Prisma enums in `packages/database/prisma/schema.prisma`.
 * In the target layout this file lives in `packages/shared` and is imported by
 * both the web app and the workers so client and server cannot drift (§17.4).
 */

/* -------------------------------------------------------------------------- */
/* Brand taxonomy (§4)                                                         */
/* -------------------------------------------------------------------------- */

export const VERTICALS = ["AI", "ACADEMIC", "PRO", "SERVICES", "STUDENT"] as const;
export type BrandVertical = (typeof VERTICALS)[number];

export const VERTICAL_META: Record<
  BrandVertical,
  { slug: string; label: string; blurb: string }
> = {
  AI: { slug: "ai", label: "AI", blurb: "AI assistants and AI-powered tools" },
  ACADEMIC: {
    slug: "academic",
    label: "Academic",
    blurb: "Writing, research and learning",
  },
  PRO: {
    slug: "pro",
    label: "Pro",
    blurb: "Professional productivity and developer tools",
  },
  SERVICES: { slug: "services", label: "Services", blurb: "Original digital services" },
  STUDENT: {
    slug: "student",
    label: "Student",
    blurb: "Student offers, bundles and programmes",
  },
};

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export type CategorySlug =
  | "ai-assistants"
  | "academic-writing"
  | "research-tools"
  | "productivity"
  | "development"
  | "language-learning";

/**
 * What the customer ACTUALLY receives. Mandatory disclosure on cards, detail
 * pages, cart lines, order lines, invoices and the dashboard (§9.2.2, §11.7).
 * These must never be presented as interchangeable kinds of subscription.
 */
export const OFFERING_TYPES = [
  "PERSONAL_SUBSCRIPTION",
  "GIFT_VOUCHER",
  "INSTITUTIONAL_LICENSE",
  "EDUCATION_REFERRAL",
  "OWN_PRODUCT",
  "SERVICE",
] as const;
export type OfferingType = (typeof OFFERING_TYPES)[number];

export const OFFERING_TYPE_LABEL: Record<OfferingType, string> = {
  PERSONAL_SUBSCRIPTION: "Personal subscription",
  GIFT_VOUCHER: "Gift voucher — redeem on your own account",
  INSTITUTIONAL_LICENSE: "Institutional licence",
  EDUCATION_REFERRAL: "Education referral — provider verifies you",
  OWN_PRODUCT: "Our own product",
  SERVICE: "Original service",
};

export const AUTHORIZATION_STATUSES = [
  "PENDING_VERIFICATION",
  /**
   * Evidence existed but its validity window has closed. §11.2 requires the
   * listing to become unpurchasable the moment this happens — the worker that
   * checks expiry sets this status and the publish gate refuses it (§6 rule 6).
   */
  "EXPIRED_EVIDENCE",
  "AUTHORIZED_RESELLER",
  "OFFICIAL_PARTNER",
  "PERMITTED_GIFT_CODE",
  "EDUCATION_REFERRAL",
  "OWN_PRODUCT",
  "SERVICE",
  "UNAVAILABLE_INDIVIDUAL_LICENSE",
] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];

/** Authorization statuses that satisfy the publish gate (§11.2 item 1). */
export const PUBLISHABLE_AUTHORIZATION: readonly AuthorizationStatus[] = [
  "AUTHORIZED_RESELLER",
  "OFFICIAL_PARTNER",
  "PERMITTED_GIFT_CODE",
  "EDUCATION_REFERRAL",
  "OWN_PRODUCT",
  "SERVICE",
];

export const LICENCE_TYPES = [
  "GIFT_CODE",
  "RESELLER_PROVISIONED",
  "EDUCATION_REFERRAL",
  "INSTITUTIONAL",
  "OWN_PRODUCT",
] as const;
export type LicenceType = (typeof LICENCE_TYPES)[number];

export const DELIVERY_METHODS = [
  "AUTOMATED_CODE",
  "AUTOMATED_API",
  "MANUAL",
  "SERVICE",
] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  AUTOMATED_CODE: "Instant — code delivered automatically",
  AUTOMATED_API: "Instant — provisioned via provider API",
  MANUAL: "Manual — delivered by our team",
  SERVICE: "Service — delivered by a specialist",
};

export const INVENTORY_MODES = ["UNLIMITED", "TRACKED", "CODE_VAULT"] as const;
export type InventoryMode = (typeof INVENTORY_MODES)[number];

export const REFUND_ELIGIBILITIES = [
  "NON_REFUNDABLE",
  "REFUNDABLE_BEFORE_DELIVERY",
  "REFUNDABLE_WITHIN_WINDOW",
] as const;
export type RefundEligibility = (typeof REFUND_ELIGIBILITIES)[number];

export const REFUND_LABEL: Record<RefundEligibility, string> = {
  NON_REFUNDABLE: "Non-refundable once delivered",
  REFUNDABLE_BEFORE_DELIVERY: "Refundable before delivery",
  REFUNDABLE_WITHIN_WINDOW: "Refundable within the policy window",
};

/**
 * Whether THIS platform can renew the entitlement (§9.3.3). Drives the button
 * label and help text — never imply a capability the platform does not have.
 */
export const RENEWAL_CAPABILITIES = [
  "PLATFORM_RENEWAL",
  "PROVIDER_BILLING_ONLY",
  "REMINDER_ONLY",
] as const;
export type RenewalCapability = (typeof RENEWAL_CAPABILITIES)[number];

export const RENEWAL_LABEL: Record<RenewalCapability, string> = {
  PLATFORM_RENEWAL: "Renew here",
  PROVIDER_BILLING_ONLY: "Billed by the provider — renew with them",
  REMINDER_ONLY: "We remind you; you re-purchase",
};

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Money (integer minor units — §6 rule 1, spec §1.1)                          */
/* -------------------------------------------------------------------------- */

export type Currency = "BDT";

export interface Money {
  /** Integer minor units. BDT poisha: 1 BDT = 100 poisha. Never a float. */
  amountPoisha: number;
  currency: Currency;
}

/* -------------------------------------------------------------------------- */
/* Products & plans                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Who a plan is priced for. JetBrains, GitHub and several academic publishers
 * sell the SAME duration at different prices per audience, so "a longer plan is
 * cheaper per month" is only comparable within one audience. Added as an
 * optional field (Coordinator-approved additive contract change) so existing
 * plans stay valid and default to STANDARD.
 */
export const PLAN_AUDIENCES = ["STANDARD", "STUDENT", "EDUCATION", "TEAM", "ENTERPRISE"] as const;
export type PlanAudience = (typeof PLAN_AUDIENCES)[number];

export const PLAN_AUDIENCE_LABEL: Record<PlanAudience, string> = {
  STANDARD: "Standard",
  STUDENT: "Student",
  EDUCATION: "Education",
  TEAM: "Team",
  ENTERPRISE: "Enterprise",
};

export interface ProductPlan {
  id: string;
  sku: string;
  label: string;
  durationDays: number;
  /** Defaults to STANDARD when absent. */
  audience?: PlanAudience;
  pricePoisha: number;
  compareAtPoisha?: number;
  studentPricePoisha?: number;
  couponEligible: boolean;
  inventoryMode: InventoryMode;
  active: boolean;
  stock?: number;
}

export interface ProductFeature {
  id: string;
  label: string;
}

export interface ProductFaq {
  id: string;
  question: string;
  answer: string;
}

export interface SupplierSummary {
  id: string;
  legalName: string;
  agreementType: string;
  /** Cost price is admin-only and must never reach a public payload (§6 rule 14). */
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  provider: string;
  shortDescription: string;
  description: string;
  categorySlug: CategorySlug;
  vertical: BrandVertical;
  offeringType: OfferingType;
  /** Customer-facing "what you receive" statement (§11.7 item 1). */
  disclosureText: string;
  authorizationStatus: AuthorizationStatus;
  relationshipLabel: string;
  licenceType: LicenceType;
  eligibilityNote?: string;
  geographicRestrictions?: string;
  deliveryMethod: DeliveryMethod;
  deliverySlaHours: number;
  refundEligibility: RefundEligibility;
  activationGuide: string[];
  renewalCapability: RenewalCapability;
  renewalNote?: string;
  platforms: string[];
  features: ProductFeature[];
  faqs: ProductFaq[];
  plans: ProductPlan[];
  supplier?: SupplierSummary;
  isFeatured: boolean;
  isTrending: boolean;
  isBestseller: boolean;
  isStudentEligible: boolean;
  status: PublishStatus;
  accentHue: string;
  monogram: string;
}

/* -------------------------------------------------------------------------- */
/* Services (Vertical B — §12)                                                 */
/* -------------------------------------------------------------------------- */

export const SERVICE_PRICING_MODELS = ["FIXED", "PER_UNIT", "CUSTOM_QUOTE"] as const;
export type ServicePricingModel = (typeof SERVICE_PRICING_MODELS)[number];

export interface ServicePackage {
  id: string;
  sku: string;
  label: string;
  scope: string[];
  pricePoisha: number;
  turnaroundDays: number;
  revisionsIncluded: number;
  unitLabel?: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  categoryLabel: string;
  shortDescription: string;
  description: string;
  vertical: BrandVertical;
  scopeIncluded: string[];
  scopeExcluded: string[];
  /** Academic integrity declaration shown on every request (§12.6). */
  integrityNotice: string;
  pricingModel: ServicePricingModel;
  basePricePoisha?: number;
  unitLabel?: string;
  turnaroundDays: number;
  revisionsIncluded: number;
  requiresQuotation: boolean;
  packages: ServicePackage[];
  status: PublishStatus;
  accentHue: string;
  monogram: string;
}

/* -------------------------------------------------------------------------- */
/* Bundles                                                                     */
/* -------------------------------------------------------------------------- */

export interface BundleItemRef {
  itemType: "PRODUCT_PLAN" | "SERVICE_PACKAGE";
  sku: string;
  label: string;
  valuePoisha: number;
}

export interface Bundle {
  id: string;
  slug: string;
  name: string;
  description: string;
  vertical: BrandVertical;
  items: BundleItemRef[];
  pricePoisha: number;
  compareAtPoisha: number;
  isStudentOnly: boolean;
  status: PublishStatus;
}

/* -------------------------------------------------------------------------- */
/* Availability & listing shapes                                               */
/* -------------------------------------------------------------------------- */

export type Availability = "IN_STOCK" | "LOW_STOCK" | "UNAVAILABLE";

export interface ProductListItem {
  product: Product;
  fromPricePoisha: number | null;
  availability: Availability;
  activePlanCount: number;
}

export interface Category {
  slug: CategorySlug;
  label: string;
  blurb: string;
  vertical: BrandVertical;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  /**
   * Only real, verified testimonials may be shown (§9.1.2). This flag is set by
   * admin moderation and links to a completed order in the real data layer.
   */
  verified: boolean;
}
