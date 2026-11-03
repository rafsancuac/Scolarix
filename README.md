# {{BRAND_NAME}} — Premium AI & Academic Subscription Marketplace

> **Think Smarter. Achieve More.**
>
> Bangladesh-first marketplace for authorized AI, academic, productivity and
> developer subscriptions, plus original academic support services. Priced in
> BDT, paid with bKash / Nagad / Rocket / SSLCommerz.

| | |
|---|---|
| **Spec (source of truth)** | `../ai-marketplace-spec/MASTER_DEVELOPMENT_PROMPT.md` v4.0 |
| **Phase** | 1 — Storefront foundation (of 10) |
| **Stack** | Next.js 16.4.5 · React 19.3.1 · TypeScript 5.9.3 · Tailwind CSS 4.3.4 |
| **Database target** | PostgreSQL 17 + Prisma 6 (`packages/database/prisma/schema.prisma`, validated) |
| **Deployment** | Portable Docker Compose — no vendor-specific runtime APIs |
| **Money** | Integer BDT poisha everywhere. No float, no `Decimal` |
| **Tests** | 112 passing · `verify-financials` 26 checks passing |

---

## 1. Read this first

### 1.1 The brand name is NOT cleared

`{{BRAND_NAME}}` is still a placeholder in the spec, and the app renders a
**provisional** name with a visible warning until the D15 clearance gate closes.

Two names are already dead:

| Name | Status |
|---|---|
| **Scholarix** | Rejected by the client (2026-11-03). Retired. |
| **Nexora** | **Conflict found 2026-11-04.** US Reg. #7833669 (Class 014, live) *and* DCC Technology rebranded its entire group — 27 technology distribution businesses, ~2,500 staff — to **Nexora** on 2 Dec 2025. Direct sector overlap. Do not use. |

The evidence log lives in `apps/web/src/lib/brand.ts`. To finish the gate:

1. Propose 3–5 candidates.
2. Search each in **WIPO Global Brand DB**, **USPTO TESS**, and **DPDTM Bangladesh** (Class 9, 35, 41, 42).
3. Check `.com` / `.com.bd` domain and social-handle availability.
4. Record results in `brand.ts`'s evidence log and in `docs/adr/ADR-0013-brand-name.md`.
5. Set `BRAND_NAME` + `BRAND_CLEARED=true` in `.env`, then commission the logo (Concept A, spec §3.2).

Until step 5, **do not spend money on a logo, a domain, or marketing.**

### 1.2 What is real and what is not

This build is honest about its own gaps — a fake feature is worse than a
missing one. Everything below is enforced by the code, not just documented.

| Capability | State | Where it shows up |
|---|---|---|
| Storefront, catalogue, detail pages | ✅ **Real** — 23 routes, all 200 | `/`, `/explore`, `/products/*`, `/services/*`, `/bundles/*`, `/categories/*` |
| Pricing, discount ladder, VAT | ✅ **Real** — integer poisha, 26 verified checks | `/pricing`, `/checkout`, `scripts/verify-financials.mjs` |
| Compliance gate (§11.2) | ✅ **Real** — blocks Turnitin and expired evidence | `lib/repository.ts#evaluatePurchaseGate` |
| Service-request intake | ✅ **Real** — validated, screened, persisted | `POST /api/v1/service-requests` |
| Academic-integrity screen (§12.6) | ✅ **Real** — routes matches to review | `lib/service-request.ts` |
| Health / capability reporting | ✅ **Real** — returns `503 degraded`, not a fake `200` | `GET /api/v1/health` |
| Legal documents | ✅ **Real text**, flagged as pre-counsel-review | `/legal/*` |
| Checkout payment | ⚠️ **Refuses** — `501`, no pay button without credentials | `/checkout` |
| Customer dashboard | ⚠️ **Shell** — states what's missing, shows live data it does have | `/dashboard` |
| Admin console | ⚠️ **Read-only** — no mutations offered without an identity layer | `/admin` |
| Auth / sessions / RBAC | ❌ **Not built** (Phase 3) | — |
| Orders, ledger, fulfilment workers | ❌ **Not built** (Phases 2–4) | — |

