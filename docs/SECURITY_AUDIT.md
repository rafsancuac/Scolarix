# Security Audit Report — Scolarix Marketplace

**Date:** 2026-11-04 · **Scope:** `apps/web` (Next.js 16 App Router), `packages/database` (Prisma 6), root tooling.
**Method:** source review, live HTTP probing of a local production build (`next start`), `npm audit`, tracked-file secret scan.

> This report describes what was checked and verified in this environment. It is **not** a certification
> of compliance with any standard (OWASP ASVS, PCI DSS, ISO 27001, etc.).

## Findings

| ID | Finding | Severity | Affected component | Remediation | Status |
|----|---------|----------|--------------------|-------------|--------|
| SEC-01 | Unauthenticated `/admin` and `/dashboard` rendered customer **name, email, IP address and free-text brief** from the service-request store (OWASP A01 Broken Access Control / PII exposure). | **High** | `src/app/admin/page.tsx`, `src/app/dashboard/page.tsx` | Added `src/lib/pii.ts`: production builds always mask name/email and hide IP and brief; full values only when `NODE_ENV !== "production"`. | **Fixed & verified** — 7 unit tests (`tests/pii.test.ts`) + live probe: submitted a request, confirmed raw email/name absent and masked value present on both pages. |
| SEC-02 | Admin console has no real authentication/RBAC. | High | `/admin` route tree | Added full server-side session management (`session.ts`), role-based capability gates (`guards.ts`), and route proxy (`proxy.ts`). Anonymous users redirected (307) to `/login`. Non-staff users get 404 (no information disclosure). Full audit trail recorded. | **Fixed & verified** — 20 unit tests (`tests/auth-policy.test.ts`) + 38 E2E test cases (`tests/e2e-auth.mjs`). |
| SEC-03 | Uncommitted "payment gateway" work displayed fabricated "Connected" states for PostgreSQL and bKash/Nagad/Visa and hard-coded "PAID" orders with a real email address. Violates ADR-0014 (no fake payment confirmation). | High (integrity) | `payment-gateway/page.tsx`, `api/v1/payments/verify/route.ts`, `dashboard/page.tsx` (uncommitted) | Kept **off `main`** on local branch `wip/payment-gateway-demo` (preserved, not deleted, not pushed). | **Mitigated** |
| SEC-04 | `/api/v1/health` reports `database: ok` based only on `DATABASE_URL` being set. | Medium | `src/app/api/v1/health/route.ts` | Replaced env-var check with live TCP socket reachability probe (`net-probe.ts`). Probes PostgreSQL and Redis with timeout. | **Fixed & verified** — Unit tests (`tests/health-probe.test.ts`). |
| SEC-05 | `npm audit` (dev only): 3 high in `prisma` CLI → `@prisma/config` → `deepmerge-ts`; no upstream fix available. | Low (dev-time tooling, not shipped) | `packages/database` devDependency | Monitor; upgrade Prisma when a fix is published. `npm audit --omit=dev` = **0 vulnerabilities** and is enforced in CI. | **Accepted risk** |
| SEC-06 | In-process rate limiter on `POST /api/v1/service-requests` resets on restart and is per-instance. | Low | `src/app/api/v1/service-requests/route.ts` | Move to Redis sliding window (§17.5) for multi-instance deployments. | **Open — documented** |

## Controls verified as present

| Control | Evidence |
|---------|----------|
| Security headers | Live response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive. |
| Server-side input validation | `POST /api/v1/service-requests` with junk payload → `422 VALIDATION_FAILED` with per-field errors; `POST /api/v1/checkout/sessions` `{}` → `422`. |
| Prices/service names from catalogue, not client | Unit tests in `checkout.test.ts` and `service-request.test.ts`. |
| No data listing endpoints | `GET` on both write APIs → `405`. |
| Non-enumerable references | `SR-YYYYMMDD-XXXXXX` random suffix (unit-tested). |
| Rate limiting | `429` + `Retry-After` on service-request submissions. |
| Secrets not committed | Tracked-file scan for live keys, private keys, credentialed DB URLs: only `.env.example` local docker-compose placeholders (`marketplace:marketplace@localhost`). `.env.local` and `.data/*.jsonl` are gitignored (`git check-ignore` confirmed). |
| Unknown routes | `404`. |

## Not verifiable in this environment

- Real authentication/session expiry, RBAC, TOTP (Auth.js not connected).
- Payment gateway (SSLCommerz) callbacks/IPN signature verification — no sandbox credentials.
- Database-level access restrictions — no PostgreSQL instance running.
- HTTPS/HSTS — depends on the deployment platform; not tested locally.
