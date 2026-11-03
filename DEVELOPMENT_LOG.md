# DEVELOPMENT LOG

Mandatory running record (spec §27). Newest entry first. Every phase reports:
changed files, implemented functionality, tests executed, test results, known
issues, remaining tasks, next-phase proposal.

---

## Phase 1 — Storefront foundation

**Date:** 2026-11-03 → 2026-11-04
**Status:** ✅ Complete (within the scope defined below)
**Branch:** `main`
**Coordinator:** single-operator build; no parallel agents in this phase

### Objective

Deliver a working, reviewable storefront — real catalogue, real pricing
arithmetic, the §11.2 compliance gate, service intake with the §12.6 integrity
screen, and the full legal set — before any infrastructure exists, at the
client's explicit instruction to **build the site first** rather than prototype
it.

### Implemented functionality

**Routing (17 pages, 3 API endpoints, 23 distinct URLs)**

| Area | Routes |
|---|---|
| Storefront | `/`, `/explore`, `/pricing`, `/search`, `/students`, `/support` |
| Catalogue | `/products/[slug]` (12), `/categories/[slug]` (6), `/bundles` + `/bundles/[slug]` (4) |
| Services | `/services`, `/services/[slug]` (6) |
| Private | `/dashboard`, `/admin`, `/checkout` |
| Legal | `/legal`, `/legal/[slug]` (5 documents) |
| API | `GET /api/v1/health`, `POST /api/v1/service-requests`, `POST /api/v1/checkout/sessions` |
| System | `sitemap.xml`, `robots.txt`, `not-found`, `error`, `loading` |

**Design system (§7)** — Brand four (Midnight `#111827`, Indigo `#4F46E5`, Cyan
`#06B6D4`, Cloud `#F8FAFC`) plus supporting palette, defined once in
`globals.css` as `@theme` tokens. Light and dark are **separate semantic token
sets** (`:root` and `[data-theme="dark"]`), mapped to utilities through
`@theme inline`. Verified: `grep -rn '#[0-9a-fA-F]\{6\}' src/components src/app`
returns **zero** hex literals in JSX — components consume semantic tokens only.
Type scale Display/H1/H2/H3/Body/Caption per §7.2, tabular numerals via `.tnum`,
radii 10/16/20, spacing rhythm 4/8, header 72px, sidebar 264px, content 1280px,
motion 150/220ms on `cubic-bezier(0.16,1,0.3,1)`, with a global
`prefers-reduced-motion` guard.

**Money (§1.1, §6 rule 1, §13.8)** — Integer BDT poisha end to end.
`assertPoisha()` rejects floats, NaN, infinities and negatives at the domain
boundary. The discount ladder runs SALE → BUNDLE → STUDENT → COUPON, each
percentage step computed on the **running** amount, half-up rounding, with a
price floor that clips and reports. `formatBDT()` is the single display boundary
(৳, en-BD grouping). `effectiveMonthlyPoisha()` normalises across durations.

**Compliance gate (§11.2)** — `evaluatePurchaseGate()` is a pure function over a
`Product`, refusing unpublished listings, missing evidence, **expired evidence**,
no individual licence channel, and no active plan. It re-runs at catalogue list,
detail page, cart load, checkout render, and inside
`POST /api/v1/checkout/sessions`. The client `PlanPicker` receives the verdict
read-only and cannot override it.

**Service intake (§12.5, §12.6)** — `POST /api/v1/service-requests` validates
server-side, requires the integrity declaration (rejecting a truthy
non-boolean), screens the brief against four prohibited-scope rule families, and
routes a match to `REVIEW_REQUIRED` rather than `QUOTE_PENDING`. Accepted
requests are appended to a JSONL store with the declaration timestamp, IP and
user agent, and are read back by `/admin`. Rate limited to 5/min per IP.

**Honest refusal (ADR-0014)** — `/checkout` computes a real total and renders a
"Payment not connected" notice with **no pay button**. The sessions endpoint
returns **501**, never a fabricated redirect. `/api/v1/health` returns **503
degraded** with a `missingRequired` array. `/dashboard` and `/admin` state what
is not connected and render only live data. Homepage testimonials do not render
at all while the verified list is empty.

**SEO & a11y (§21)** — `metadataBase` from `NEXT_PUBLIC_SITE_URL`, per-route
titles/descriptions/canonicals, JSON-LD for Organization, Product, Service,
FAQPage and BreadcrumbList. Sitemap built from the repository so an unpublished
listing disappears automatically; `/dashboard`, `/admin`, `/checkout` excluded
and disallowed in `robots.txt`. Skip link, focus-visible ring on every
interactive element, `aria-current`/`aria-live`/`aria-busy`, 44px touch targets,
 labelled form controls, and a mobile drawer with a real focus trap and Escape
