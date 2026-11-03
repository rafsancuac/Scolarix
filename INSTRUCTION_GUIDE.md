# Instruction Guide — start here

> **{{BRAND_NAME}}** · Premium AI & Academic Subscription Marketplace
> Bangladesh-first · BDT · bKash / Nagad / Rocket / SSLCommerz
> Built 2026-11-04 · Phase 1 of 10 · 74 files · ~13,500 lines · 112 tests passing

This guide gets the project running on your machine and tells you what to look
at. For architecture and rules, read `README.md`. For deployment and
troubleshooting, read `docs/SETUP.md`. For the running record, read
`DEVELOPMENT_LOG.md`.

---

## 1. Unzip and run — 3 commands

```bash
unzip marketplace.zip
cd marketplace/apps/web
npm install && npm run dev
```

Open **http://localhost:3000**.

That is everything. **No Docker, no PostgreSQL, no Redis, no API keys are needed
for Phase 1** — the catalogue is served by a seeded fixture adapter behind a
repository seam, and the pages are real.

### Requirements

| | Needed | Notes |
|---|---|---|
| Node.js | **≥ 20.9** | Developed on 20.20.2. Node 18 will not work. |
| npm | 10.x | **npm only** — no pnpm, no yarn. |
| RAM | ~1 GB free | Add `NODE_OPTIONS=--max-old-space-size=1024` under 2 GB. |
| Disk | ~550 MB | `node_modules` is ~534 MB; it is not in the zip. |
| Network | For `npm install` **and** for the first `next build` | `next/font/google` fetches Inter + Hind Siliguri at build time, then self-hosts them. |
| Docker | **Not for Phase 1** | Needed from Phase 2 (PostgreSQL) onward. |

### Verify it is healthy

```bash
npm run check
```

Expected:

```
tsc --noEmit                     → exit 0, no output
tsx --test tests/*.test.ts       → # tests 112   # pass 112   # fail 0
tsx scripts/verify-financials.mjs→ checks: 26    failures: 0
```

> ⚠️ `verify-financials` ends with *"Ledger verification is still outstanding."*
> That is section 8 reporting a **SKIP**, not a pass. Gross / Net / Contribution
> Margin are ledger-derived and there is no ledger yet. Do not quote this script
> as fully green.

---

## 2. The 8-minute guided tour

Click these in order. Each one demonstrates a rule the specification makes
mandatory, and each is covered by a test.

### ① `/products/turnitin` — the compliance gate

Turnitin is in the catalogue **but cannot be bought**. No legitimate individual
licence channel exists, so:

- the availability badge reads *Not available*,
- the buy button is **disabled** and labelled *Not available for purchase*,
- the reason is shown (*No individual licence channel*),
- checkout refuses the line even if you hand-craft the URL,
- and it is still returned by `/search?q=turnitin`.

That last point is deliberate. Hiding it would be less honest than labelling it:
a student searching for Turnitin should learn *why* nobody can sell it to them.

**Test:** `tests/compliance.test.ts` → *"the Turnitin rule (mandatory test #4)"*

### ② `/products/claude-pro` — CTA and price cannot disagree

Pick different plans in the right-hand card. The button label, the total above
it, and the hidden SKU field are all derived from the **same selected-plan state
in the same render**. There is no second price display that could drift out of
sync.

Also note the **offering-type badge** on every card and page — a personal plan,
a gift voucher, an institutional licence and an education referral are visually
distinct everywhere, because they are different kinds of transaction.

**Rule:** spec §9.2.2 — the purchase CTA is always synchronized to the selected
plan and price.

### ③ `/checkout?sku=CLAUDE-PRO-1M` — honest refusal

A real, correctly-computed total in Taka… and **no pay button**.

With no gateway credential configured the page renders *"Payment not connected"*
and names the exact environment variables that would enable it. The API agrees:

```bash
curl -s -X POST localhost:3000/api/v1/checkout/sessions \
  -H 'Content-Type: application/json' -d '{"sku":["CLAUDE-PRO-1M"]}'
# → 501 {"code":"PAYMENTS_NOT_CONFIGURED", ... "refuses to return a fake session"}
```

