# ADR-0014 — Refuse rather than simulate: no fake payment confirmation

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-04 |
| **Phase** | 1 |
| **Deciders** | Coordinator |
| **Supersedes** | — |
| **Related** | spec §6 rules 3–5, §15.1, §28.5, FINAL RULES; ADR-0013 |

## Context

Phase 1 delivers a checkout page with a real, correctly-computed total — and no
payment gateway. The obvious ways to finish the screen are all variations on
pretending:

- Render a **Pay** button that shows a success toast.
- Return a **fabricated gateway session** from the API so the redirect "works".
- Have `/api/v1/health` report **200 ok** so the stack looks deployable.
- Fill `/dashboard` with **invented subscriptions** so the panels look alive.

Every one of those is explicitly prohibited — §28.5 ("never build fake
confirmations, dummy checkout, static dashboards"), and the FINAL RULES ("never
use fake payment confirmations", "never claim a feature complete without testing
it"). The prohibition is not aesthetic. A simulated `SUCCEEDED` in a codebase is
a rehearsal for a real one: §6 rule 4 exists precisely because fulfilment must
only ever be triggered by a *server-verified* payment callback, and the cheapest
way to lose that invariant is to have built the page around a client-side success
state first.

## Decision

**Every unimplemented capability fails loudly, states what is missing, and names
the configuration that would enable it.** Specifically:

| Surface | Behaviour without credentials/adapters |
|---|---|
| `/checkout` | Computes the real total, then renders a "Payment not connected" notice. **No pay button exists** — there is nothing to click. |
| `POST /api/v1/checkout/sessions` | **501** `PAYMENTS_NOT_CONFIGURED`, with a `remediation` field naming the exact env vars. With credentials present but no adapter implemented: **501** `GATEWAY_ADAPTER_NOT_IMPLEMENTED`. Never a fabricated redirect URL. |
| `GET /api/v1/health` | **503** with `status: "degraded"` and a `missingRequired` array. Never a 200 that misrepresents readiness. |
| `/dashboard` | Renders the real panel specification, a capability matrix showing what is not connected, and the two datasets that *are* live (service-request counts, catalogue compliance). No invented subscriptions. |
| `/admin` | Read-only. **No mutation is offered**, because nothing can be persisted. States plainly that the console is unauthenticated in this environment rather than presenting itself as authorised. |
| Homepage testimonials | The section **does not render** when `listTestimonials()` is empty. It is not filled with placeholder quotes. |
| `verify-financials` §8 | Prints `SKIP` plus "This is not a pass", and says which figures remain unverified. |
| Urgency / scarcity | No countdown timers, no fake stock counters, no invented review counts anywhere. |

Capability flags are **derived from credential presence**, not from a boolean
that can be flipped:

```ts
export const PAYMENT_CONNECTED =
  isSet("SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD", "SSLCOMMERZ_IS_SANDBOX") ||
  isSet("BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_USERNAME", "BKASH_PASSWORD") ||
  isSet("NAGAD_MERCHANT_ID", "NAGAD_PRIVATE_KEY", "NAGAD_PG_PUBLIC_KEY");
```

A **partial** credential group therefore leaves checkout refusing. That is the
correct failure mode: a half-configured gateway fails at the worst possible
moment — after a customer has paid.

The same rule applies to discounts. `STUDENT_DISCOUNT_CONFIGURED` requires both a
verification provider and a configured rate; without them the student step
contributes **zero** rather than guessing a percentage.

## Consequences

### Positive

- **No unlearning in Phase 4.** The checkout page never had a client-side
  success path, so wiring the real gateway cannot leave one behind. §15.1's
  state machine starts from a clean slate.
- **Misconfiguration is self-announcing.** `missingRequired` names the exact
  integration, and the `remediation` field names the exact env var. An operator
  cannot accidentally ship a storefront that takes money into a void.
- **The container healthcheck still works locally.** It treats 200 *and* 503 as
  "alive" (liveness), while the load balancer uses the body to decide readiness.
  A fresh local stack starts; a production rollout does not receive traffic until
  it is genuinely ready.
- **Trust.** The provisional-brand warning, the DEMO DATA ribbon and the
  "ticket console is not built yet" notice all tell a reviewer the truth, which
  makes the things marked ✅ Real credible.

### Negative

- **Phase 1 looks less finished than a mocked version would.** A stakeholder
  clicking `/dashboard` sees an explanation, not a populated account. Accepted:
  the client's own rules forbid the alternative, and a fabricated dashboard would
  have to be deleted in Phase 3 anyway.
- **`/api/v1/health` returns 503 in every environment until Phase 4**, which
  could be mistaken for an outage by an unconfigured monitor. Mitigated by
  documenting the liveness/readiness split in `docs/SETUP.md` §3.4 and in the
  compose file.
- **`verify-financials` cannot report a full pass yet.** It ends with an explicit
  "Ledger verification is still outstanding" line rather than a clean exit, so it
  cannot be quoted as fully green. That is the intent.

### Risk noted

The refusal must not become permanent. Each notice names the configuration that
removes it, and Phase 4's acceptance criteria require the pay action to exist.
If a notice is still shipping at launch wave 1, that is a release blocker, not a
design choice.

## Alternatives considered

| Option | Rejected because |
|---|---|
| Pay button + success toast | Prohibited by §28.5; creates a client-side success state that §6 rule 4 forbids and that is hard to remove later. |
| Return a stub gateway session (200) | A fabricated redirect URL is indistinguishable from a real one to the caller; the failure surfaces after a customer pays. |
| `health` returns 200 with warnings in the body | Orchestrators and load balancers read the status code, not the prose. A 200 would route traffic to a store that cannot take orders. |
| Feature-flag the whole checkout page off | Hides the pricing work that *is* real, and still leaves the question of what the button does when the flag flips. |
| Seed a demo gateway that echoes success | Exactly the "fake payment confirmation" the FINAL RULES prohibit, with extra steps. |

## Verification

```bash
curl -s -X POST localhost:3000/api/v1/checkout/sessions \
  -H 'Content-Type: application/json' -d '{"sku":["CLAUDE-PRO-1M"]}'
# → 501 {"code":"PAYMENTS_NOT_CONFIGURED", ... "refuses to return a fake session"}

curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/v1/health
# → 503, body lists 4 missing required integrations

curl -s localhost:3000/checkout?sku=CLAUDE-PRO-1M | grep -c "Payment not connected"
# → 1   (and the page contains no submit button for payment)
```
