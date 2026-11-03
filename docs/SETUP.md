# Setup & Deployment Guide

Detailed companion to `README.md`. Covers local development, Docker, the
adapter swap to PostgreSQL, environment configuration, deployment targets, and
troubleshooting.

---

## 1. Local development without Docker

The fastest path. Phase 1 needs no database.

```bash
cd apps/web
npm install
npm run dev
```

Open <http://localhost:3000>.

**Requirements**

| | Minimum | Developed on |
|---|---|---|
| Node.js | 20.9 | 20.20.2 |
| npm | 10 | 10.8.2 |
| RAM | 1 GB free | 1.9 GB total |
| Disk | 400 MB (`node_modules`) | — |

**Low-memory machines.** The dev server and `next build` both benefit from a cap:

```bash
NODE_OPTIONS=--max-old-space-size=1024 npm run dev
NODE_OPTIONS=--max-old-space-size=1024 npm run build
```

This was developed in a 1.9 GB / 2 CPU sandbox with the cap set, and the dev
server reached `Ready in 379ms`.

**Package manager.** npm only. There is no `pnpm-lock.yaml` or `yarn.lock`, and
mixing them will produce a dependency tree nobody has tested.

---

## 2. Verifying your checkout of the code

Run all three before changing anything, so you know the baseline was green:

```bash
cd apps/web
npm run check
```

That is `typecheck && test && verify-financials`. Expected output:

```
tsc --noEmit                                  → exit 0, no output
tsx --test tests/*.test.ts                    → # tests 112  # pass 112  # fail 0
tsx scripts/verify-financials.mjs             → checks: 26   failures: 0
```

`verify-financials` ends with two lines that are easy to misread:

```
verify-financials PASSED for the catalogue.
Ledger verification is still outstanding — see section 8.
```

Section 8 is a **SKIP**, not a pass. Gross / Net / Contribution Margin are
ledger-derived and there is no ledger yet. Do not report this script as fully
green.

---

## 3. Docker

### 3.1 Services

| Service | Image | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:17-alpine` | `127.0.0.1:5432` | Loopback only. Never expose publicly. |
| `redis` | `redis:7-alpine` | `127.0.0.1:6379` | AOF on, `noeviction` — a queue must not silently drop jobs. |
| `web` | built from `apps/web/Dockerfile` | `3000` | Next.js standalone, non-root, 1 GB limit. |
| `worker` | same image | — | Idles until the Phase 3 entrypoint exists. |
| `migrate` | same image | — | `--profile migrate`, one-shot. |
| `mailpit` | `axllent/mailpit` | `127.0.0.1:8025` | `--profile dev`. Local SMTP sink. |

### 3.2 Commands

```bash
cp .env.example .env                      # then edit — see §4
docker compose up -d postgres redis       # dependencies only
docker compose --profile dev up -d mailpit
docker compose up -d --build web          # build + run the app
docker compose logs -f web
docker compose exec web node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>r.json()).then(console.log)"
docker compose down                       # stop, keep volumes
docker compose down -v                    # stop AND destroy the database
```

### 3.3 The image build runs your tests

`apps/web/Dockerfile` stage `builder` executes:

```dockerfile
RUN npm run typecheck
RUN npm run test
RUN npm run verify-financials || echo "..."
RUN npm run build
```

A commit that fails its typecheck or tests **cannot produce an image**. That is
deliberate: it makes "never claim a feature complete without testing it"
mechanically enforceable rather than a matter of discipline.

`verify-financials` is allowed to warn rather than fail the build at this phase,
because its ledger section is an honest SKIP. Remove the `|| echo` once Phase 8
wires the ledger.

### 3.4 Healthcheck semantics

```
GET /api/v1/health
  200  { status: "ok" }        → everything required is connected
  503  { status: "degraded" }  → alive, but a required integration is missing
  5xx  (other) / unreachable   → unhealthy
