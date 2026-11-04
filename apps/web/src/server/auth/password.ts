/**
 * Password hashing — memory-hard scrypt from `node:crypto`.
 *
 * ADR-0015 records why this is scrypt rather than the Argon2id named in the
 * schema comment: Argon2 needs a native addon whose install script is blocked
 * in locked-down environments, while scrypt is memory-hard, ships with Node and
 * is accepted by OWASP's password-storage guidance. The stored format is
 * self-describing, so a later migration to Argon2id can verify old hashes and
 * rehash on login (see `needsRehash`).
 *
 * Format: `scrypt$N$r$p$<salt b64>$<hash b64>`
 */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

function derive(password: string, salt: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> {
  const options: ScryptOptions = {
    N: params.N,
    r: params.r,
    p: params.p,
    // 128 * N * r bytes is required; leave headroom above the default 32 MiB.
    maxmem: 128 * params.N * params.r * 2,
  };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Constant-time verification. Malformed hashes verify as `false`, never throw. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (![params.N, params.r, params.p].every((v) => Number.isInteger(v) && v > 0)) return false;
  // Refuse absurd cost parameters from a corrupted/hostile row (DoS guard).
  if (params.N > 2 ** 20 || params.r > 32 || params.p > 16) return false;
  try {
    const expected = Buffer.from(hashB64, "base64");
    const actual = await derive(password, Buffer.from(saltB64, "base64"), params);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  return !(
    parts[0] === "scrypt" &&
    Number(parts[1]) === PARAMS.N &&
    Number(parts[2]) === PARAMS.r &&
    Number(parts[3]) === PARAMS.p
  );
}

export interface PasswordCheck {
  ok: boolean;
  message?: string;
}

/**
 * Length-first policy (NIST 800-63B): no composition rules, but a minimum
 * length, a maximum that bounds hashing cost, and a short deny-list.
 */
export function checkPasswordPolicy(password: string, context: { email?: string; name?: string } = {}): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `Use at most ${PASSWORD_MAX_LENGTH} characters.` };
  }
  const lowered = password.toLowerCase();
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lowered.includes(local)) {
    return { ok: false, message: "Your password must not contain your email name." };
  }
  if (/^(.)\1+$/.test(password) || ["password1234", "123456789012", "qwertyuiop12"].includes(lowered)) {
    return { ok: false, message: "That password is too easy to guess. Choose a longer, less common one." };
  }
  return { ok: true };
}