`DEMO_MODE=true` puts a persistent ribbon on every page saying so.

---

## 2. Quick start

### 2.1 Prerequisites

- **Node.js ≥ 20.9** (developed on 20.20.2). No pnpm or yarn — **npm only**.
- **Docker + Docker Compose** for PostgreSQL/Redis. *Optional in Phase 1*: the
  app runs on the seeded fixture adapter without them.
- ~1 GB free RAM for the dev server, ~400 MB for `node_modules`.

### 2.2 Run it (no Docker needed)

```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3000
```

That is the whole of Phase 1. The catalogue is the seeded fixture data behind a
repository seam, so every page renders real content with no database.

### 2.3 Run the full stack (Docker)

```bash
cp .env.example .env          # then edit: AUTH_SECRET, DATABASE_URL, etc.
docker compose up -d postgres redis
docker compose --profile dev up -d mailpit   # local SMTP sink on :8025
docker compose up -d web                     # builds the image, runs tests inside
```

Health: <http://localhost:3000/api/v1/health>
Mailpit: <http://localhost:8025>

> `docker compose up` builds the image, and the image build runs
> `typecheck`, `test` and `verify-financials` **before** `next build`. A commit
> that fails its tests cannot produce a deployable artefact.

### 2.4 Scripts

```bash
cd apps/web

npm run dev                 # dev server on 0.0.0.0:3000
npm run build               # production build
npm run start               # serve the production build
npm run typecheck           # tsc --noEmit (strict + noUncheckedIndexedAccess)
npm run test                # 112 tests via node:test + tsx
npm run test:watch          # watch mode
npm run verify-financials   # 26 money/catalogue invariant checks
npm run check               # typecheck && test && verify-financials
```

---

## 3. What to look at, in order

If you only click six things, click these — each one demonstrates a rule the
spec makes mandatory.

| # | URL | What it proves |
|---|---|---|
| 1 | `/products/turnitin` | **The compliance gate.** Visible for information, CTA disabled, checkout refuses it. No legitimate individual licence channel exists, so it is never sold. |
| 2 | `/products/claude-pro` | **CTA/price synchronization.** The buy button label and the amount above it are derived from the *same* selected-plan state in the same render — they cannot disagree. |
| 3 | `/checkout?sku=CLAUDE-PRO-1M` | **Server-side pricing + honest refusal.** Prices re-derived from the catalogue, discount ladder itemised, and — with no gateway credential — an explicit "Payment not connected" notice instead of a fake pay button. |
| 4 | `/services/thesis-formatting` | **§12.6 integrity boundary.** Permitted/prohibited scope side by side, mandatory declaration checkbox, prohibited-keyword screening before quotation. |
| 5 | `/pricing` | **No hardcoded prices.** Every figure in that table is read from the catalogue at render time, with effective monthly rate normalised per audience. |
| 6 | `/admin` | **Capability honesty.** Integration matrix, compliance verdict per listing, and the live service-request review queue — with no mutation offered because nothing can be persisted yet. |

Also worth a look:

- `/explore?student=1` — filters are URL query params, so results are shareable and work with JS disabled.
- `/bundles/thesis-completion` — the four-step discount ladder explained where it applies.
- `/legal/services-policy` — the academic-integrity policy in full.
- `/search?q=turnitin` — search returns the blocked listing rather than hiding it.

Try the **theme toggle** (top right) — dark is default, and the choice is
applied before first paint so there is no flash.

---

## 4. Repository layout