handling.

**Infrastructure** — `docker-compose.yml` (postgres 17, redis 7, web, worker,
migrate, mailpit), a multi-stage non-root `Dockerfile` that runs typecheck +
tests + verify-financials **inside the image build**, and a validated Prisma
schema.

### Changed files (58 source files, ~13,500 lines)

```
marketplace/
  README.md  DEVELOPMENT_LOG.md  docker-compose.yml  .env.example  .gitignore
  docs/SETUP.md
  docs/adr/ADR-0013-fixture-adapter-behind-repository-seam.md
  docs/adr/ADR-0014-no-fake-payment-confirmation.md
  packages/database/prisma/schema.prisma
  apps/web/  package.json  tsconfig.json  next.config.ts  postcss.config.mjs  Dockerfile
    scripts/verify-financials.mjs
    tests/{money,compliance,checkout,service-request}.test.ts
    src/app/    globals.css  layout.tsx  page.tsx  loading.tsx  error.tsx
                not-found.tsx  sitemap.ts  robots.ts
                explore/  pricing/  search/  students/  support/  checkout/
                dashboard/  admin/  products/[slug]/  services/{,[slug]}/
                bundles/{,[slug]}/  categories/[slug]/  legal/{,[slug]}/
                api/v1/{health,service-requests,checkout/sessions}/route.ts
    src/components/ui/       icon  badge  button  logo-tile  theme-toggle
    src/components/layout/   navbar  footer  announcement-bar  demo-mode-ribbon
    src/components/home/     hero  sections
    src/components/marketplace/  product-card  service-card  plan-picker
                                 service-request-form
    src/lib/    types  money  format  checkout  repository  service-request
                request-store  brand  metadata
    src/data/   fixtures  legal
```

### Tests executed and results

```
npm run typecheck        tsc --noEmit, strict + noUncheckedIndexedAccess
                         → exit 0, no diagnostics

npm run test             tsx --test tests/*.test.ts
                         → tests 112   suites 22   pass 112   fail 0

npm run verify-financials  tsx scripts/verify-financials.mjs
                         → checks 26   failures 0
                         → §8 ledger: SKIP (explicitly "not a pass")

next build               → Compiled successfully in 1022 ms
                           46/46 static pages generated, exit 0

prisma validate          → "The schema ... is valid 🚀"
                           (46 models, 26 enums, 1,408 lines)

Route smoke test         → 23/23 routes HTTP 200, /nope-404 → 404

API contract test
  POST /api/v1/service-requests  (valid)              → 201 QUOTE_PENDING
  POST /api/v1/service-requests  (no declaration)     → 422 VALIDATION_FAILED
  POST /api/v1/service-requests  (prohibited scope)   → 201 REVIEW_REQUIRED
  POST /api/v1/checkout/sessions (no gateway)         → 501 PAYMENTS_NOT_CONFIGURED
  GET  /api/v1/health                                 → 503 degraded, 4 missing

Seam integrity           → grep "data/fixtures" src/app src/components: no match
Hex-literal audit        → grep '#[0-9a-fA-F]{6}' in JSX: no match
```

**Mandatory tests from §25.3 covered in Phase 1:** #4 (expired authorization →
unpurchasable) and #26 (missing declaration + prohibited keyword) are covered by
`compliance.test.ts` and `service-request.test.ts`. The remaining five require
the database and gateway, and are Phase 2–5 work.

### Defects found and fixed during this phase

Recorded because each one was a real bug, not a typo, and two were caught by a
check rather than by a person:

1. **`verify-financials` caught a data-model gap.** It asserted "a longer plan is
   never priced higher per month" and failed on JetBrains: Education 12-month
   (৳54,204/mo) versus Individual 12-month (৳204,307/mo). The invariant was
   sound; the **model** was wrong — `ProductPlan` had no way to express who a
   price is for. Fixed by adding an optional `audience` field
   (`STANDARD|STUDENT|EDUCATION|TEAM|ENTERPRISE`), tagging the three affected
   fixture plans, and re-scoping the check per audience. A second scan then found
   the same problem on Notion and GitHub Copilot (a ৳0 education referral
   alongside a paid plan). Also added: "a zero-price plan may only exist as an
   education referral."

2. **`EXPIRED_EVIDENCE` did not exist.** Mandatory test #4 requires expired
   authorization evidence to make a listing unpurchasable, but
   `AUTHORIZATION_STATUSES` had no expired state and the gate had no branch for
   it — so the rule was documented, not implemented. Added the status, the
   `EVIDENCE_EXPIRED` gate reason, the plan-picker heading, and two tests.

