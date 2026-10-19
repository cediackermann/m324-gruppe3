import { bikeMigrations } from "../bikes/migrations";
import { tourMigrations } from "../tours/migrations";

/**
 * A database migration.
 *
 * Each entry is applied exactly once, in order. Applied migrations are
 * recorded by name in the `schema_migrations` table, so the app knows which
 * ones are already in place.
 *
 * Rules for the team:
 * - Never edit a migration that is already merged — append a new one.
 * - Names must be unique across all modules.
 * - One migration may contain several statements.
 *
 * @example
 * // in a feature module, e.g. src/bikes/migrations.ts
 * export const bikeMigrations: Migration[] = [
 *   { name: "001_create_bikes", sql: "CREATE TABLE bikes (...)" },
 * ];
 * // then appended to MIGRATIONS below
 */
export interface Migration {
  /** Unique name, stored once the migration has run. */
  name: string;
  /** The SQL applied by this migration. */
  sql: string;
}

/** Every migration of the app, in the order they are applied. */
export const MIGRATIONS: Migration[] = [...bikeMigrations, ...tourMigrations];