```
marketplace/
├── README.md                       ← this file
├── DEVELOPMENT_LOG.md              ← mandatory running log (§27)
├── docker-compose.yml              ← postgres + redis + web + worker + mailpit
├── .env.example                    ← Appendix A template, every variable documented
├── .gitignore
├── docs/
│   ├── SETUP.md                    ← detailed setup, troubleshooting, deployment
│   └── adr/
│       ├── ADR-0013-fixture-adapter-behind-repository-seam.md
│       └── ADR-0014-no-fake-payment-confirmation.md
├── packages/
│   └── database/
│       └── prisma/schema.prisma    ← 46 models, 26 enums — VALIDATED
├── workers/                        ← Phase 3: fulfilment + reminder workers
└── apps/
    └── web/
        ├── Dockerfile              ← multi-stage, standalone, non-root
        ├── package.json
        ├── tsconfig.json           ← strict, noUncheckedIndexedAccess, @/* → src/*
        ├── next.config.ts          ← security headers, optional standalone output
        ├── postcss.config.mjs      ← Tailwind v4 PostCSS plugin
        ├── scripts/
        │   └── verify-financials.mjs   ← §6 rule 10, 26 checks
        ├── tests/
        │   ├── money.test.ts           ← 26 tests
        │   ├── compliance.test.ts      ← 26 tests
        │   ├── checkout.test.ts        ← 16 tests
        │   └── service-request.test.ts ← 43 tests (+ 1 nested)
        └── src/
            ├── app/
            │   ├── layout.tsx          ← fonts, theme script, nav, footer
            │   ├── globals.css         ← design tokens (§7) — semantic only
            │   ├── page.tsx            ← homepage (§9.1.1)
            │   ├── explore/            ← marketplace + filters (§9.2.1)
            │   ├── products/[slug]/    ← product detail (§9.2.2)
            │   ├── services/           ← index + [slug] (§9.2.4)
            │   ├── bundles/            ← index + [slug] (§9.2.5)
            │   ├── categories/[slug]/
            │   ├── students/           ← Student Zone (§13.12)
            │   ├── pricing/            ← comparison table
            │   ├── search/             ← §13.16
            │   ├── checkout/           ← §13.4–§13.8
            │   ├── dashboard/          ← §9.3 (shell — see §1.2)
            │   ├── admin/              ← §9.4 (read-only — see §1.2)
            │   ├── support/
            │   ├── legal/              ← index + [slug], 5 documents
            │   ├── api/v1/
            │   │   ├── health/route.ts
            │   │   ├── service-requests/route.ts
            │   │   └── checkout/sessions/route.ts
            │   ├── sitemap.ts  robots.ts  not-found.tsx  error.tsx  loading.tsx
            ├── components/
            │   ├── ui/                 ← Icon (inline SVG), Badge, Button, LogoTile, ThemeToggle
            │   ├── layout/             ← Navbar, Footer, AnnouncementBar, DemoModeRibbon
            │   ├── home/               ← Hero + section components
            │   └── marketplace/        ← ProductCard, ServiceCard, PlanPicker, ServiceRequestForm
            ├── lib/
            │   ├── types.ts            ← enums + domain interfaces
            │   ├── money.ts            ← integer poisha, discount ladder, VAT
            │   ├── format.ts           ← one date/time boundary (§6 rule 12)
            │   ├── checkout.ts         ← priceCart() + capability flags
            │   ├── repository.ts       ← DATA SEAM + compliance gate
            │   ├── service-request.ts  ← validation + §12.6 screen
            │   ├── request-store.ts    ← JSONL adapter (swap for Prisma)
            │   ├── brand.ts            ← D15 evidence log
            │   └── metadata.ts         ← SEO + JSON-LD
            └── data/
                ├── fixtures.ts         ← 12 products, 6 services, 4 bundles, 6 categories
                └── legal.ts            ← 5 policy documents
```

---

## 5. The four rules this codebase is organised around

### 5.1 No price is ever hardcoded in a template (§6 rule 1)

Every figure a visitor sees is read from `lib/repository.ts` at render time.
`scripts/verify-financials.mjs` recomputes each one independently and asserts
equality **to the poisha**. If a price were baked into JSX, the check that
compares `fromPricePoisha` against the cheapest active plan would fail.

Money is an **integer count of poisha** (1 BDT = 100 poisha) from end to end.
`assertPoisha()` throws on a float, a NaN, or a negative — so a fractional
amount cannot enter the domain silently.

### 5.2 The compliance gate is the only thing that decides purchasability (§11.2)

