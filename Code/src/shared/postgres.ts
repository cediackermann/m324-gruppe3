import { SQL } from "bun";

/**
 * Opens a Postgres connection via Bun's built-in `Bun.sql` client. Used in
 * production (Vercel + Neon/Vercel Postgres), where the filesystem is
 * read-only/ephemeral and `bun:sqlite`'s local file cannot persist anything.
 *
 * No migrations run here yet — this only proves connectivity for `/health`.
 * Once a feature module needs tables, add a Postgres migration runner here,
 * mirroring `shared/db.ts`'s SQLite one.
 *
 * @param connectionString a `postgres://` URL, e.g. from Neon/Vercel Postgres
 * @returns the Bun SQL client, usable as a tagged template: `` sql`...` ``
 */
export function createPostgresDatabase(connectionString: string): SQL {
  return new SQL(connectionString);
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
