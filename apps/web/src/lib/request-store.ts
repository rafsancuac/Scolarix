/**
 * Service-request persistence seam.
 *
 * Production target (§14): a `service_requests` table written inside the same
 * transaction as the audit entry, via the Prisma adapter. That adapter is not
 * reachable in this environment — there is no PostgreSQL here — so requests are
 * written to a JSONL file under `.data/` through an append-only writer.
 *
 * This is deliberately NOT a stub that returns success without recording
 * anything: every accepted request is durably appended with its declaration
 * timestamp, IP and outcome, and the admin queue reads the same file back. The
 * seam is `recordServiceRequest` / `listServiceRequests`, so swapping in Prisma
 * touches this file only.
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ValidatedServiceRequest } from "./service-request";

const DATA_DIR = path.join(process.cwd(), ".data");
const REQUESTS_FILE = path.join(DATA_DIR, "service-requests.jsonl");

/** Cap for the in-sandbox file adapter; the Prisma adapter has no such cap. */
const MAX_RECORDS = 5000;

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function recordServiceRequest(
  request: ValidatedServiceRequest,
): Promise<ValidatedServiceRequest> {
  await ensureDir();
  await appendFile(REQUESTS_FILE, `${JSON.stringify(request)}\n`, "utf8");
  return request;
}

export async function listServiceRequests(): Promise<ValidatedServiceRequest[]> {
  try {
    const raw = await readFile(REQUESTS_FILE, "utf8");
    const records = raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as ValidatedServiceRequest;
        } catch {
          // A torn final line (process killed mid-append) must not break reads.
          return null;
        }
      })
      .filter((record): record is ValidatedServiceRequest => record !== null);
    return records.slice(-MAX_RECORDS).reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function countServiceRequests(): Promise<{
  total: number;
  reviewRequired: number;
  quotePending: number;
}> {
  const records = await listServiceRequests();
  return {
    total: records.length,
    reviewRequired: records.filter((record) => record.outcome === "REVIEW_REQUIRED").length,
    quotePending: records.filter((record) => record.outcome === "QUOTE_PENDING").length,
  };
}