Prices are re-derived **server-side from the SKU**. The browser never sends an
amount, so it cannot send a cheaper one.

**Rule:** FINAL RULES — never use fake payment confirmations. `docs/adr/ADR-0014`.

### ④ `/services/thesis-formatting` — the integrity boundary

Permitted scope and prohibited scope are shown **side by side**, in green and
red. The request form requires an acknowledgement checkbox before it will
submit. Try it:

- Submit without ticking → `422`, field error.
- Write *"please write my thesis for me and make it beat Turnitin"* → accepted
  with `201`, but the outcome is **`REVIEW_REQUIRED`**, not `QUOTE_PENDING`, and
  it appears in the integrity-review queue on `/admin`.
- Write *"format my thesis to the department template with APA 7 references"* →
  `201`, **`QUOTE_PENDING`**.

```bash
curl -s -X POST localhost:3000/api/v1/service-requests \
  -H 'Content-Type: application/json' \
  -d '{"serviceSlug":"thesis-formatting","name":"Test User",
       "email":"t@student.cu.ac.bd",
       "brief":"Please write my thesis for me and make sure it can beat Turnitin.",
       "integrityAcknowledged":true}'
# → 201 {"reference":"SR-...","outcome":"REVIEW_REQUIRED", ...}
```

The screen is tuned in **both** directions — 12 phrases that must fire, 10
legitimate requests that must not. Both directions are tested, because a screen
that fires on everything gets ignored by staff.

**Test:** `tests/service-request.test.ts` (43 tests)

### ⑤ `/pricing` — no price is hardcoded

Every figure in that table is read from the catalogue at render time, including
the *effective monthly* column, which normalises a 30-day plan against a 365-day
plan so the comparison is honest.

Notice that JetBrains shows an **Education** and an **Individual** row at the
same duration for very different prices. That is why the monthly-rate comparison
is scoped *per audience* — a bug `verify-financials` caught, described in
§4 below.

**Rule:** spec §6 rule 1 — never hardcode business prices in the frontend.

### ⑥ `/explore` — filters live in the URL

Category, vertical, offering type, student-only, availability, sort and page are
all query params: `/explore?student=1&sort=price-asc`. Results are shareable,
indexable, and **work with JavaScript disabled** (the sort `<select>` has a
`<noscript>` Apply button). The mobile filter rail is a `<details>` element for
the same reason.

### ⑦ `/admin` — capability honesty

Three things worth reading:

- **Integration status** — six cards showing exactly what is and is not
  connected, and whether each is required for launch wave 1.
- **Compliance table** — the §11.2 gate verdict for all 12 listings, with the
  reason for each block. Supplier cost and authorization documents are
  **deliberately absent**: they are scope-restricted and never appear in a public
  payload.
- **Service-request queues** — live reads from the store. Submit a request in
  step ④ and refresh; it appears here.

No mutation is offered anywhere, because nothing can be persisted yet.

### ⑧ `/api/v1/health` — degraded, not fake-ok

```bash
curl -s localhost:3000/api/v1/health
# → 503 {"status":"degraded","missingRequired":[database, payments, queue, email]}
```

A **503** is the correct answer. The container healthcheck treats 200 *and* 503
as "alive" so a local stack still starts; the load balancer should treat only
200 as "ready". That distinction is the difference between *the process is up*
and *it may take orders*. `docs/SETUP.md` §3.4.

### Also try

- **Theme toggle** (top right) — dark is default; the choice applies *before
  first paint*, so no flash. Separate token sets, not inverted colors.
- **Mobile menu** — a real focus trap: Tab cycles inside the drawer, Escape
  closes it and returns focus to the hamburger button.
- `/bundles/thesis-completion` — the four-step discount ladder explained where
  it applies.
- `/legal/services-policy` — the full academic-integrity policy.
- `/definitely-not-a-page` — the 404 offers search, the catalogue and categories
  instead of being a dead end.

---

## 3. What is real vs. what is not

The build states its own gaps. A fake feature is worse than a missing one.

