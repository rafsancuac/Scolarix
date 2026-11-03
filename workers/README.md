# workers/

Background job processors. **Empty in Phase 1 — intentionally.**

Nothing here runs yet. The `worker` service in `docker-compose.yml` currently
idles with a log line saying so, rather than pretending to process jobs.

## Phase 5 scope

| Worker | Responsibility | Spec |
|---|---|---|
| `fulfillment` | Claims `fulfillment_jobs` rows atomically with `SELECT … FOR UPDATE SKIP LOCKED`, releases a code from the vault or calls the provider API, records the delivery. Max 5 attempts, then `MANUAL_QUEUE`. | §15.2 |
| `webhook-ingest` | Verifies the gateway signature, dedupes on `webhook_events.providerEventId`, acks within 5 s and queues the heavy work. | §6 rule 5, §18.1 |
| `reminders` | Renewal reminder sweeps in **UTC**, deduplicated per subscription per threshold so a restart cannot double-send. | §6 rule 9, §13.11 |
| `evidence-expiry` | Sets `AuthorizationStatus.EXPIRED_EVIDENCE` and auto-unpublishes a listing whose authorization evidence has lapsed. | §11.2, §6 rule 6 |
| `catch-up` | Detects missed scheduled runs after downtime and alerts. | §6 rule 9 |

## Constraints that apply to every worker

- **Fulfilment is enqueued only by a verified `Payment.SUCCEEDED`, inside the
  same transaction** (§6 rule 4). No worker may infer success from anything else.
- **Idempotency keys are mandatory**: `fulfillment_jobs.idempotencyKey`,
  `webhook_events.providerEventId`, `ledger_entries.idempotencyKey`. A 5×
  callback replay must produce one fulfilment (mandatory test #1).
- **A worker killed mid-job must leave the job recoverable** — stale
  `lockedAt` values are swept and re-queued (mandatory test #27).
- **Workers never receive production credentials in a development context**, and
  never run unreviewed code (§24).
- **Redis is required.** Without it there is no queue and no webhook dedupe, so
  `GET /api/v1/health` reports `queue` under `missingRequired` and returns 503.

## Shape

```
workers/
├── fulfillment/    # BullMQ consumer for the fulfilment queue
├── webhooks/       # signature verification + dedupe + enqueue
├── reminders/      # cron: renewal sweeps
└── shared/         # queue names, retry policy, logging, health reporting
```

Same image as the web app, different command — one build artefact, two runtime
roles. See `apps/web/Dockerfile` and the `worker` service in
`docker-compose.yml`.
