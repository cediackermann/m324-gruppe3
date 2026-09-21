/**
 * Ordered database migrations.
 *
 * This module is deliberately schema-agnostic: the backend here only
 * provides the platform (Fastify app, error handling, database, CI/CD).
 * The actual tables belong to the feature modules built on top of it
 * (bikes, tours, ...) and are added as migrations by whoever builds them.
 *
 * Each entry is applied exactly once, in order. The index of an applied
 * migration is stored in SQLite's `user_version` pragma, so the app knows
 * which migrations are already in place.
 *
 * Rules for the team:
 * - Never edit a migration that is already merged — append a new one.
 * - One migration may contain several statements.
 *
 * @example
 * // in a feature module, e.g. src/bikes/migrations.ts
 * export const bikeMigrations: Migration[] = [
 *   { name: "001_create_bikes", sql: "CREATE TABLE bikes (...)" },
 * ];
 * // registered once in src/shared/migrations.ts:
 * // export const MIGRATIONS: Migration[] = [...bikeMigrations, ...tourMigrations];
 */
export interface Migration {
  /** Short description, shown in the log when the migration runs. */
  name: string;
  /** The SQL applied by this migration. */
  sql: string;
}

/**
 * All migrations applied to the app's database, in order. Empty for now —
 * feature modules append their own migrations here once they exist.
 */
export const MIGRATIONS: Migration[] = [];