| | State | Evidence |
|---|---|---|
| Storefront — 23 URLs | ✅ **Real** | 28/28 smoke-tested 200, 404 route works |
| Pricing, discount ladder, VAT | ✅ **Real** | 26 checks in `verify-financials`, integer poisha throughout |
| Compliance gate (§11.2) | ✅ **Real** | Blocks Turnitin, expired evidence, no-plan, unpublished |
| Service-request intake + integrity screen | ✅ **Real, persisted** | JSONL store; visible on `/admin` |
| Health / capability reporting | ✅ **Real** | Returns 503 degraded, not a fake 200 |
| 5 legal documents | ✅ **Real text** | Flagged as pre-counsel-review on every page |
| SEO — sitemap, robots, JSON-LD | ✅ **Real** | 42 sitemap URLs built from the repository |
| Design system, dark mode, a11y | ✅ **Real** | Zero hex literals in components; focus trap; skip link |
| Checkout payment | ⚠️ **Refuses** | 501 + notice, no pay button |
| Customer dashboard | ⚠️ **Shell** | Shows live data it has; states what it lacks |
| Admin console | ⚠️ **Read-only** | No mutations offered |
| Auth / sessions / RBAC / TOTP | ❌ Phase 3 | — |
| Orders / ledger / invoices | ❌ Phase 4 | — |
| Fulfilment workers / code vault | ❌ Phase 5 | — |
| Logo asset | ❌ Blocked | D15 brand clearance gate |

`DEMO_MODE=true` puts a persistent ribbon on every page saying so.

---

## 4. Bugs this build caught in itself

Worth reading, because two were found by a *check* rather than by a person —
which is the argument for having the check.

1. **`verify-financials` found a data-model gap.** It asserted *"a longer plan is
   never priced higher per month"* and **failed on JetBrains**: Education
   12-month at ৳54,204/mo versus Individual 12-month at ৳204,307/mo. The
   invariant was right; the **model** was wrong — `ProductPlan` had no way to
   express *who* a price is for. Fixed by adding an optional `audience` field
   (`STANDARD|STUDENT|EDUCATION|TEAM|ENTERPRISE`), tagging three fixture plans,
   and re-scoping the check per audience. A follow-up scan found the same issue
   on Notion and GitHub Copilot (a ৳0 education referral beside a paid plan).
   Also added: *a zero-price plan may only exist as an education referral.*

2. **Mandatory test #4 was documented but not implemented.** The spec requires
   expired authorization evidence to make a listing unpurchasable, but
   `AUTHORIZATION_STATUSES` had **no expired state** and the gate had no branch
   for it. Added `EXPIRED_EVIDENCE`, the `EVIDENCE_EXPIRED` gate reason, and two
   tests.

3. **`applyDiscounts` misreported the price floor.** `floorApplied` was derived
   from `running === floorPoisha`, so a discount *clipped* by the floor went
   unreported unless the total happened to land exactly on it — a silent
   financial discrepancy. Rewritten to track clipping per step.

4. **`formatBDT` could show poisha on a whole-taka price**, and
   `roundingMode: "halfUp"` **crashed on Node 20** (`RangeError` — that ICU
   option postdates it). Fixed to 0 fraction digits using the default
   `halfExpand`, which is half-away-from-zero.

5. **A non-existent method shipped in `repository.ts`** (`a.sortOrderSafe()`)
   plus a bogus `declare module` augmentation. Caught by the first strict
   typecheck.

6. **The Docker healthcheck would have made the container permanently
   unhealthy** — it tested `response.ok`, and the endpoint correctly returns 503
   while integrations are missing. Split into liveness vs. readiness.

7. **Docker build-context paths were wrong** (`COPY marketplace/...` while the
   compose context is the repo root), and a `COPY /app/public` line referenced a
   directory that does not exist — blocked by the D15 logo gate.

Full list of ten in `DEVELOPMENT_LOG.md` → *"Defects found and fixed"*.

---

## 5. ⚠️ The brand name is not cleared

`{{BRAND_NAME}}` is still a placeholder. The app renders a **provisional** name
with a visible warning in the footer and navbar until the D15 gate closes.

Two candidate names are already dead:

