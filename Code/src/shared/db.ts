import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MIGRATIONS, type Migration } from "./migrations";

/**
 * The database handle used across the app. It is `bun:sqlite`'s `Database`,
 * but modules should only depend on this alias, so swapping the driver later
 * touches one line.
 */
export type Db = Database;

/**
 * Opens a database, applies the connection settings and runs all pending
 * migrations.
 *
 * @param path file path of the database, or `":memory:"` for a throwaway
 *   database (used by every test, so tests never share state)
 * @returns the ready-to-use, migrated database handle
 */
export function createDatabase(path: string): Db {
  // SQLite does not create the parent directory of the file itself, so a
  // fresh checkout with no `data/` folder yet would fail right here.
  if (path !== ":memory:") {
    const dir = dirname(path);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(path, { create: true });

  // WAL keeps readers from blocking the writer; both pragmas have to be set
  // per connection, not once per file.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  migrate(db);
  return db;
}

/**
 * Applies every migration that has not run yet on this database.
 *
 * The number of applied migrations is stored in SQLite's `user_version`,
 * so calling this again on the same database is a no-op and a new release
 * only runs the migrations that were added since the last one. Existing rows
 * are never touched. Each migration runs inside a transaction together with
 * the version bump: if the SQL fails, the version is not advanced.
 *
 * @param db the database to migrate
 * @param migrations the migrations to apply; only overridden in tests
 * @returns the names of the migrations applied by this call
 */
export function migrate(db: Db, migrations: Migration[] = MIGRATIONS): string[] {
  const current = currentVersion(db);
  const applied: string[] = [];

  for (let index = current; index < migrations.length; index++) {
    const migration = migrations[index]!;
    const version = index + 1;

    db.transaction(() => {
      db.exec(migration.sql);
      // `user_version` cannot be set through a bound parameter; `version` is
      // a loop counter over our own migration list, never client input.
      db.exec(`PRAGMA user_version = ${version}`);
    })();

    applied.push(migration.name);
  }

  return applied;
}

/**
 * Reads how many migrations have been applied to this database.
 *
 * @param db the database to inspect
 * @returns the current schema version (0 for a fresh database)
 */
export function currentVersion(db: Db): number {
  const row = db.query<{ user_version: number }, []>("PRAGMA user_version").get();
  return row?.user_version ?? 0;
}
