/**
 * Authentication & authorization policy — spec §17.6, OWASP A01/A02/A07.
 * Every rule is tested in both directions (allowed AND denied).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkPasswordPolicy,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../src/server/auth/password";
import {
  ABSOLUTE_SESSION_MS,
  can,
  idleTimeoutMs,
  isSameOrigin,
  isSessionLive,
  isStaff,
  normaliseEmail,
  renewedExpiry,
  safeRedirectPath,
  type Role,
} from "../src/server/auth/policy";

describe("password hashing", () => {
  it("round-trips a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("correct horse battery staple", hash), true);
    assert.equal(await verifyPassword("correct horse battery stapl3", hash), false);
  });

  it("never stores the plaintext and salts every hash", async () => {
    const a = await hashPassword("a-sufficiently-long-secret");
    const b = await hashPassword("a-sufficiently-long-secret");
    assert.ok(!a.includes("a-sufficiently-long-secret"));
    assert.notEqual(a, b);
  });

  it("treats malformed or hostile stored hashes as a failed login, not an error", async () => {
    assert.equal(await verifyPassword("x", ""), false);
    assert.equal(await verifyPassword("x", "bcrypt$10$abc$def$ghi$jkl"), false);
    assert.equal(await verifyPassword("x", "scrypt$99999999999$8$1$AAAA$AAAA"), false);
    assert.equal(await verifyPassword("x", "scrypt$abc$8$1$AAAA$AAAA"), false);
  });

  it("flags legacy parameters for rehash but not current ones", async () => {
    const hash = await hashPassword("a-sufficiently-long-secret");
    assert.equal(needsRehash(hash), false);
    assert.equal(needsRehash("scrypt$16384$8$1$AAAA$AAAA"), true);
  });
});

describe("password policy", () => {
  it("rejects short passwords and accepts long ones without composition rules", () => {
    assert.equal(checkPasswordPolicy("short").ok, false);
    assert.equal(checkPasswordPolicy("alllowercaseandlong").ok, true);
  });

  it("rejects passwords containing the email name, repeats and common values", () => {
    assert.equal(checkPasswordPolicy("my-rafsan-secret-1", { email: "rafsan@example.com" }).ok, false);
    assert.equal(checkPasswordPolicy("aaaaaaaaaaaaaaaa").ok, false);
    assert.equal(checkPasswordPolicy("password1234").ok, false);
  });

  it("bounds the maximum length so hashing cost cannot be abused", () => {
    assert.equal(checkPasswordPolicy("x".repeat(129)).ok, false);
  });
});

describe("RBAC capabilities", () => {
  const staff: Role[] = ["SUPER_ADMIN", "ADMIN", "FINANCE", "SUPPORT", "COMPLIANCE"];

  it("lets every staff role open the console and denies customers and anonymous users", () => {
    for (const role of staff) assert.equal(can(role, "admin.console.view"), true, role);
    assert.equal(can("CUSTOMER", "admin.console.view"), false);
    assert.equal(can(null, "admin.console.view"), false);
    assert.equal(can(undefined, "admin.console.view"), false);
  });

  it("restricts customer PII to roles that need it", () => {
    assert.equal(can("ADMIN", "customer.pii.view"), true);
    assert.equal(can("SUPPORT", "customer.pii.view"), true);
    assert.equal(can("FINANCE", "customer.pii.view"), false);
    assert.equal(can("COMPLIANCE", "customer.pii.view"), false);
    assert.equal(can("CUSTOMER", "customer.pii.view"), false);
  });

  it("restricts finance and audit data (rule 14: supplier cost is role-restricted)", () => {
    assert.equal(can("FINANCE", "finance.view"), true);
    assert.equal(can("SUPER_ADMIN", "finance.view"), true);
    assert.equal(can("ADMIN", "finance.view"), false);
    assert.equal(can("SUPPORT", "finance.view"), false);
    assert.equal(can("COMPLIANCE", "audit.view"), true);
    assert.equal(can("SUPPORT", "audit.view"), false);
  });

  it("identifies staff correctly", () => {
    assert.equal(isStaff("ADMIN"), true);
    assert.equal(isStaff("CUSTOMER"), false);
  });
});

describe("session lifetime", () => {
  const now = new Date("2026-11-05T00:00:00Z");
  const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);

  it("uses 24h idle for customers and 8h for staff", () => {
    assert.equal(idleTimeoutMs("CUSTOMER"), 24 * 3_600_000);
    assert.equal(idleTimeoutMs("ADMIN"), 8 * 3_600_000);
  });

  it("accepts a live session and rejects expired, absolutely-expired and revoked ones", () => {
    const live = { expiresAt: hours(1), absoluteExpiresAt: hours(100), revokedAt: null };
    assert.equal(isSessionLive(live, now), true);
    assert.equal(isSessionLive({ ...live, expiresAt: hours(-1) }, now), false);
    assert.equal(isSessionLive({ ...live, absoluteExpiresAt: hours(-1) }, now), false);
    assert.equal(isSessionLive({ ...live, revokedAt: hours(-2) }, now), false);
  });

  it("rejects a session expiring exactly now", () => {
    assert.equal(isSessionLive({ expiresAt: now, absoluteExpiresAt: hours(5), revokedAt: null }, now), false);
  });

  it("renews idle expiry but never past the absolute cap", () => {
    const farCap = new Date(now.getTime() + ABSOLUTE_SESSION_MS);
    assert.equal(renewedExpiry("ADMIN", now, farCap).getTime(), now.getTime() + 8 * 3_600_000);
    const nearCap = hours(2);
    assert.equal(renewedExpiry("CUSTOMER", now, nearCap).getTime(), nearCap.getTime());
  });
});

describe("CSRF origin check", () => {
  it("accepts a same-origin Origin or Referer", () => {
    assert.equal(isSameOrigin({ origin: "https://shop.example", host: "shop.example" }), true);
    assert.equal(isSameOrigin({ referer: "https://shop.example/login", host: "shop.example" }), true);
  });

  it("rejects cross-site, malformed and missing origins", () => {
    assert.equal(isSameOrigin({ origin: "https://evil.example", host: "shop.example" }), false);
    assert.equal(isSameOrigin({ origin: "not a url", host: "shop.example" }), false);
    assert.equal(isSameOrigin({ host: "shop.example" }), false);
    assert.equal(isSameOrigin({ origin: "https://shop.example" }), false);
  });

  it("is not fooled by lookalike hosts", () => {
    assert.equal(isSameOrigin({ origin: "https://shop.example.evil.com", host: "shop.example" }), false);
  });
});

describe("input helpers", () => {
  it("normalises valid emails and rejects invalid ones", () => {
    assert.equal(normaliseEmail("  Student@Example.COM "), "student@example.com");
    assert.equal(normaliseEmail("no-at-sign"), null);
    assert.equal(normaliseEmail("a@b"), null);
    assert.equal(normaliseEmail(`${"a".repeat(250)}@x.com`), null);
  });

  it("only allows same-site relative redirects", () => {
    assert.equal(safeRedirectPath("/dashboard/orders"), "/dashboard/orders");
    assert.equal(safeRedirectPath("https://evil.example"), "/dashboard");
    assert.equal(safeRedirectPath("//evil.example"), "/dashboard");
    assert.equal(safeRedirectPath("/\\evil.example"), "/dashboard");
    assert.equal(safeRedirectPath(null), "/dashboard");
    assert.equal(safeRedirectPath("javascript:alert(1)"), "/dashboard");
  });
});
