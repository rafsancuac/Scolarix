/**
 * Service-request intake — spec §12.5, §12.6, and mandatory test #26
 * ("missing declaration + prohibited keyword").
 *
 * The prohibited-scope screen must catch the requests the business refuses to
 * perform, and must NOT catch legitimate editing, formatting and tutoring work
 * — a screen that fires on everything is as useless as one that fires on
 * nothing, because staff stop trusting it.
 */

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import {
  MAX_BRIEF_LENGTH,
  MIN_BRIEF_LENGTH,
  buildServiceRequest,
  generateRequestReference,
  screenForProhibitedScope,
  validateServiceRequest,
  type ServiceRequestInput,
} from "../src/lib/service-request";
import { listServices } from "../src/lib/repository";

let SLUG = "";
before(async () => {
  SLUG = (await listServices())[0]!.slug;
});

function validInput(overrides: Partial<ServiceRequestInput> = {}): ServiceRequestInput {
  return {
    serviceSlug: SLUG,
    name: "Nusrat Jahan",
    email: "nusrat@student.cu.ac.bd",
    phone: "+880 1712-345678",
    institution: "University of Chittagong",
    deadline: "2027-03-01",
    brief:
      "I have written my undergraduate thesis on climate adaptation in coastal Chattogram. I need it formatted to my department template, with APA 7 references rebuilt from my source list.",
    integrityAcknowledged: true,
    ...overrides,
  };
}

