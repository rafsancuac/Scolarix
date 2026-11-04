# Testing Report — Scolarix Marketplace

**Date:** 2026-11-04 · **Environment:** Windows, Node 24.21.0, npm 11.19.0, Next.js 16.4.5 · local production build.
Every result below was actually executed in this session.

## Automated checks

| Check | Command | Expected | Actual | Status |
|-------|---------|----------|--------|--------|
| Dependency install | `npm install` (root workspaces) | clean install | 175 packages, workspace junctions created | ✅ Pass |
| Typecheck | `npm run typecheck` | 0 errors | 0 errors (after clearing stale `.next` cache) | ✅ Pass |
| Unit tests | `npm run test` | all pass | **119 / 119** pass, 25 suites | ✅ Pass |
| Catalogue financials | `npm run verify-financials` | 0 failures | 26 checks, 0 failures; ledger section **SKIPPED** (no `DATABASE_URL` DB) | ⚠️ Partial |
| Prisma schema | `prisma validate` | valid | valid | ✅ Pass |
| Production build | `next build` | success | success, 46 pages generated | ✅ Pass |
| Prod dependency audit | `npm audit --omit=dev` | 0 high | 0 vulnerabilities | ✅ Pass |
| Lint | `next lint` | — | **Not available**: `next lint` was removed in Next.js 16 and no ESLint flat config exists | ❌ Not run |

## Route smoke test (live `next start` on 127.0.0.1:3000)

All returned **200**: `/`, `/explore`, `/pricing`, `/bundles`, `/bundles/research-starter`,
`/categories/ai-assistants`, `/products/chatgpt-plus`, `/services`, `/services/ai-workflow-configuration`,
`/students`, `/support`, `/legal`, `/legal/privacy`, `/search?q=ai`, `/checkout`, `/dashboard`, `/admin`,
`/api/v1/health`, `/robots.txt`, `/sitemap.xml`. Unknown route `/does-not-exist` → **404** ✅.

## Functional / API tests

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Submit valid service request | 201 + reference | `201`, `SR-20261104-…`, outcome `QUOTE_PENDING` | ✅ |
| Submit invalid service request | 422 with field errors | `422 VALIDATION_FAILED` | ✅ |
| Checkout session with empty body | 4xx | `422` | ✅ |
| GET on write-only APIs | 405 | `405` | ✅ |
| PII redaction on `/admin` & `/dashboard` (prod build) | no raw email/name | raw absent, `q***@example.com` shown, brief hidden on admin | ✅ |

## Not performed (outstanding)

- Responsive and cross-browser (Chrome/Edge/Firefox) visual testing — no browser automation was run in this session.
- Login/logout/registration, protected routes — Auth.js not connected.
- Database-backed flows and ledger verification — no PostgreSQL instance.
- Payment gateway end-to-end — no sandbox credentials.
- Lighthouse/performance profiling.
