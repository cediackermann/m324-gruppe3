import { buildApp } from "./app";
import type { AppDb } from "./context";
import { createDatabase } from "./shared/db";
import { createPostgresDatabase } from "./shared/postgres";

/**
 * Entry point of the real server. The only place that opens a port and the
 * only place that touches a real database (file or network); everything
 * else builds the app through `buildApp()` with a database of its own.
 *
 * Driver selection: `DATABASE_URL` set → Postgres (production, e.g. Vercel +
 * Neon/Vercel Postgres, whose filesystem cannot persist a SQLite file).
 * `DATABASE_URL` unset → local `bun:sqlite` file at `DATABASE_PATH`
 * (local dev, docker compose on a host with a volume).
 */
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const db: AppDb = process.env.DATABASE_URL
  ? { kind: "postgres", sql: createPostgresDatabase(process.env.DATABASE_URL) }
  : {
      kind: "sqlite",
      sqlite: createDatabase(process.env.DATABASE_PATH ?? "data/app.db"),
    };

const app = buildApp({
  db,
  logger: true,
  modules: [
    // Feature modules are registered here, e.g.:
    // bikesModule, toursModule
  ],
});

app.log.info(
  db.kind === "postgres"
    ? "Using Postgres database"
    : `Using SQLite database at ${process.env.DATABASE_PATH ?? "data/app.db"}`,
);

// Close the database cleanly on shutdown: flushes SQLite's WAL data /
// releases the Postgres connection pool on Ctrl+C or docker stop.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(async () => {
      if (db.kind === "sqlite") {
        db.sqlite.close();
      } else {
        await db.sql.close();
      }
      process.exit(0);
    });
  });
}

await app.listen({ port, host });
