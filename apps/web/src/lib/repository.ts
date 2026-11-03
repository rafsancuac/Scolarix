/**
 * Repository / data adapter — spec §17.4 layering, §11.2 compliance gate.
 *
 * UI code reads the catalogue ONLY through this module. Today it resolves from
 * seeded fixtures (`DATA_ADAPTER=static`, development and preview). The Prisma
 * adapter (`DATA_ADAPTER=prisma`) implements the same interface against
 * PostgreSQL; swapping it must not require touching a single component.
 *
 * The compliance gate lives here so no page can accidentally bypass it.
 */

import {
  announcement,
  bundles,
  categories,
  faqs,
  products,
  services,
  testimonials,
} from "../data/fixtures";
import {
  PUBLISHABLE_AUTHORIZATION,
  VERTICALS,
  VERTICAL_META,
  type Availability,
  type BrandVertical,
  type Bundle,
  type Category,
  type Faq,
  type Product,
  type ProductListItem,
  type ProductPlan,
  type Service,
  type Testimonial,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Compliance gate (§11.2)                                                     */
/* -------------------------------------------------------------------------- */

export interface GateFailure {
  reason:
    | "NOT_PUBLISHED"
    | "AUTHORIZATION_MISSING"
    | "AUTHORIZATION_UNAVAILABLE"
    | "EVIDENCE_MISSING"
    | "EVIDENCE_EXPIRED"
    | "NO_ACTIVE_PLAN";
  detail: string;
}

/**
 * A product is purchasable only when every §11.2 condition holds.
 * Turnitin is seeded as UNAVAILABLE_INDIVIDUAL_LICENSE with no plan, so it is
 * visible in the catalogue for information but can never be bought.
 */
export function evaluatePurchaseGate(product: Product): GateFailure | null {
  if (product.status !== "PUBLISHED") {
    return { reason: "NOT_PUBLISHED", detail: `${product.name} is not published.` };
  }
  if (product.authorizationStatus === "PENDING_VERIFICATION") {
    return {
      reason: "EVIDENCE_MISSING",
      detail: `${product.name} has no authorization evidence on file.`,
    };
  }
  // §11.2 / mandatory test #4: expired evidence makes the listing unpurchasable
  // immediately, even though it may stay visible for information.
  if (product.authorizationStatus === "EXPIRED_EVIDENCE") {
    return {
      reason: "EVIDENCE_EXPIRED",
      detail: `${product.name} authorization evidence has expired and must be renewed before it can be sold again.`,
    };
  }
  if (!PUBLISHABLE_AUTHORIZATION.includes(product.authorizationStatus)) {
    return {
      reason: "AUTHORIZATION_UNAVAILABLE",
      detail: `${product.name} has no individual licence channel.`,
    };
  }
  const activePlans = product.plans.filter((plan) => plan.active);
  if (activePlans.length === 0) {
    return { reason: "NO_ACTIVE_PLAN", detail: `${product.name} has no active plan.` };
  }
  return null;
}

export function isPurchasable(product: Product): boolean {
  return evaluatePurchaseGate(product) === null;
}

/* -------------------------------------------------------------------------- */
/* Availability (§9.2.2)                                                       */
/* -------------------------------------------------------------------------- */

const LOW_STOCK_THRESHOLD = 5;

export function availabilityOf(product: Product): Availability {
  if (!isPurchasable(product)) return "UNAVAILABLE";

  const tracked = product.plans.filter(
    (plan) => plan.active && plan.inventoryMode !== "UNLIMITED",
  );
  if (tracked.length === 0) return "IN_STOCK";

  const total = tracked.reduce((sum, plan) => sum + (plan.stock ?? 0), 0);
  if (total <= 0) return "UNAVAILABLE";
  if (total <= LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export function cheapestActivePlan(product: Product): ProductPlan | null {
  const active = product.plans
    .filter((plan) => plan.active)
    .sort((a, b) => a.pricePoisha - b.pricePoisha);
  return active[0] ?? null;
}

/** Published products, deterministically ordered (featured first, then name). */
export function listProducts(): Product[] {
  return sortProducts(products.filter((product) => product.status === "PUBLISHED"));
}

/** Sort by featured first, then name — deterministic and stable for SSR. */
function sortProducts(items: Product[]): Product[] {
  return [...items].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function listProductItems(opts?: { purchasableOnly?: boolean }): ProductListItem[] {
  const published = products.filter((product) => product.status === "PUBLISHED");
  const filtered = opts?.purchasableOnly
    ? published.filter(isPurchasable)
    : published;

  return sortProducts(filtered).map((product) => {
    const cheapest = cheapestActivePlan(product);
    return {
      product,
      fromPricePoisha: cheapest && isPurchasable(product) ? cheapest.pricePoisha : null,
      availability: availabilityOf(product),
      activePlanCount: product.plans.filter((plan) => plan.active).length,
    };
  });
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug && product.status === "PUBLISHED");
}

export function listTrending(limit = 8): ProductListItem[] {
  return listProductItems({ purchasableOnly: true })
    .filter((item) => item.product.isTrending)
    .slice(0, limit);
}

export function listBestSellers(limit = 8): ProductListItem[] {
  return listProductItems({ purchasableOnly: true })
    .filter((item) => item.product.isBestseller)
    .slice(0, limit);
}

export function listFeatured(limit = 6): ProductListItem[] {
  return listProductItems({ purchasableOnly: true })
    .filter((item) => item.product.isFeatured)
    .slice(0, limit);
}

export function listStudentEligible(limit = 8): ProductListItem[] {
  return listProductItems({ purchasableOnly: true })
    .filter((item) => item.product.isStudentEligible)
    .slice(0, limit);
}

export function listByCategory(slug: Category["slug"]): ProductListItem[] {
  return listProductItems().filter((item) => item.product.categorySlug === slug);
}

export function listByVertical(vertical: BrandVertical): ProductListItem[] {
  return listProductItems().filter((item) => item.product.vertical === vertical);
}

export function listRelated(product: Product, limit = 4): ProductListItem[] {
  return listProductItems({ purchasableOnly: true })
    .filter(
      (item) =>
        item.product.id !== product.id &&
        (item.product.categorySlug === product.categorySlug ||
          item.product.vertical === product.vertical),
    )
    .slice(0, limit);
}

export function getPlanBySku(sku: string): { product: Product; plan: ProductPlan } | undefined {
  for (const product of products) {
    const plan = product.plans.find((candidate) => candidate.sku === sku);
    if (plan) return { product, plan };
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Categories & verticals                                                      */
/* -------------------------------------------------------------------------- */

export function listCategories(): (Category & { itemCount: number })[] {
  return categories.map((category) => ({
    ...category,
    itemCount: products.filter(
      (product) =>
        product.categorySlug === category.slug &&
        product.status === "PUBLISHED" &&
        isPurchasable(product),
    ).length,
  }));
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function listVerticals(): {
  slug: BrandVertical;
  label: string;
  blurb: string;
  itemCount: number;
  serviceCount: number;
}[] {
  return VERTICALS.map((vertical) => ({
    slug: vertical,
    label: VERTICAL_META[vertical].label,
    blurb: VERTICAL_META[vertical].blurb,
    itemCount: products.filter(
      (product) =>
        product.vertical === vertical &&
        product.status === "PUBLISHED" &&
        isPurchasable(product),
    ).length,
    serviceCount: services.filter(
      (service) => service.vertical === vertical && service.status === "PUBLISHED",
    ).length,
  }));
}

/* -------------------------------------------------------------------------- */
/* Services (Vertical B)                                                       */
/* -------------------------------------------------------------------------- */

export function listServices(): Service[] {
  return services
    .filter((service) => service.status === "PUBLISHED")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug && service.status === "PUBLISHED");
}

/* -------------------------------------------------------------------------- */
/* Bundles                                                                     */
/* -------------------------------------------------------------------------- */

export function listBundles(): Bundle[] {
  return bundles.filter((bundle) => bundle.status === "PUBLISHED");
}

export function getBundleBySlug(slug: string): Bundle | undefined {
  return bundles.find((bundle) => bundle.slug === slug && bundle.status === "PUBLISHED");
}

/* -------------------------------------------------------------------------- */
/* Site content                                                                */
/* -------------------------------------------------------------------------- */

export function listFaqs(): Faq[] {
  return faqs;
}

export function getAnnouncement() {
  return announcement.active ? announcement : null;
}

/**
 * Empty until the platform has completed, moderated orders (§9.1.2).
 * The homepage section hides itself rather than showing invented quotes.
 */
export function listTestimonials(): Testimonial[] {
  return testimonials.filter((testimonial) => testimonial.verified);
}

/* -------------------------------------------------------------------------- */
/* Search (§13.16) — Postgres FTS in production; same interface here           */
/* -------------------------------------------------------------------------- */

export interface SearchHit {
  kind: "product" | "service";
  slug: string;
  name: string;
  blurb: string;
  provider?: string;
}

export function search(query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches = (haystack: string) => haystack.toLowerCase().includes(q);

  const productHits: SearchHit[] = listProductItems()
    .filter(
      ({ product }) =>
        matches(product.name) ||
        matches(product.provider) ||
        matches(product.shortDescription),
    )
    .slice(0, limit)
    .map(({ product }) => ({
      kind: "product",
      slug: product.slug,
      name: product.name,
      blurb: product.shortDescription,
      provider: product.provider,
    }));

  const serviceHits: SearchHit[] = listServices()
    .filter((service) => matches(service.name) || matches(service.shortDescription))
    .slice(0, limit)
    .map((service) => ({
      kind: "service",
      slug: service.slug,
      name: service.name,
      blurb: service.shortDescription,
    }));

  return [...productHits, ...serviceHits].slice(0, limit);
}
