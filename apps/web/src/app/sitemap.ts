/**
 * Sitemap — spec §21.1. Built from the repository so a listing that is
 * unpublished or removed from the catalogue disappears from the sitemap
 * automatically instead of returning a 404 to a crawler.
 */

import type { MetadataRoute } from "next";
import { legalDocuments } from "@/data/legal";
import { metadataBase } from "@/lib/metadata";
import {
  listBundles,
  listCategories,
  listProducts,
  listServices,
} from "@/lib/repository";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = metadataBase.toString().replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/bundles`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/students`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/legal`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const productRoutes: MetadataRoute.Sitemap = listProducts().map((product) => ({
    url: `${base}/products/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = listServices().map((service) => ({
    url: `${base}/services/${service.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const bundleRoutes: MetadataRoute.Sitemap = listBundles().map((bundle) => ({
    url: `${base}/bundles/${bundle.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = listCategories().map((category) => ({
    url: `${base}/categories/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const legalRoutes: MetadataRoute.Sitemap = legalDocuments.map((document) => ({
    url: `${base}/legal/${document.slug}`,
    lastModified: new Date(document.updated),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // /dashboard, /admin and /checkout are private and must never be indexed.
  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...serviceRoutes,
    ...bundleRoutes,
    ...legalRoutes,
  ];
}
