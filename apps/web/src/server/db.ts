import "server-only";

import { PrismaClient } from "@marketplace/database";

/**
 * One PrismaClient per server process (hot-reload safe). Only ever imported
 * from server code; `server-only` makes a client-bundle import a build error.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.__prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = db;