3. **`applyDiscounts` misreported the price floor.** `floorApplied` was derived
   from `running === floorPoisha`, so a discount *clipped* by the floor was not
   reported unless the total happened to land exactly on it — a silent financial
   discrepancy. Rewritten to track clipping per step.

4. **`formatBDT` could display poisha on a whole-taka price**
   (`maximumFractionDigits: 2`), and `roundingMode: "halfUp"` crashed on Node 20
   (`RangeError` — that ICU option postdates it). Set to 0 fraction digits and
   relied on the default `halfExpand`, which is half-away-from-zero.

5. **`repository.ts` shipped a non-existent method** (`a.sortOrderSafe()`) plus a
   bogus `declare module` augmentation. Replaced with the existing
   `sortProducts()` helper.

6. **Font variable mismatch.** `globals.css` referenced `--font-geist`, which no
   layout defined. Geist dropped; `--font-display` maps to Inter, with Hind
   Siliguri loaded for the eventual Bangla rollout (D16).

7. **`compact` prop passed to `Badge`**, which does not accept it (only
   `OfferingTypeBadge` does) — a strict-mode type error.

8. **Docker build-context path bug.** `docker-compose.yml` sets `context: .` at
   the repo root, but the Dockerfile used `COPY marketplace/...`. Corrected to
   `COPY apps/web/...`, and the `COPY /app/public` line removed (no `public/`
   exists — blocked by the D15 logo gate).

9. **Healthcheck would have made the container permanently unhealthy.** The
   endpoint correctly returns 503 while integrations are missing; a
   `r.ok`-based healthcheck would never pass. Split into liveness (200 **or**
   503 = alive) versus readiness (load balancer reads the body).

10. **`hrefWith` filter helper had a garbled conditional** and the explore sort
    `<select>` carried an `onChange` in a server component (a type error).

### Brand gate (D15) — material finding

Searched for a working name and found the obvious candidate is **already taken**:

> **Nexora** — US Reg. #7833669 / Serial #98762332, Class 014, Guangzhou
> Lingshi E-commerce Co., Live/Registered 17 Jun 2025, first use 02 Aug 2024.
> Separately, **DCC Technology** (parent of Almo Pro AV, formerly Exertis)
> rebranded its entire group to **Nexora** on 2 Dec 2025 — 27 specialist
> technology distribution businesses, ~2,500 staff, global. Direct sector
> overlap with technology resale. **Do not use.**

Recorded in the evidence log at `apps/web/src/lib/brand.ts` and summarised in
`README.md` §1.1. The app renders a provisional name with a visible warning
(`BRAND_CLEARED=false`) and no logo asset exists.

### Bundle size (§18.1 budget: ≤170 KB first-load JS on home)

Production build, all chunks: **602.5 KB raw / 186.5 KB gzip**, CSS 55.6 KB raw
/ 9.4 KB gzip. The three framework chunks are 69.6 + 45.2 + 38.5 KB gzip; the
remaining six are ~33 KB gzip total, so application code is a small fraction.

**Not yet a verified pass.** 186.5 KB gzip is the aggregate across every route,
not the per-page first-load figure, and Next 16 does not print a size column in
its build output. Measure properly with Lighthouse against `next start` in
Phase 9. No third-party runtime JS is included (inline SVG icons, no icon
package, no animation library, no shadcn), which is the main reason the
application share is small.

### Known issues

1. **No database.** `DATA_ADAPTER=static`. Nothing purchasable can be persisted.
   Service requests *are* persisted, to `apps/web/.data/service-requests.jsonl`.
2. **No authentication.** No signed-in user exists, so `/dashboard` and `/admin`
   are shells that say so. No RBAC, no TOTP, no audit log writes.
3. **No payment.** Checkout computes and then stops. 501, not a fake success.
4. **`verify-financials` §8 is a SKIP.** Gross / Net / Contribution Margin are
   unverified until a ledger exists.
5. **Rate limiting is in-process** (a `Map`, 5/min/IP). Does not survive a
   restart and does not work across replicas. Needs Redis.
6. **Prisma schema is validated but unwired.** No client generated, no migration
   run. The `migrate` compose service prints a notice.
7. **The `worker` compose service idles.** No fulfilment entrypoint until
   Phase 5.
8. **No logo, no `public/` directory.** Blocked by D15. Monogram tiles stand in
   for provider marks, which also avoids a trademark-usage question we have not
   cleared (§11.6).
9. **Search is an in-memory substring matcher**, not Postgres FTS.
10. **`next/font/google` needs network at build time.** Self-hosted at runtime,
    so no third-party font request in production — but an offline build fails.
11. **English only.** Hind Siliguri is loaded and `--font-bangla` exists, but
    `FEATURE_I18N_BN=false` and there is no Bangla content (D16).
