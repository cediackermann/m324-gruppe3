import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, rmSync } from "node:fs";
import { createDatabase, currentVersion, migrate } from "../../src/shared/db";
import type { Migration } from "../../src/shared/migrations";

/**
 * A tiny example migration, standing in for whatever a feature module adds
 * to `src/shared/migrations.ts`. Keeps these tests independent of any real
 * table a module happens to define.
 */
const EXAMPLE_MIGRATIONS: Migration[] = [
  {
    name: "001_create_example_items",
    sql: `
      CREATE TABLE example_items (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );
    `,
  },
];

/**
 * Lists the application tables of a database, ignoring SQLite's internal
 * bookkeeping tables.
 *
 * @param db the database to inspect
 * @returns the table names in alphabetical order
 */
function tableNames(db: Database): string[] {
  return db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
}

describe("createDatabase", () => {
  /**
   * Happy path: a fresh in-memory database opens without any migration
   * defined yet (the platform ships with an empty migration list; feature
   * modules add their own).
   *
   * @expected no application tables and schema version 0
   */
  test("opens an empty, migrated database when no migrations are defined", () => {
    const db = createDatabase(":memory:");

    expect(tableNames(db)).toEqual([]);
    expect(currentVersion(db)).toBe(0);
    db.close();
  });

  /**
   * Regression: on a fresh checkout, `data/` does not exist yet. SQLite does
   * not create the parent directory of its file itself, so `createDatabase`
   * has to do that before opening the file.
   *
   * @expected the directory and the database file are created
   */
  test("creates the parent directory of the database file if missing", () => {
    const dir = `${import.meta.dir}/../../.tmp-db-test-${Date.now()}`;
    const path = `${dir}/nested/app.db`;
    expect(existsSync(dir)).toBe(false);

    const db = createDatabase(path);

    expect(existsSync(path)).toBe(true);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  /**
   * Isolation: two in-memory databases must not share any state, otherwise
   * tests would influence each other.
   *
   * @expected a row written to the first database is invisible in the second
   */
  test("gives every caller its own in-memory database", () => {
    const first = createDatabase(":memory:");
    const second = createDatabase(":memory:");
    migrate(first, EXAMPLE_MIGRATIONS);
    migrate(second, EXAMPLE_MIGRATIONS);

    first.run(
      "INSERT INTO example_items (id, name, created_at) VALUES (?, ?, ?)",
      ["i1", "first", "2026-01-15T10:00:00.000Z"],
    );

    expect(first.query("SELECT id FROM example_items").all()).toHaveLength(1);
    expect(second.query("SELECT id FROM example_items").all()).toHaveLength(0);
    first.close();
    second.close();
  });
});

describe("migrate", () => {
  /**
   * Happy path: a fresh database applies every given migration once.
   *
   * @expected the table exists and the names of all migrations are returned
   */
  test("applies all pending migrations on a fresh database", () => {
    const db = createDatabase(":memory:");

    const applied = migrate(db, EXAMPLE_MIGRATIONS);

    expect(applied).toEqual(
      EXAMPLE_MIGRATIONS.map((migration) => migration.name),
    );
    expect(tableNames(db)).toEqual(["example_items"]);
    db.close();
  });

  /**
   * Idempotence: running the same migrations again must not apply anything a
   * second time. This is what makes it safe to start the app repeatedly
   * against the same database file.
   *
   * @expected the second call applies nothing and leaves the version untouched
   */
  test("is a no-op when everything is already applied", () => {
    const db = createDatabase(":memory:");
    migrate(db, EXAMPLE_MIGRATIONS);

    const applied = migrate(db, EXAMPLE_MIGRATIONS);

    expect(applied).toEqual([]);
    expect(currentVersion(db)).toBe(EXAMPLE_MIGRATIONS.length);
    db.close();
  });
});

describe("migrate on an existing database (release upgrade)", () => {
  /**
   * The scenario of a new release: a database that already holds data gets a
   * migration that did not exist in the previous version. Only the new
   * migration must run, and the existing rows must survive it.
   *
   * @expected only the added migration is applied and the stored row is
   *   still readable, now with the column added by the new migration
   */
  test("applies only new migrations and keeps existing data", () => {
    const db = createDatabase(":memory:");
    migrate(db, EXAMPLE_MIGRATIONS);
    db.run(
      "INSERT INTO example_items (id, name, created_at) VALUES (?, ?, ?)",
      ["i1", "first", "2026-01-15T10:00:00.000Z"],
    );

    // Stands in for a migration a later release adds to the list.
    const nextRelease: Migration[] = [
      ...EXAMPLE_MIGRATIONS,
      {
        name: "002_add_note",
        sql: "ALTER TABLE example_items ADD COLUMN note TEXT",
      },
    ];
    const applied = migrate(db, nextRelease);

    expect(applied).toEqual(["002_add_note"]);
    expect(currentVersion(db)).toBe(nextRelease.length);
    expect(db.query("SELECT id, name, note FROM example_items").all()).toEqual([
      { id: "i1", name: "first", note: null },
    ]);
    db.close();
  });

  /**
   * A broken migration must not advance the schema version, otherwise the
   * next release would skip it and the schema would silently drift.
   *
   * @expected the call throws and the version stays where it was
   */
  test("does not advance the version when a migration fails", () => {
    const db = createDatabase(":memory:");
    migrate(db, EXAMPLE_MIGRATIONS);
    const broken: Migration[] = [
      ...EXAMPLE_MIGRATIONS,
      {
        name: "002_broken",
        sql: "ALTER TABLE does_not_exist ADD COLUMN nope TEXT",
      },
    ];

    expect(() => migrate(db, broken)).toThrow();
    expect(currentVersion(db)).toBe(EXAMPLE_MIGRATIONS.length);
    db.close();
  });
});