| Name | Finding |
|---|---|
| **Scholarix** | Rejected by the client (2026-11-03). Retired. |
| **Nexora** | **Conflict, found 2026-11-04.** US Reg. #7833669 (Class 014, Live/Registered 17 Jun 2025). Separately, **DCC Technology** — parent of Almo Pro AV, formerly Exertis — rebranded its entire group to **Nexora** on 2 Dec 2025: 27 specialist technology distribution businesses, ~2,500 staff, global. Direct sector overlap with technology resale. **Do not use.** |

### To close the gate

1. Propose 3–5 candidates.
2. Search each in **WIPO Global Brand DB**, **USPTO TESS**, and **DPDTM
   Bangladesh** — Classes 9, 35, 41, 42.
3. Check `.com` / `.com.bd` domain plus social handles.
4. Record results in the evidence log at `apps/web/src/lib/brand.ts` (it already
   contains the Nexora finding) and in a new `docs/adr/ADR-0013-brand-name.md`.
5. Set `BRAND_NAME` and `BRAND_CLEARED=true` in `.env`.
6. **Only then** commission the logo (Concept A, spec §3.2) and register the
   domain.

Renaming is a **one-file change**: `apps/web/src/lib/brand.ts` reads
`BRAND_NAME`, and no component hardcodes the name. Verified — grep for a name
string in `src/components` returns nothing.

Until step 6: **no spend on a logo, a domain, or marketing.**

---

## 6. Configuration

```bash
cd marketplace
cp .env.example .env
```

The variables that actually change behaviour in Phase 1:

| Variable | Default | Effect |
|---|---|---|
| `BRAND_NAME` | `{{BRAND_NAME}}` → falls back | The name. One place only. |
| `BRAND_CLEARED` | `false` | `true` removes the provisional-name warning. **Keep false.** |
| `DEMO_MODE` | `true` | Persistent DEMO DATA ribbon. |
| `DATA_ADAPTER` | `static` | `static` = fixtures. `prisma` = PostgreSQL (Phase 2). |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonicals, sitemap, JSON-LD. |
| `NEXT_PUBLIC_ROBOTS_INDEX` | `false` | **Keep `false` on staging.** |
| `VAT_RATE_BP` | `0` | Basis points. **0 until D5 is decided by counsel.** |
| `STUDENT_DISCOUNT_BP` | `1000` | Inert without `STUDENT_VERIFICATION_PROVIDER`. |
| `SSLCOMMERZ_*` / `BKASH_*` / `NAGAD_*` | empty | A **complete** group enables checkout. |

Capability flags are **derived from credential presence**, not from a boolean you
can flip — so a partial gateway configuration leaves checkout refusing. That is
the correct failure mode: a half-configured gateway fails *after* a customer has
paid.

Full reference: `.env.example` (every variable commented) and `docs/SETUP.md` §4.

---

## 7. Docker (optional in Phase 1, required from Phase 2)

```bash
cd marketplace
cp .env.example .env                       # set AUTH_SECRET: openssl rand -base64 32
docker compose up -d postgres redis
docker compose --profile dev up -d mailpit # local SMTP sink, UI on :8025
docker compose up -d --build web
```

The image build runs **`typecheck` → `test` → `verify-financials` → `next build`**,
so a commit that fails its tests cannot produce a deployable artefact. Multi-stage,
standalone output (~60 MB instead of ~400 MB), non-root (uid 1001),
`no-new-privileges`, Postgres and Redis bound to loopback only.

Note: the Prisma schema is **validated but not wired**. `prisma validate` passes
(46 models, 26 enums); no client is generated and no migration has run. That is
Phase 2.

---

## 8. Where things live

| I want to… | File |
|---|---|
| Change the brand name | `apps/web/src/lib/brand.ts` |
| Change a price / add a product | `apps/web/src/data/fixtures.ts` |
| Change the design tokens | `apps/web/src/app/globals.css` |
| Understand the compliance gate | `apps/web/src/lib/repository.ts` → `evaluatePurchaseGate` |
| Understand money / discounts | `apps/web/src/lib/money.ts` |
| Understand cart pricing | `apps/web/src/lib/checkout.ts` → `priceCart` |
| Change the integrity screen | `apps/web/src/lib/service-request.ts` |
| Edit a legal document | `apps/web/src/data/legal.ts` |
| Add an icon | `apps/web/src/components/ui/icon.tsx` |
| See the database design | `packages/database/prisma/schema.prisma` |
| Understand why no fake payment | `docs/adr/ADR-0014-no-fake-payment-confirmation.md` |
| Understand the fixture adapter | `docs/adr/ADR-0013-fixture-adapter-behind-repository-seam.md` |
| Read the phase report | `DEVELOPMENT_LOG.md` |
| Read the whole specification | `../ai-marketplace-spec/MASTER_DEVELOPMENT_PROMPT.md` |

