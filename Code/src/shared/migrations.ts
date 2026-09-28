/**
 * Ordered database migrations.
 *
 * Each service supplies its own migration list when opening its database.
 * The default list is empty for callers that only need the shared platform.
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
 * // passed to createDatabase(path, bikeMigrations) by the bike service
 */
export interface Migration {
  /** Short description, shown in the log when the migration runs. */
  name: string;
  /** The SQL applied by this migration. */
  sql: string;
}

/**
 * Default migrations for a platform-only database.
 */
export const MIGRATIONS: Migration[] = [];