```

The **container** healthcheck treats `200` and `503` as alive, so a fresh local
stack without payment credentials still starts. The **load balancer** should
treat only `200` as ready. Do not conflate the two — that distinction is the
difference between "the process is up" and "it may take orders".

The response body lists `missingRequired`, so one call tells you exactly what to
configure:

```json
{"status":"degraded","adapter":"static","demoMode":true,"brandCleared":false,
 "checks":[{"name":"catalogue","ok":true,"ms":0}],
 "missingRequired":[{"key":"database","connected":false,"required":true}, ...]}
```

### 3.5 Multi-stage build notes

- Build context is the **repo root** (`marketplace/`), not `apps/web`, so
  `packages/*` is available to the build.
- `NEXT_BUILD_OUTPUT=standalone` makes the runner stage copy a self-contained
  server (~60 MB) instead of `node_modules` (~400 MB).
- Runs as `nextjs` (uid 1001) with `no-new-privileges`.
- `openssl` is installed in the base stage because the Prisma query engine
  needs it. Remove it if you drop Prisma.
- `/app/.data` is created and chowned so the JSONL adapter can write even on a
  read-only root filesystem.

---

## 4. Environment configuration

`.env.example` is the template; every variable is commented there. The ones that
change behaviour:

### 4.1 Data

| Variable | Values | Effect |
|---|---|---|
| `DATA_ADAPTER` | `static` \| `prisma` | Which repository implementation serves the catalogue. |
| `DATABASE_URL` | postgres URI | Required when `DATA_ADAPTER=prisma`. |
| `REDIS_URL` | redis URI | Queues, rate limiting, webhook idempotency cache. |
| `DEMO_MODE` | `true` \| `false` | `true` renders the persistent DEMO DATA ribbon. |

### 4.2 Brand (D15 gate)

| Variable | Effect |
|---|---|
| `BRAND_NAME` | The single place the name is read. A value containing `{{` is ignored and falls back. |
| `BRAND_SLUG` | Used in the support email address and identifiers. |
| `BRAND_TAGLINE` | Hero headline. |
| `BRAND_MONOGRAM` | Placeholder logo tile until a commissioned mark exists. |
| `BRAND_CLEARED` | **Keep `false`** until the clearance gate closes. `true` removes the provisional-name warning from the footer and the navbar. |

### 4.3 Money

| Variable | Effect |
|---|---|
| `VAT_RATE_BP` | VAT in basis points (500 = 5%). **Defaults to 0** because D5 (VAT treatment) is unresolved. Guessing a rate on an invoice is a tax problem, not a rounding problem. |
| `STUDENT_DISCOUNT_BP` | Student step, basis points. Inert unless `STUDENT_VERIFICATION_PROVIDER` is also set. |
| `PRICE_FLOOR_POISHA` | Floor that stacked discounts cannot pass. |

### 4.4 Payments

Set a **complete** group or none of it. A partial group leaves
`PAYMENT_CONNECTED` false and checkout keeps refusing — which is the correct
behaviour, because a half-configured gateway fails at the worst possible moment.

```bash
# SSLCommerz
SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
SSLCOMMERZ_IS_SANDBOX=true

# OR bKash
BKASH_APP_KEY=... ; BKASH_APP_SECRET=... ; BKASH_USERNAME=... ; BKASH_PASSWORD=...

# OR Nagad
NAGAD_MERCHANT_ID=... ; NAGAD_PRIVATE_KEY=... ; NAGAD_PG_PUBLIC_KEY=...
```

Only licensed Bangladeshi PSPs. Bangladesh Bank MFS-PSPD circulars apply, and
handling money without a licence is not an option this codebase can configure
around.

### 4.5 SEO

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, `metadataBase`, sitemap, JSON-LD. Set it per environment. |
| `NEXT_PUBLIC_ROBOTS_INDEX` | Set `false` on staging. `robots.ts` then disallows everything. |

### 4.6 Secrets discipline

- `.env` is gitignored. `.env.example` contains **no real values**.
- `AUTH_SECRET`: `openssl rand -base64 32`.
- Never commit a gateway credential, an S3 key, or an SMTP password.
- Subagents and CI runners never receive production credentials (spec §24).

---

## 5. The adapter swap (Phase 2)

This is the first real engineering step, and it is designed to be boring.

`apps/web/src/lib/repository.ts` exports a fixed set of functions:

```ts
evaluatePurchaseGate  isPurchasable        availabilityOf
cheapestActivePlan    listProducts         listProductItems
getProductBySlug      listTrending         listBestSellers
listFeatured          listStudentEligible  listByCategory
listByVertical        listRelated          getPlanBySku
listCategories        getCategory          listVerticals
listServices          getServiceBySlug     listBundles
getBundleBySlug       listFaqs             getAnnouncement
listTestimonials      search
```

Every page and component imports from this module and **nothing else**. No page
imports `data/fixtures.ts` directly.

**To swap in Prisma:**

1. Create `src/lib/repository-prisma.ts` implementing the same signatures.
2. In `repository.ts`, branch on `process.env.DATA_ADAPTER` and re-export.
3. Keep `evaluatePurchaseGate` / `availabilityOf` / `isPurchasable` as **pure
   functions over a `Product`** — they are business rules, not queries, and
   moving them into SQL would scatter the compliance logic.
4. Re-run `npm run check`. The 112 tests and 26 financial checks must still
   pass against real rows.
5. Only then flip `DATA_ADAPTER=prisma`.

`listProductItems({ purchasableOnly: true })` must stay consistent with
`listCategories()[n].itemCount` — `verify-financials` §7 asserts exactly that,
so a naive `WHERE` clause that forgets the gate will fail the build.

**Hot-path budget:** ≤50 ms with no N+1 (§18.1). `listProductItems` currently
maps every product to its cheapest plan; in SQL that is one lateral join or one
`DISTINCT ON`, not a query per product.

The same pattern applies to `src/lib/request-store.ts`:
`recordServiceRequest` / `listServiceRequests` / `countServiceRequests` are the
seam. Swap the JSONL writer for a `service_requests` insert plus an audit entry
in the same transaction.

---

## 6. Deployment

### 6.1 Portable by construction

No vendor-specific runtime API is used anywhere: no Vercel edge config, no AWS
Lambda handler shape, no Cloudflare bindings. Storage, mail, queue and database
are all reached through adapters behind environment variables. The same image
runs on:

| Target | Notes |
|---|---|
| Single VPS + Docker Compose | Simplest. Recommended for launch wave 1. |
| Azure Container Apps | Spec's reference cloud. Use the Container Apps health-probe path `/api/v1/health` with `200` as ready. |
| Fly.io | One `fly.toml`, `release_command` for migrations, a `worker` process group. |
| Railway / Render | Compose-equivalent service graph. |
| Vercel + separate worker | Viable, but the worker needs its own host for BullMQ. |

**Host choice is D12 and is still open.** Do not let a deployment convenience
decide it — the constraint is that the fulfilment worker must be able to hold a
long-lived Redis connection and survive a restart mid-job.

### 6.2 Pre-deployment checklist

```bash
npm run check                                  # green, locally
docker compose build                           # tests run inside the image
curl -s $URL/api/v1/health | jq .status        # "ok", not "degraded"
curl -s $URL/robots.txt                        # staging must disallow /
curl -s $URL/sitemap.xml | head                # no /dashboard, /admin, /checkout
```

Then, before wave-1 traffic:

- [ ] D15 brand clearance recorded and `BRAND_CLEARED=true`
- [ ] `DEMO_MODE=false`
- [ ] `NEXT_PUBLIC_ROBOTS_INDEX=true` on production, `false` on staging
- [ ] Counsel sign-off at `docs/architecture/compliance/legal-review.md` (§20)
- [ ] `verify-financials` section 8 passing in **ledger mode**, not SKIP
- [ ] Backups: `pg_dump` scheduled and **restore-tested**
- [ ] Rate limiting moved from the in-process `Map` to Redis
- [ ] CSP nonces injected by middleware
- [ ] Sentry/OTEL receiving, alerting on the missed-run detector (§6 rule 9)
- [ ] Load test: 1,000 concurrent requests (§25.3 test #29)
- [ ] All 7 mandatory tests from §25.3 passing against the real stack

### 6.3 Migrations

```bash
docker compose run --rm migrate npx prisma migrate deploy
```

The `migrate` service currently prints a notice instead, because the Prisma
client is not wired yet. Replace its command in Phase 2.

**Schema and shared-contract changes require Coordinator approval** (spec §24).
A migration that drops or renames a column referenced by an immutable
`OrderLine` snapshot is not a routine change — it breaks the guarantee that an
old order's price never changes.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `tsc: No such file or directory`, or `npx tsc` installs a junk package named `tsc` | `node_modules` missing, or `npx` fetched the unrelated `tsc@2.0.4` package | `npm install`, then use `npm run typecheck` or `./node_modules/.bin/tsc`. **Never** `npx tsc`. |
| `Could not find '.../tests/*.test.ts'` | A quoted glob passed to `tsx --test` | Use the npm script, which leaves the glob unquoted for the shell. |
| `node: bad option: --experimental-strip-types` | Node 20 does not have that flag (it arrived in 22.6) | Keep using `tsx`; it is a devDependency for exactly this reason. |
| `RangeError: Value halfUp out of range for Intl.NumberFormat` | Node 20's ICU predates the `roundingMode` option | Already handled: `money.ts` relies on the default `halfExpand`, which is half-away-from-zero. Do not add `roundingMode` back. |
| Dev server OOM-killed | Host under ~2 GB | `NODE_OPTIONS=--max-old-space-size=1024`, and close the Turbopack HMR socket in other tabs. |
| `/api/v1/health` returns 503 | A required integration is missing | Read `missingRequired` in the body. In Phase 1 this is **expected** and correct. |
| Checkout shows "Payment not connected" | No complete gateway credential set | Set a full group (§4.4). Do not "fix" it by rendering the button anyway. |
| Fonts missing in the workspace preview | The file viewer is a sandboxed iframe with no network | Expected. The downloaded/deployed site self-hosts fonts via `next/font` and works normally. |
| `prisma validate` fails with `P1012 Environment variable not found: DATABASE_URL` | Prisma reads `env()` at validate time | `DATABASE_URL=postgresql://u:p@localhost:5432/db npx prisma validate --schema packages/database/prisma/schema.prisma` |
| Service-request submit returns 429 | In-process limiter: 5/minute per IP | Wait a minute. Production moves this to a Redis sliding window. |

---

## 8. Conventions worth knowing before you edit

- **Semantic tokens only in components.** `bg-surface-1`, `text-primary`,
  `border-line` — never a hex literal. Dark mode is a separate token set on
  `[data-theme="dark"]`, so a hardcoded color breaks one of the two themes.
  `verify` by grepping: `grep -rn '#[0-9a-fA-F]\{6\}' src/components src/app`
  should return nothing but comments.
- **Inline SVG icons.** `components/ui/icon.tsx`. No icon package, so the
  storefront ships no extra runtime JS and works in a network-less preview.
  Swap to `lucide-react` in Phase 2 by replacing that one module.
- **Tabular numerals for money.** Add the `.tnum` class to any element
  displaying an amount or a metric, so columns align.
- **One date boundary.** `formatDate()` / `formatDateTime()` in `lib/format.ts`
  are the only place a timestamp becomes text. Store UTC, display Asia/Dhaka.
- **Server components by default.** Add `"use client"` only for state, effects
  or event handlers. `PlanPicker`, `ServiceRequestForm`, `ThemeToggle`,
  `AnnouncementBar` and `Navbar` are the only client components in Phase 1.
- **No animation library.** CSS transitions with `--ease-brand` and
  `--duration-fast`/`--duration-base`. `prefers-reduced-motion` is handled
  globally in `globals.css`.
- **Filters are query params.** `/explore` keeps every filter in the URL, so
  results are shareable, indexable and functional without JavaScript.

---

*Companion to `README.md`. Spec: `../ai-marketplace-spec/MASTER_DEVELOPMENT_PROMPT.md` v4.0.*