**The seam rule:** every page imports catalogue data from `lib/repository.ts` and
nothing else. Verified — `grep -rn "data/fixtures" src/app src/components`
returns no matches. That is what makes Phase 2 a bounded task instead of a
rewrite.

---

## 9. What to do next

Ordered so each step is independently verifiable:

1. **Close D15** (non-engineering, can run in parallel). Nothing else blocks
   launch-wave-1 *code*; this blocks launch-wave-1 *branding*.
2. **`docker compose up -d postgres`**, generate the Prisma client, run the first
   migration from the validated schema.
3. **Implement `repository-prisma.ts`** against the existing seam. Keep
   `evaluatePurchaseGate` / `availabilityOf` / `isPurchasable` **pure functions**
   — they are business rules, not queries, and moving them into SQL would scatter
   the most important rule in the system.
4. **Re-run `npm run check`.** All 112 tests and 26 financial checks must pass
   against real rows. Section 7 of `verify-financials` (category counts vs.
   purchasable listings) is the check most likely to catch a naive `WHERE` clause.
5. **Auth.js v5** with the seven mandatory settings from spec §17.6 — DB-session
   strategy (**not** JWT), Argon2id `m=64MB,t=3,p=4`, TOTP for Super Admin and
   Finance, HttpOnly/Secure/SameSite=Lax cookies, 24h customer / 8h admin idle,
   30-day absolute.
6. **Then** cart → checkout → gateway → webhook verification → fulfilment, in
   that order. Do not start the gateway before the webhook idempotency design is
   in place (§6 rule 5).

Full Phase 2 plan in `DEVELOPMENT_LOG.md` → *"Next-phase proposal"*.

---

## 10. Non-negotiables

Carried verbatim, because these are the rules most likely to be quietly dropped
under deadline pressure:

- Never claim a feature is complete without testing it.
- Never use fake payment confirmations.
- Never hardcode business prices.
- Never distribute unauthorized subscriptions.
- Never expose customer data or secrets.
- Never make unreviewed production changes.
- Never collect or store a card number, PIN or OTP.
- Never sell stolen, shared or unauthorized accounts.
- Never fabricate urgency, stock levels or reviews.
- Never ghost-write assessed work, or help anyone evade plagiarism detection.

---

## Troubleshooting, short form

| Symptom | Fix |
|---|---|
| `npx tsc` installs a junk package | Use `npm run typecheck` or `./node_modules/.bin/tsc`. **Never `npx tsc`.** |
| `Could not find '.../tests/*.test.ts'` | Use `npm run test` — the glob must be unquoted for the shell. |
| `bad option: --experimental-strip-types` | Node 20 lacks it. `tsx` is a devDependency for exactly this reason. |
| `RangeError: Value halfUp out of range` | Don't add `roundingMode` to `Intl.NumberFormat`; Node 20's ICU predates it. |
| Dev server OOM-killed | `NODE_OPTIONS=--max-old-space-size=1024 npm run dev` |
| `/api/v1/health` returns 503 | **Expected in Phase 1.** Read `missingRequired` in the body. |
| Fonts missing in a sandboxed preview | The preview iframe has no network. The real site self-hosts fonts. |
| `prisma validate` → `P1012 DATABASE_URL not found` | Prefix it: `DATABASE_URL=postgresql://u:p@localhost:5432/db npx prisma validate --schema packages/database/prisma/schema.prisma` |
| Service request → 429 | In-process limiter, 5/min per IP. Wait a minute. |

Twelve more, with causes: `docs/SETUP.md` §7.

---

*Phase 1 of 10. Specification: `ai-marketplace-spec/MASTER_DEVELOPMENT_PROMPT.md` v4.0.*