```ts
evaluatePurchaseGate(product): GateFailure | null
```

It refuses a listing when it is unpublished, when authorization evidence is
missing **or expired**, when no individual licence channel exists, or when there
is no active plan. The gate is re-run:

- when the catalogue is listed,
- on the product detail page (the verdict is passed to the client read-only),
- on every cart load and at checkout,
- inside `POST /api/v1/checkout/sessions`,
- and in production, again inside the create-order transaction.

The client picker receives the verdict. **It cannot override it.**

### 5.3 Nothing pretends to work (§28.5, FINAL RULES)

- No pay button without a gateway credential — `/checkout` shows a notice.
- `POST /api/v1/checkout/sessions` returns **501**, never a fabricated session.
- `GET /api/v1/health` returns **503 `degraded`** while a required integration
  is missing, and lists exactly which ones.
- `/dashboard` and `/admin` render their real specification and state what is
  not connected, rather than inventing subscriptions and revenue.
- Testimonials render **only** when the repository returns verified entries. The
  fixture list is empty, so the homepage section is absent — not filled with
  made-up quotes.
- No countdown timers, no fake stock counters, no invented review counts.

### 5.4 Academic integrity is a hard boundary, not a guideline (§12.6)

Every service page shows the permitted and prohibited scope side by side. The
request form requires an acknowledgement, and the API:

- rejects a submission without it (`422`),
- rejects a truthy non-boolean (`"yes"` does not satisfy a `true`),
- screens the brief against four prohibited-scope rule families
  (ghost-writing, assessment completion, plagiarism evasion, fabrication),
- routes a match to `REVIEW_REQUIRED` instead of `QUOTE_PENDING`,
- and stores the acknowledgement with a UTC timestamp and the caller's IP.

The screen is tuned in both directions: it fires on *"write my thesis"* and
*"beat Turnitin"*, and stays silent on *"proofread my own draft"*, *"interpret
my SPSS output"* and *"how do I avoid accidental plagiarism by citing properly"*.
Both directions are tested.

---

## 6. Configuration

Copy `.env.example` to `.env`. The important ones:

| Variable | Default | Effect |
|---|---|---|
| `DATA_ADAPTER` | `static` | `static` = seeded fixtures. `prisma` = PostgreSQL. |
| `DEMO_MODE` | `true` | Persistent "DEMO DATA" ribbon; sample figures labelled. |
| `BRAND_NAME` | `Scholarix` | One place only. Rename = edit this. |
| `BRAND_CLEARED` | `false` | `false` shows the provisional-name warning. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URLs, sitemap, JSON-LD. |
| `NEXT_PUBLIC_ROBOTS_INDEX` | — | Set `false` on staging to block indexing. |
| `VAT_RATE_BP` | `0` | VAT in basis points. **0 until D5 is decided.** |
| `STUDENT_DISCOUNT_BP` | — | Student step, basis points. Inert without a verification provider. |
| `SSLCOMMERZ_*` / `BKASH_*` / `NAGAD_*` | — | Presence of a complete set enables checkout. |
| `DATABASE_URL` / `REDIS_URL` | — | Required for Phase 2+. |
| `FEATURE_I18N_BN` | `false` | Bangla is ready but off (D16). |

**Capability flags are derived from credential presence, not from a boolean you
can flip.** `PAYMENT_CONNECTED` is true only when a *complete* gateway credential
set exists — so the UI can never render a control that silently does nothing.

---

## 7. Phase status

