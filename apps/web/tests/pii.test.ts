/**
 * PII redaction — security audit finding SEC-01 (OWASP A01).
 *
 * `/admin` and `/dashboard` are reachable without authentication until Auth.js
 * is connected, so production builds must never render customer contact
 * details, IP addresses or free-text briefs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRevealCustomerPII,
  displayContact,
  maskEmail,
  maskName,
  REDACTED_BRIEF,
  REDACTED_IP,
} from "../src/lib/pii";

const request = {
  contact: { name: "Md. Rafsan", email: "student@example.com" },
  brief: "Please help me format my thesis references for submission next week.",
  declaration: { ipAddress: "203.0.113.7" },
};

describe("PII reveal policy", () => {
  it("never reveals in a production build", () => {
    assert.equal(canRevealCustomerPII("production"), false);
  });

  it("reveals only in non-production environments", () => {
    assert.equal(canRevealCustomerPII("development"), true);
    assert.equal(canRevealCustomerPII("test"), true);
  });
});

describe("masking", () => {
  it("masks the local part of an email but keeps the domain", () => {
    assert.equal(maskEmail("student@example.com"), "s***@example.com");
  });

  it("fully masks malformed emails", () => {
    assert.equal(maskEmail("not-an-email"), "***");
    assert.equal(maskEmail("@example.com"), "***");
  });

  it("masks names to their first character", () => {
    assert.equal(maskName("Md. Rafsan"), "M***");
    assert.equal(maskName("   "), "***");
  });
});

describe("displayContact", () => {
  it("redacts every sensitive field when reveal is false", () => {
    const shown = displayContact(request, false);
    assert.equal(shown.name, "M***");
    assert.equal(shown.email, "s***@example.com");
    assert.equal(shown.brief, REDACTED_BRIEF);
    assert.equal(shown.ipAddress, REDACTED_IP);
    assert.ok(!JSON.stringify(shown).includes("203.0.113.7"));
    assert.ok(!JSON.stringify(shown).includes("student@"));
  });

  it("passes values through unchanged when reveal is true", () => {
    const shown = displayContact(request, true);
    assert.equal(shown.email, request.contact.email);
    assert.equal(shown.ipAddress, request.declaration.ipAddress);
  });
});
