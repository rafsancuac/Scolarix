/**
 * TCP reachability probes for the health endpoint.
 *
 * The capability flags in `checkout.ts` are derived from credential presence
 * by design (ADR: a partial gateway configuration must fail closed). Presence
 * alone, however, cannot tell the health endpoint whether the configured
 * service is actually listening — a `DATABASE_URL` pointing at a stopped
 * container would otherwise produce a fake `ok`. These probes add the
 * reachability half. They never throw and never leak endpoint details.
 */

import net from "node:net";

export type Endpoint = { host: string; port: number };

/** Parse host/port from a postgres://, redis:// or similar URL. Returns null when unusable. */
export function endpointFromUrl(raw: string | undefined | null): Endpoint | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.hostname) return null;
    const parsed = Number(url.port);
    const fallback = url.protocol.startsWith("postgres") ? 5432 : url.protocol.startsWith("redis") ? 6379 : 0;
    const port = Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    if (!port) return null;
    return { host: url.hostname, port };
  } catch {
    return null;
  }
}

/**
 * True only when the endpoint accepts a TCP connection within `timeoutMs`.
 * A refused, timing-out or DNS-failing probe is `false`, not an exception.
 */
export async function tcpReachable(endpoint: Endpoint, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: endpoint.host, port: endpoint.port });
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