| Phase | Scope | Status |
|---|---|---|
| **0** | Spec v4.0, ADRs, brand gate, coordination protocol | ✅ Done |
| **0.5** | Clickable homepage + dashboard before engineering | ✅ Superseded — the real site was built instead, at the client's instruction |
| **1** | Storefront foundation: tokens, catalogue, detail pages, gate, pricing, checkout pricing, legal, search, SEO, service intake | ✅ **This build** |
| **2** | PostgreSQL + Prisma, repository adapter swap, CMS, catalogue admin | ⬜ Next |
| **3** | Auth.js v5 (DB sessions, Argon2id, RBAC, TOTP), customer dashboard | ⬜ |
| **4** | Cart, checkout, gateway integration, webhook verification, orders, invoices | ⬜ |
| **5** | Code-vault fulfilment, BullMQ workers, delivery, reminders | ⬜ |
| **6** | Service lifecycle: quotes, milestones, revisions, secure file exchange | ⬜ |
| **7** | Support centre, tickets, SLA timers, CSAT | ⬜ |
| **8** | Analytics, ledger, `verify-financials` in ledger mode, admin reporting | ⬜ |
| **9** | Hardening: rate limiting, CSP nonces, ASVS L2 pass, load testing | ⬜ |
| **10** | Launch wave 1: backups, observability, legal sign-off, go-live | ⬜ |

Full detail in `DEVELOPMENT_LOG.md` and spec §23.

---

## 8. Known limitations

Be blunt about these; they are deliberate, not oversights.

1. **No database.** `DATA_ADAPTER=static` serves seeded fixtures. Nothing you
   buy — nothing can be bought — is persisted. Service requests *are* persisted,
   to `apps/web/.data/service-requests.jsonl` (gitignored) through an
   append-only writer that tolerates a torn final line.
2. **No authentication.** There is no signed-in user, so `/dashboard` and
   `/admin` cannot show personal data. They say so.
3. **No payment.** Checkout computes a real total and then stops. `501`, not a
   fake success.
4. **`verify-financials` section 8 is a SKIP, not a pass.** Gross / Net /
   Contribution Margin are ledger-derived; with no ledger there is nothing to
   recompute. The script prints this loudly and says "this is not a pass".
5. **In-process rate limiting.** `service-requests` limits 5/min per IP in a
   `Map`. Production needs a Redis sliding window; it will not survive a restart
   or scale across replicas.
6. **The Prisma schema is written but not wired.** It validates with
   `prisma validate`; no client is generated and no migration has run.
7. **No logo asset.** Blocked by the D15 gate. Monogram tiles stand in.
8. **Fonts come from `next/font/google`.** They are fetched at *build* time and
   self-hosted, so runtime has no third-party font request — but the build needs
   network access.
9. **Product logo placeholders.** Provider marks are third-party trademarks and
   per-product logo-usage review (§11.6) has not been done, so generated
   monogram tiles are used instead of real logos.
10. **English only.** Bangla typography (Hind Siliguri) is loaded and the token
    exists, but `FEATURE_I18N_BN=false` and there is no Bangla content (D16).

---

## 9. Where to go next

**Recommended order**, smallest unblocking step first:

1. **Close D15.** Pick and clear the brand name (§1.1). Everything else in
   launch wave 1 can proceed in parallel, but no logo, domain or marketing spend
   should happen before this.
2. **Stand up PostgreSQL.** `docker compose up -d postgres redis`, then generate
   the Prisma client and run the first migration from the validated schema.
3. **Swap the repository adapter.** Implement `lib/repository.ts` against
   Prisma behind the same exported signatures. No page changes. Then flip
   `DATA_ADAPTER=prisma` and re-run `verify-financials` — the catalogue checks
   must still pass against real rows.
4. **Auth.js v5** with the seven mandatory settings from spec §17.6 — DB-session
   strategy (not JWT), Argon2id `m=64MB,t=3,p=4`, TOTP for Super Admin and
   Finance, HttpOnly/Secure/SameSite=Lax cookies, 24h/8h idle, 30d absolute.
5. **Then** cart → checkout → gateway → webhook verification → fulfilment,
   in that order. Do not start the gateway before the webhook idempotency key
   design is in place.

Every phase must end with the report the spec requires: changed files,
implemented functionality, tests executed, test results, known issues, remaining
tasks, next-phase proposal. `DEVELOPMENT_LOG.md` is where those go.

---

## 10. Non-negotiables

Carried verbatim from the master spec, because they are the rules most likely to
be quietly dropped under deadline pressure:

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

*Generated 2026-11-04. See `DEVELOPMENT_LOG.md` for the running record and
`../ai-marketplace-spec/` for the full specification.*
