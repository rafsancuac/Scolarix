/**
 * Repository / data adapter — spec §17.4 layering, §11.2 compliance gate.
 *
 * UI code reads the catalogue ONLY through this module. Every query function is
 * ASYNC so a database-backed adapter can implement the same contract (ADR-0013,
 * amended: the seam is a Promise-returning interface). Today it resolves from
 * seeded fixtures (`DATA_ADAPTER=static`).
 *
 * The pure business rules live in `catalogue-rules.ts` and are re-exported here
 * so existing imports keep working. They stay synchronous on purpose.
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
  availabilityOf,
  cheapestActivePlan,
  isPurchasable,
} from "./catalogue-rules";
import {
  VERTICALS,
  VERTICAL_META,
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

export {
  availabilityOf,
  cheapestActivePlan,
  evaluatePurchaseGate,
  isPurchasable,
} from "./catalogue-rules";
export type { GateFailure } from "./catalogue-rules";

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

/** Sort by featured first, then name — deterministic and stable for SSR. */
function sortProducts(items: Product[]): Product[] {
  return [...items].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Published products, deterministically ordered (featured first, then name). */
export async function listProducts(): Promise<Product[]> {
  return sortProducts(products.filter((product) => product.status === "PUBLISHED"));
}

export async function listProductItems(opts?: {
  purchasableOnly?: boolean;
}): Promise<ProductListItem[]> {
  const published = products.filter((product) => product.status === "PUBLISHED");
  const filtered = opts?.purchasableOnly ? published.filter(isPurchasable) : published;

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

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return products.find((product) => product.slug === slug && product.status === "PUBLISHED");
}

export async function listTrending(limit = 8): Promise<ProductListItem[]> {
  const items = await listProductItems({ purchasableOnly: true });
  return items.filter((item) => item.product.isTrending).slice(0, limit);
}

export async function listBestSellers(limit = 8): Promise<ProductListItem[]> {
  const items = await listProductItems({ purchasableOnly: true });
  return items.filter((item) => item.product.isBestseller).slice(0, limit);
}

export async function listFeatured(limit = 6): Promise<ProductListItem[]> {
  const items = await listProductItems({ purchasableOnly: true });
  return items.filter((item) => item.product.isFeatured).slice(0, limit);
}

export async function listStudentEligible(limit = 8): Promise<ProductListItem[]> {
  const items = await listProductItems({ purchasableOnly: true });
  return items.filter((item) => item.product.isStudentEligible).slice(0, limit);
}

export async function listByCategory(slug: Category["slug"]): Promise<ProductListItem[]> {
  const items = await listProductItems();
  return items.filter((item) => item.product.categorySlug === slug);
}

export async function listByVertical(vertical: BrandVertical): Promise<ProductListItem[]> {
  const items = await listProductItems();
  return items.filter((item) => item.product.vertical === vertical);
}

export async function listRelated(product: Product, limit = 4): Promise<ProductListItem[]> {
  const items = await listProductItems({ purchasableOnly: true });
  return items
    .filter(
      (item) =>
        item.product.id !== product.id &&
        (item.product.categorySlug === product.categorySlug ||
          item.product.vertical === product.vertical),
    )
    .slice(0, limit);
}

export async function getPlanBySku(
  sku: string,
): Promise<{ product: Product; plan: ProductPlan } | undefined> {
  for (const product of products) {
    const plan = product.plans.find((candidate) => candidate.sku === sku);
    if (plan) return { product, plan };
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Categories & verticals                                                      */
/* -------------------------------------------------------------------------- */

export async function listCategories(): Promise<(Category & { itemCount: number })[]> {
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

export async function getCategory(slug: string): Promise<Category | undefined> {
  return categories.find((category) => category.slug === slug);
}

export async function listVerticals(): Promise<
  {
    slug: BrandVertical;
    label: string;
    blurb: string;
    itemCount: number;
    serviceCount: number;
  }[]
> {
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

export async function listServices(): Promise<Service[]> {
  return services
    .filter((service) => service.status === "PUBLISHED")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getServiceBySlug(slug: string): Promise<Service | undefined> {
  return services.find((service) => service.slug === slug && service.status === "PUBLISHED");
}

/* -------------------------------------------------------------------------- */
/* Bundles                                                                     */
/* -------------------------------------------------------------------------- */

export async function listBundles(): Promise<Bundle[]> {
  return bundles.filter((bundle) => bundle.status === "PUBLISHED");
}

export async function getBundleBySlug(slug: string): Promise<Bundle | undefined> {
  return bundles.find((bundle) => bundle.slug === slug && bundle.status === "PUBLISHED");
}

/* -------------------------------------------------------------------------- */
/* Site content                                                                */
/* -------------------------------------------------------------------------- */

export async function listFaqs(): Promise<Faq[]> {
  return faqs;
}

export async function getAnnouncement(): Promise<typeof announcement | null> {
  return announcement.active ? announcement : null;
}

/**
 * Empty until the platform has completed, moderated orders (§9.1.2).
 * The homepage section hides itself rather than showing invented quotes.
 */
export async function listTestimonials(): Promise<Testimonial[]> {
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

export async function search(query: string, limit = 12): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches = (haystack: string) => haystack.toLowerCase().includes(q);

  const [productItems, serviceItems] = await Promise.all([listProductItems(), listServices()]);

  const productHits: SearchHit[] = productItems
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

  const serviceHits: SearchHit[] = serviceItems
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