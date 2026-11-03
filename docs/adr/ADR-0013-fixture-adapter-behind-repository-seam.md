# ADR-0013 — Seeded fixture adapter behind a repository seam

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-04 |
| **Phase** | 1 |
| **Deciders** | Coordinator |
| **Supersedes** | — |
| **Related** | spec §14, §17.1, §23 Phase 1–2; `README.md` §5.1 |

## Context

Phase 1 has to deliver a working storefront — 23 routes, real catalogue data,
real pricing arithmetic, the §11.2 compliance gate — before any database exists.
Two constraints forced the issue:

1. **The build environment has no PostgreSQL, no Redis and no Docker.** The
   sandbox where this was developed cannot run the production data layer at all.
2. **Spec §6 rule 1 forbids hardcoded prices in the frontend**, and §28.5
   forbids dummy data presented as real. A page with prices typed into JSX would
   satisfy neither, and would have to be rewritten in Phase 2 anyway.

The naïve alternatives both fail:

- *Hardcode content in each page* — violates rule 1, creates 20+ places to
  change a price, and produces a Phase 2 rewrite rather than a Phase 2 adapter.
- *Wait for PostgreSQL before building UI* — stalls Phase 1 on infrastructure
  that is explicitly a later phase, and delivers nothing reviewable.

## Decision

Introduce **one data seam**: `apps/web/src/lib/repository.ts`.

Every page and component imports catalogue data from that module and from
nothing else. No page imports `src/data/fixtures.ts` directly — the fixtures are
an implementation detail of the current adapter, not a public interface.

The module exports a fixed contract of ~27 functions (`listProductItems`,
`getProductBySlug`, `listByCategory`, `search`, …) plus three **pure business
rules** that are deliberately *not* queries:

```ts
evaluatePurchaseGate(product): GateFailure | null
isPurchasable(product): boolean
availabilityOf(product): Availability
```

Keeping the compliance gate pure means it stays identical when the adapter
changes. Moving it into SQL would scatter the single most important business rule
in the system across query builders, and would make it impossible to unit-test
the gate without a database.

The same seam pattern is applied to persistence in
`apps/web/src/lib/request-store.ts` (`recordServiceRequest` /
`listServiceRequests` / `countServiceRequests`), which currently writes JSONL to
`apps/web/.data/`.

## Consequences

### Positive

- **Phase 1 shipped and is fully reviewable** with no infrastructure: 23 routes
  returning 200, 112 tests passing, 26 financial checks passing.
- **Phase 2 becomes a bounded, testable task**: implement the same signatures
  against Prisma, re-run `npm run check`, flip `DATA_ADAPTER`. No page changes.
- **Prices are never hardcoded**, because there is no place to hardcode them —
  the template has no data except what the repository returns.
- **`verify-financials` can assert cross-surface consistency** (category counts
  vs. purchasable listings, `fromPricePoisha` vs. cheapest active plan) against
  either adapter. A Prisma implementation with a naive `WHERE` clause that
  forgets the gate fails the build.
- **The compliance gate is unit-testable** without a database, which is how
  mandatory test #4 (expired authorization → unpurchasable) is covered today.

### Negative

- **Two implementations of the contract will exist temporarily**, and the
  fixture one must be kept in sync by hand. Mitigated by the contract being
  small and by the tests importing the seam rather than the fixtures.
- **Fixtures can drift from the Prisma schema.** The schema has fields the
  fixtures do not (`audience` was added to both in the same change, but this will
  recur). Mitigated by `verify-financials` failing on a shape mismatch.
- **No persistence for orders** — nothing can actually be bought. Accepted:
  checkout refuses honestly (ADR-0014) rather than pretending.
- **`search()` is an in-memory substring matcher**, not Postgres FTS. Fine for
  12 products; must be replaced in Phase 2. The interface is identical so the
  swap is invisible to callers.

### Neutral

- The JSONL request store survives restarts and tolerates a torn final line
  (a process killed mid-append cannot corrupt reads), which was enough to make
  the service-request API genuinely functional rather than a stub.

## Alternatives considered

| Option | Rejected because |
|---|---|
| Hardcode content per page | Violates §6 rule 1; 20+ edit sites; Phase 2 rewrite. |
| SQLite for Phase 1 | Adds a second schema dialect to maintain, and the sandbox has no `sqlite3` binary either. |
| Mock the repository in tests only, hardcode in pages | Same rule-1 violation, plus tests would then verify mocks rather than the seam. |
| Build the Prisma adapter first, UI second | Stalls Phase 1 on infrastructure; delivers nothing reviewable; contradicts the client's explicit instruction to build the site first. |
| In-memory JS object as the store | Loses service requests on restart, which would have made the intake API a stub in all but name. |

## Verification

- `npm run check` — 112 tests, 26 financial checks, strict typecheck, all green.
- All 23 routes return 200; `/nope-404` returns 404.
- `grep -rn "data/fixtures" src/app src/components` returns nothing: no page
  bypasses the seam.
