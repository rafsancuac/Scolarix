/**
 * robots.txt — spec §21.1.
 *
 * Private and non-content routes are disallowed outright so crawler budget is
 * spent on the catalogue. Indexing can be disabled globally with
 * NEXT_PUBLIC_ROBOTS_INDEX=false, which is what a staging deployment should set.
 */

import type { MetadataRoute } from "next";
import { metadataBase } from "@/lib/metadata";

const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ROBOTS_INDEX !== "false";

export default function robots(): MetadataRoute.Robots {
  const base = metadataBase.toString().replace(/\/$/, "");

  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: "*", disallow: "/" }], sitemap: `${base}/sitemap.xml` };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/checkout",
          "/api/",
          "/.data/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
