/**
 * Brand configuration — spec §3.1 / §3.1.1 (D15 clearance gate).
 *
 * The brand name is NOT cleared. Trademark search, domain and social-handle
 * availability must all be confirmed before the name appears in a logo, a
 * domain registration or paid marketing. Until D15 closes the name lives in
 * exactly this one module (and `BRAND_NAME` in the environment), so a rename
 * is a one-file change with zero component edits.
 *
 * ---------------------------------------------------------------------------
 * D15 EVIDENCE LOG (do not delete — this is the clearance record)
 *
 * "Scholarix"  — REJECTED by the client (2026-11-03). Retired.
 * "Nexora"     — CONFLICT, 2026-11-04 search:
 *                  · US Reg. #7833669 / Serial #98762332, Class 014 (jewelry),
 *                    Guangzhou Lingshi E-commerce Co. — Live/Registered
 *                    17 Jun 2025, first use 02 Aug 2024.
 *                  · DCC Technology (parent of Almo Pro AV, Exertis) rebranded
 *                    its entire group to "Nexora" on 2 Dec 2025 — 27 specialist
 *                    technology businesses, ~2,500 staff, global distribution.
 *                    Direct sector overlap with technology resale. DO NOT USE.
 *
 * Next step: run 3–5 fresh candidates through the same gate
 * (WIPO Global Brand DB + USPTO TESS + DPDTM Bangladesh + domain + handles),
 * record results here, then set BRAND_CLEARED=true and commission the logo
 * (Concept A, §3.2).
 * ---------------------------------------------------------------------------
 */

const FALLBACK_NAME = "Scholarix";
const FALLBACK_TAGLINE = "Think Smarter. Achieve More.";

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  if (!value) return fallback;
  // Never render an unresolved template placeholder into the UI.
  if (value.includes("{{")) return fallback;
  return value;
}

const name = readEnv("BRAND_NAME", FALLBACK_NAME);

export const BRAND = {
  name,
  tagline: readEnv("BRAND_TAGLINE", FALLBACK_TAGLINE),
  slug: readEnv("BRAND_SLUG", "marketplace"),
  /** D15 gate — see the evidence log above before flipping to true. */
  cleared: process.env.BRAND_CLEARED === "true",
  /** Monogram used by the placeholder logo tile until a commissioned mark exists. */
  monogram: readEnv("BRAND_MONOGRAM", name.slice(0, 2).toUpperCase()),
  /** Provisional-name pill shown while the D15 gate is open. */
  provisionalLabel: "Provisional name — brand clearance pending",
} as const;

export const IS_DEMO_MODE = process.env.DEMO_MODE !== "false";

/**
 * Legal disclaimer required in the site footer (§3.1.1, §20): the platform is
 * an independent reseller and service provider, not affiliated with, endorsed
 * by or sponsored by any third-party product owner whose name, logo or
 * trademark may appear.
 */
export const TRADEMARK_DISCLAIMER = `${BRAND.name} is an independent marketplace and service provider. It is not affiliated with, endorsed by, or sponsored by any third-party product owner whose name or trademark appears on this site. All third-party names, logos and marks are the property of their respective owners and are used for identification only.`;
