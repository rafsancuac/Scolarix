/**
 * Local development PostgreSQL — no Docker, no admin rights.
 *
 * Runs a real PostgreSQL server from the `embedded-postgres` npm package with
 * its data directory in `packages/database/.pgdata` (gitignored). This is for
 * development and tests only; production uses managed PostgreSQL.
 *
 *   npm run db:dev            # start (foreground; Ctrl+C stops it cleanly)
 *
 * Credentials below are local-only throwaway values bound to 127.0.0.1 and
 * match `.env.example`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import EmbeddedPostgres from "embedded-postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "..", ".pgdata");
const port = Number(process.env.DEV_DB_PORT ?? 5432);
const database = "marketplace";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "marketplace",
  password: "marketplace",
  port,
  persistent: true,
  onLog: () => {},
  onError: (e) => console.error("[pg]", String(e).slice(0, 300)),
});

const fresh = !fs.existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase(database);

console.log(`PostgreSQL ready on 127.0.0.1:${port}/${database} (data: ${dataDir})`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
