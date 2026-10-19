import { SQL } from "bun";
import { MIGRATIONS, type Migration } from "./migrations";

/**
 * The database handle used across the app: Bun's built-in Postgres client
 * (`Bun.sql`). Modules should only depend on this alias, so swapping the
 * driver later touches one line.
 */
export type Db = SQL;

/**
 * Opens a Postgres connection. `Bun.sql` connects lazily on the first query,
 * so this does not touch the network yet.
 *
 * @param connectionString a `postgres://` URL, e.g. from Docker Compose or
 *   Neon (`?sslmode=require` for hosted databases)
 * @returns the client, usable as a tagged template: `` sql`...` ``
 */
export function createDatabase(connectionString: string): Db {
  return new SQL(connectionString);
}

/**
 * Applies every migration that has not run yet.
 *
 * Applied migrations are recorded by name in `schema_migrations`, so calling
 * this again is a no-op and a new release only runs the migrations that were
 * added since the last one. All pending migrations run in one transaction
 * together with their records: if one fails, none of them is recorded.
 *
 * @param sql the database to migrate
 * @param migrations the migrations to apply; only overridden in tests
 * @returns the names of the migrations applied by this call
 */
export async function migrate(
  sql: Db,
  migrations: Migration[] = MIGRATIONS,
): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)`;
  const applied: string[] = [];
  await sql.begin(async (tx) => {
    const rows = await tx`SELECT name FROM schema_migrations`;
    const done = new Set(rows.map((row: { name: string }) => row.name));
    for (const migration of migrations) {
      if (!done.has(migration.name)) {
        await tx.unsafe(migration.sql);
        await tx`INSERT INTO schema_migrations (name) VALUES (${migration.name})`;
        applied.push(migration.name);
      }
    }
  });
  return applied;
}

/**
 * Checks whether the connection actually answers a query, for the readiness
 * probe.
 *
 * @param sql the database to check
 * @returns true if the database answered as expected
 */
export async function ping(sql: Db): Promise<boolean> {
  const rows = await sql`SELECT 1 AS result`;
  return rows[0]?.result === 1;
}
