/**
 * Deterministic, idempotent bootstrap of local accounts.
 *
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='long passphrase' npm run seed --workspace @marketplace/database
 *
 * - No password is ever hard-coded or committed. If SEED_ADMIN_PASSWORD is
 *   unset, a random one is generated and printed ONCE to this terminal.
 * - Refuses to run against a production database unless ALLOW_PRODUCTION_SEED=1.
 * - Re-running updates nothing for an existing user (it never resets a password).
 */

import { randomBytes, scrypt } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../generated/client");

const url = process.env.DATABASE_URL ?? "";
if (!url) throw new Error("DATABASE_URL is not set.");
if (/prod/i.test(url) && process.env.ALLOW_PRODUCTION_SEED !== "1") {
  throw new Error("Refusing to seed a database whose URL looks like production.");
}

// Must stay identical to apps/web/src/server/auth/password.ts (verified by the login flow).
const N = 2 ** 15, r = 8, p = 1;
const hash = (password) =>
  new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$")),
    );
  });

const db = new PrismaClient();

async function ensureUser({ email, name, role, password }) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { created: false, email };
  await db.user.create({
    data: { email, name, role, status: "ACTIVE", emailVerifiedAt: new Date(), passwordHash: await hash(password) },
  });
  return { created: true, email };
}

try {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) throw new Error("Set SEED_ADMIN_EMAIL.");
  let password = process.env.SEED_ADMIN_PASSWORD;
  const generated = !password;
  if (generated) password = randomBytes(18).toString("base64url");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  const result = await ensureUser({ email, name: "Platform Admin", role: "SUPER_ADMIN", password });
  console.log(result.created ? `Created SUPER_ADMIN ${result.email}` : `SUPER_ADMIN ${result.email} already exists (unchanged)`);
  if (result.created && generated) console.log(`Generated password (shown once): ${password}`);
} finally {
  await db.$disconnect();
}
