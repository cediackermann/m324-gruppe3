import { SQL } from "bun";
import type { Migration } from "./migrations";

/**
 * Opens a Postgres connection via Bun's built-in `Bun.sql` client. Used in
 * production (Vercel + Neon/Vercel Postgres), where the filesystem is
 * read-only/ephemeral and `bun:sqlite`'s local file cannot persist anything.
 *
 * Service-specific migrations are applied by {@link migratePostgres}.
 *
 * @param connectionString a `postgres://` URL, e.g. from Neon/Vercel Postgres
 * @returns the Bun SQL client, usable as a tagged template: `` sql`...` ``
 */
export function createPostgresDatabase(connectionString: string): SQL {
  return new SQL(connectionString);
}

/** Applies each service migration once, together with its version record. */
export async function migratePostgres(
  sql: SQL,
  migrations: Migration[],
): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)`;
  await sql.begin(async (tx) => {
    const rows = await tx`SELECT name FROM schema_migrations`;
    const applied = new Set(rows.map((row: { name: string }) => row.name));
    for (const migration of migrations) {
      if (!applied.has(migration.name)) {
        await tx.unsafe(migration.sql);
        await tx`INSERT INTO schema_migrations (name) VALUES (${migration.name})`;
      }
    }
  });
}

/**
 * Checks whether the Postgres connection actually answers a query, for the
 * readiness probe.
 *
 * @param sql the client returned by {@link createPostgresDatabase}
 * @returns true if the database answered as expected
 */
export async function pingPostgres(sql: SQL): Promise<boolean> {
  const rows = await sql`SELECT 1 AS result`;
  return rows[0]?.result === 1;
}