describe("the mandatory declaration", () => {
  it("rejects a request submitted without the integrity acknowledgement", async () => {
    const result = await validateServiceRequest(validInput({ integrityAcknowledged: false }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.integrityAcknowledged);
  });

  it("rejects a request where the acknowledgement is a truthy non-boolean", async () => {
    // A client sending "yes" or 1 must not satisfy a boolean requirement.
    const result = await validateServiceRequest(
      validInput({ integrityAcknowledged: "yes" as unknown as boolean }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.integrityAcknowledged);
  });

  it("accepts a well-formed request with the acknowledgement", async () => {
    const result = await validateServiceRequest(validInput());
    assert.deepEqual(result.errors, {});
    assert.equal(result.ok, true);
  });
});

describe("prohibited-scope screen — must fire", () => {
  const prohibited: [string, string][] = [
    ["ghost-writing", "Please write my thesis on supply chain finance, 12,000 words, and I will submit it."],
    ["ghost-writing (assignment)", "Can you do my assignment for me before Friday? It is worth 20% of the grade."],
    ["ghost-writing (from scratch)", "I need a dissertation from scratch for submission next month."],
    ["assessment completion", "I need someone to take my exam for me in the spring semester."],
    ["assessment completion (solving)", "Please solve my midterm and send the answers before 8pm."],
    ["Turnitin evasion", "I need this rewritten so it can beat Turnitin and show under 5% similarity."],
    ["Turnitin evasion (report)", "Can you make it turnitin-proof and humanise it so the detector misses it?"],
    ["undetectable AI", "Give me undetectable AI text that passes all detectors."],
    ["similarity reduction", "I want you to lower the similarity score without changing my meaning."],
    ["fabricated data", "Please fabricate the survey data for 200 respondents, I did not collect any."],
    ["fabricated references", "Add fake references that look real, I do not have sources yet."],
    ["fabricated citations", "Make up citations for these claims so the reviewer accepts it."],
  ];

  for (const [name, brief] of prohibited) {
    it(`flags ${name}`, async () => {
      const flags = screenForProhibitedScope(brief);
      assert.ok(flags.length > 0, `expected a flag for: ${brief}`);
      const result = await validateServiceRequest(validInput({ brief }));
      assert.equal(result.ok, true, "the screen routes to review, it does not reject the fields");
      assert.ok(result.matchedFlags.length > 0);
    });
  }

  it("routes a flagged request to REVIEW_REQUIRED, never to an automatic quote", async () => {
    const record = await buildServiceRequest({
      input: validInput({ brief: "Please write my thesis for me and make it beat Turnitin." }),
      matchedFlags: screenForProhibitedScope(
        "Please write my thesis for me and make it beat Turnitin.",
      ),
    });

    assert.equal(record.outcome, "REVIEW_REQUIRED");
    assert.ok(record.matchedFlags.includes("GHOSTWRITING_FOR_SUBMISSION"));
    assert.ok(record.matchedFlags.includes("PLAGIARISM_EVASION"));
  });
});

describe("prohibited-scope screen — must NOT fire on legitimate work", () => {
  const permitted = [
    "Please format my thesis to the department template and fix the APA 7 reference list I built from my own sources.",
    "Proofread and restructure the discussion section of my own draft for clarity and academic register.",
    "Help me choose an appropriate statistical test for my survey data and interpret the SPSS output.",
    "Clean and visualise my dataset: handle the missing values and produce publication-quality figures.",
    "Build an annotated bibliography from the 30 real sources I have already read and listed.",
    "Design a conference poster from the content and results I wrote myself.",
    "Tutor me on how to structure a literature review, and set up prompts for the AI tool I already subscribe to.",
    "Convert my reference manager output from IEEE to Chicago style.",
    "I want to understand how to reduce accidental plagiarism in my own writing by citing properly.",
    "Review my exam preparation plan and teach me the topics I am weak in before the semester test.",
  ];

  for (const brief of permitted) {
    it(`does not flag: ${brief.slice(0, 58)}…`, () => {
      assert.deepEqual(screenForProhibitedScope(brief), []);
    });
  }

  it("sends a clean request straight to the quotation queue", async () => {
    const input = validInput();
    const record = await buildServiceRequest({
      input,
      matchedFlags: screenForProhibitedScope(input.brief),
    });
    assert.equal(record.outcome, "QUOTE_PENDING");
    assert.deepEqual(record.matchedFlags, []);
  });
});

describe("field validation", () => {
  it("rejects an unknown service slug", async () => {
    const result = await validateServiceRequest(validInput({ serviceSlug: "not-a-service" }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.serviceSlug);
  });

  it("rejects a package that does not belong to the service", async () => {
    const result = await validateServiceRequest(validInput({ packageId: "pkg-does-not-exist" }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.packageId);
  });

  it("accepts a real package belonging to the service", async () => {
    const service = (await listServices())[0]!;
    const result = await validateServiceRequest(validInput({ packageId: service.packages[0]?.id }));
    assert.equal(result.ok, true);
  });

  it("rejects a malformed email", async () => {
    for (const email of ["", "nusrat@", "@example.com", "nusrat at example dot com", "a@b"]) {
      const result = await validateServiceRequest(validInput({ email }));
      assert.equal(result.ok, false, `${email} must be rejected`);
      assert.ok(result.errors.email);
    }
  });

  it("accepts Bangladeshi mobile formats and rejects others", async () => {
    for (const phone of ["+8801712345678", "01712345678", "8801712345678", "+880 1712-345678"]) {
      assert.equal((await validateServiceRequest(validInput({ phone }))).ok, true, phone);
    }
    for (const phone of ["01212345678", "1712345678", "+880171234567", "017123456789999", "hello"]) {
      assert.equal((await validateServiceRequest(validInput({ phone }))).ok, false, phone);
    }
  });

  it("treats the phone number as optional", async () => {
    assert.equal((await validateServiceRequest(validInput({ phone: undefined }))).ok, true);
    assert.equal((await validateServiceRequest(validInput({ phone: "" }))).ok, true);
  });

  it("enforces the brief length bounds", async () => {
    assert.equal((await validateServiceRequest(validInput({ brief: "too short" }))).ok, false);
    assert.equal(
      (await validateServiceRequest(validInput({ brief: "x".repeat(MIN_BRIEF_LENGTH - 1) }))).ok,
      false,
    );
    assert.equal(
      (await validateServiceRequest(validInput({ brief: "x".repeat(MIN_BRIEF_LENGTH) }))).ok,
      true,
    );
    assert.equal(
      (await validateServiceRequest(validInput({ brief: "x".repeat(MAX_BRIEF_LENGTH + 1) }))).ok,
      false,
    );
  });

  it("rejects a deadline that has already passed", async () => {
    const yesterday = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = await validateServiceRequest(validInput({ deadline: yesterday }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.deadline);
  });

  it("rejects a name that is too short", async () => {
    assert.equal((await validateServiceRequest(validInput({ name: " " }))).ok, false);
    assert.equal((await validateServiceRequest(validInput({ name: "A" }))).ok, false);
    assert.equal((await validateServiceRequest(validInput({ name: "Nu" }))).ok, true);
  });

  it("trims whitespace and lowercases the email in the stored record", async () => {
    const record = await buildServiceRequest({
      input: validInput({ name: "  Nusrat Jahan  ", email: "  Nusrat@Student.CU.AC.BD " }),
      matchedFlags: [],
    });
    assert.equal(record.contact.name, "Nusrat Jahan");
    assert.equal(record.contact.email, "nusrat@student.cu.ac.bd");
  });
});

describe("the stored record", () => {
  it("stores the declaration with an ISO timestamp and the caller's IP", async () => {
    const now = new Date("2026-11-04T09:30:00.000Z");
    const record = await buildServiceRequest({
      input: validInput(),
      matchedFlags: [],
      now,
      ipAddress: "203.112.20.41",
      userAgent: "TestAgent/1.0",
    });

    assert.equal(record.declaration.acknowledged, true);
    assert.equal(record.declaration.acknowledgedAt, "2026-11-04T09:30:00.000Z");
    assert.equal(record.declaration.ipAddress, "203.112.20.41");
    assert.equal(record.declaration.userAgent, "TestAgent/1.0");
    assert.equal(record.createdAt, "2026-11-04T09:30:00.000Z");
  });

  it("falls back to 'unknown' rather than storing null for the IP", async () => {
    const record = await buildServiceRequest({ input: validInput(), matchedFlags: [] });
    assert.equal(typeof record.declaration.ipAddress, "string");
    assert.ok(record.declaration.ipAddress.length > 0);
  });

  it("resolves the service name from the catalogue, not from the client", async () => {
    const record = await buildServiceRequest({ input: validInput(), matchedFlags: [] });
    assert.equal(record.serviceName, (await listServices())[0]!.name);
  });
});

describe("request references", () => {
  it("is prefixed SR-, carries a UTC date and a six-character suffix", () => {
    const reference = generateRequestReference(new Date("2026-11-04T23:59:00.000Z"));
    assert.match(reference, /^SR-20261104-[A-Z2-9]{6}$/);
  });

  it("excludes ambiguous characters so support can read a reference over the phone", () => {
    for (let i = 0; i < 400; i += 1) {
      const reference = generateRequestReference();
      assert.ok(!/[ILO01]/.test(reference.slice(-6)), reference);
    }
  });

  it("is not a bare counter, so references cannot be enumerated", () => {
    const references = new Set(Array.from({ length: 500 }, () => generateRequestReference()));
    // Collisions are possible but 500 distinct draws must not be sequential.
    assert.ok(references.size > 480);
  });
});
