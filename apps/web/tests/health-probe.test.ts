/**
 * Health-probe reachability — §17.4.
 *
 * The health endpoint must not report a dependency healthy merely because its
 * URL is configured. These tests pin the two halves of that guarantee: URL
 * parsing never invents an endpoint, and reachability is only true when a
 * connection is actually accepted.
 */

import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";

import { endpointFromUrl, tcpReachable } from "../src/lib/net-probe";

describe("endpointFromUrl", () => {
  it("extracts host and port from a postgres URL", () => {
    assert.deepEqual(endpointFromUrl("postgresql://u:p@db.local:5433/marketplace"), {
      host: "db.local",
      port: 5433,
    });
  });

  it("falls back to the well-known port when the URL omits one", () => {
    assert.deepEqual(endpointFromUrl("redis://cache.internal"), {
      host: "cache.internal",
      port: 6379,
    });
    assert.deepEqual(endpointFromUrl("postgresql://u:p@db.local/marketplace"), {
      host: "db.local",
      port: 5432,
    });
  });

  it("returns null for unset, malformed, or hostless values", () => {
    assert.equal(endpointFromUrl(undefined), null);
    assert.equal(endpointFromUrl(""), null);
    assert.equal(endpointFromUrl("not a url"), null);
    assert.equal(endpointFromUrl("postgresql://:5432"), null);
  });
});

describe("tcpReachable", () => {
  it("is true only when the endpoint accepts a connection", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const ok = await tcpReachable({ host: "127.0.0.1", port: address.port }, 500);
    server.close();
    assert.equal(ok, true);
  });

  it("is false — not an exception — for a refused or unroutable endpoint", async () => {
    const refused = await tcpReachable({ host: "127.0.0.1", port: 1 }, 500);
    assert.equal(refused, false);
  });

  it("is false when the host cannot be resolved", async () => {
    const unresolvable = await tcpReachable(
      { host: "definitely-not-a-real-host.invalid", port: 5432 },
      500,
    );
    assert.equal(unresolvable, false);
  });
});
