/**
 * GET /api/v1/health — liveness and readiness for the container healthcheck,
 * the load balancer and the orchestrator (§17.4, §18.3).
 *
 * Returns 200 when the process can serve traffic, and reports the state of each
 * dependency so a failing rollout is diagnosable from one call. A degraded
 * dependency returns 503 with `status: "degraded"` — the container is alive but
 * should not receive traffic.
 *
 * Deliberately exposes NO secrets, no connection strings and no version detail
 * beyond what an operator needs (§19.6).
 */

import { NextResponse } from "next/server";

import { capabilityMatrix, DATA_ADAPTER } from "@/lib/checkout";
import { endpointFromUrl, tcpReachable } from "@/lib/net-probe";
import { listProducts } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** Cheap reachability probe. Never throws out of the handler. */
async function probe(name: string, fn: () => Promise<boolean>): Promise<{
  name: string;
  ok: boolean;
  ms: number;
}> {
  const started = Date.now();
  try {
    const ok = await fn();
    return { name, ok, ms: Date.now() - started };
  } catch {
    return { name, ok: false, ms: Date.now() - started };
  }
}

export async function GET() {
  const started = Date.now();

  const checks = await Promise.all([
    // The catalogue adapter must be readable or no page can render.
    probe("catalogue", async () => (await listProducts()).length >= 0),
    ...(DATA_ADAPTER === "prisma"
      ? [
          probe("database", async () => {
            // Credential presence is necessary but not sufficient (§17.4):
            // a set DATABASE_URL pointing at a stopped container must not
            // report ok. Wired to `prisma.$queryRaw SELECT 1` in Phase 2;
            // TCP reachability is the honest interim probe.
            const endpoint = endpointFromUrl(process.env.DATABASE_URL);
            return endpoint !== null && (await tcpReachable(endpoint));
          }),
          probe("queue", async () => {
            const endpoint = endpointFromUrl(process.env.REDIS_URL);
            return endpoint !== null && (await tcpReachable(endpoint));
          }),
        ]
      : []),
  ]);

  const allOk = checks.every((check) => check.ok);
  const capabilities = capabilityMatrix().map((entry) => ({
    key: entry.key,
    connected: entry.connected,
    required: entry.required,
  }));

  // Required integrations that are missing make the service degraded, not dead:
  // the storefront still renders, but it must not take orders.
  const missingRequired = capabilities.filter(
    (capability) => capability.required && !capability.connected,
  );

  const healthy = allOk && missingRequired.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : allOk ? "degraded" : "unhealthy",
      adapter: DATA_ADAPTER,
      demoMode: process.env.DEMO_MODE !== "false",
      brandCleared: process.env.BRAND_CLEARED === "true",
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
      checks,
      missingRequired,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        // Never cache a health response.
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