12. **No CSP.** Static security headers are set (`nosniff`, `DENY`,
    referrer, Permissions-Policy); nonce-based CSP is Phase 9.

### Remaining tasks for Phase 1 scope

None. Everything in the objective above is implemented, tested and verified.

### Next-phase proposal — Phase 2: data layer

Ordered so each step is independently verifiable:

1. **Close D15** (parallel, non-engineering). Until then no logo, domain or
   marketing spend. This is the only item that blocks launch-wave-1 *branding*,
   not launch-wave-1 *code*.
2. **Generate the Prisma client** from the validated schema and run the first
   migration against `docker compose up -d postgres`.
3. **Implement `repository-prisma.ts`** against the existing seam. Keep
   `evaluatePurchaseGate` / `availabilityOf` / `isPurchasable` **pure** — they
   are business rules, not queries.
4. **Re-run `npm run check`.** The 112 tests and 26 financial checks must pass
   against real rows. `verify-financials` §7 (category counts vs. purchasable
   listings) is the check most likely to catch a naive `WHERE` clause.
5. **Migrate `request-store.ts`** to a `service_requests` insert plus an audit
   entry **in the same transaction**.
6. **Write the catalogue seed** from the fixtures, so demo and production data
   have one definition.
7. **Swap `search()`** to Postgres FTS behind the same signature.
8. **Only then** flip `DATA_ADAPTER=prisma` and re-verify `/api/v1/health`.

Hot-path budget for step 3: ≤50 ms, no N+1 (§18.1). `listProductItems` maps
every product to its cheapest plan — in SQL that is one lateral join or
`DISTINCT ON`, not a query per product.

Phase 3 (Auth.js v5) should not start before step 4 is green: the dashboard
panels are meaningless without a data layer to read from.

---

## Phase 0 — Specification

**Date:** 2026-11-03
**Status:** ✅ Complete

Consolidated three source documents (the original 27-section Bengali-framed
brief, the NEXORA blueprint + monorepo tree, and the Scholarix master execution
prompt + brand blueprint) into one canonical specification at
`../ai-marketplace-spec/MASTER_DEVELOPMENT_PROMPT.md`.

**v4.0:** 2,249 lines, 38 h2 headings, 30 sections plus Appendices A–F.
Validated: code fences even, UTF-8 clean, 36 TOC links with 0 broken anchors,
non-ASCII audit clean, brand-leak audit clean (30 `{{BRAND_NAME}}`, 11
`{{BRAND_SLUG}}`, Scholarix appearing only in retirement context).

**Companion documents:** `AGENTS.md` v4.0, `AGENT_COORDINATION.md`,
`BRAND_NAMING.md`, `CHANGELOG.md`, `KICKOFF_PROMPT.md`, plus frozen v3.0 copies
in `archive/`.

**Key changes across versions:**

| | v2.0 | v3.0 | v4.0 |
|---|---|---|---|
| Brand | Scholarix | Scholarix | `{{BRAND_NAME}}` (D15 gate) |
| Tagline | "Your Digital Advantage." | same | **"Think Smarter. Achieve More."** |
| Verticals | 2 | 2 | **5** brand / 2 fulfilment |
| Phases | 0–8 | 0–8 | **10 canonical** + Phase 0/0.5 |
| API | `/api/...` | same | **`/api/v1/*`** mandatory |
| Queue | pg-boss | pg-boss | **BullMQ** |
| Auth | custom sessions | custom | **Auth.js v5, DB-session** |
| Palette | violet `#7C5CFF` | same | **Midnight/Indigo/Cyan/Cloud** |
| Success | `#22C55E` | same | **`#10B981`** |
| Radii | 8/12/16 | same | **10/16/20** |
| Core rules | 12 | 12 | **14** |
| Tests | 7 | 7 | **29** (7 mandatory) |

**Decisions resolved (§29.1):** Vertical B in MVP · portable Docker-first ·
Auth.js v5 with 7 mandatory settings · English only at launch · 10 merged phases
· brand renamed · automated code-vault fulfilment stays in MVP · integer poisha ·
Turnitin non-purchasable · `/api/v1/*`.

**Still open (§29.2):** D2 entity · D3 authorization/suppliers · D4 aggregator ·
D5 VAT · D6 refunds · D7 SLAs · D8 student verification · D9 support sourcing ·
D10 analytics · D11 affiliate rates · D12 host · D13 service pricing/payouts ·
D14 international · **D15 name clearance** · D16 Bangla rollout · D17 logo
concept.

**Phase 0.5 note:** the spec's clickable-prototype gate was **superseded** by the
client's explicit instruction to develop the actual site first. Phase 1 therefore
delivered working pages rather than a prototype; the §9 page specifications were
used as the design reference throughout.
