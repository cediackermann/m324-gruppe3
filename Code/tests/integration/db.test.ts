import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { migrate } from "../../src/shared/db";
import type { Migration } from "../../src/shared/migrations";
import { openTestDatabase, resetDatabase } from "../helpers/test-db";

/**
 * A tiny example migration, standing in for whatever a feature module adds.
 * Keeps these tests independent of any real table a module happens to define.
 */
const EXAMPLE_MIGRATIONS: Migration[] = [
  {
    name: "001_create_example_items",
    sql: "CREATE TABLE example_items (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
  },
];

const sql = openTestDatabase();

beforeEach(() => resetDatabase(sql));
afterAll(() => sql.close());

/** Lists the tables of the test database, in alphabetical order. */
async function tableNames(): Promise<string[]> {
  const rows: { table_name: string }[] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  return rows.map((row) => row.table_name);
}

describe("migrate", () => {
  /**
   * Happy path: a fresh database applies every given migration once.
   *
   * @expected the table exists and the names of all migrations are returned
   */
  test("applies all pending migrations on a fresh database", async () => {
    const applied = await migrate(sql, EXAMPLE_MIGRATIONS);

    expect(applied).toEqual(["001_create_example_items"]);
    expect(await tableNames()).toEqual(["example_items", "schema_migrations"]);
  });

  /**
   * Idempotence: running the same migrations again must not apply anything a
   * second time. This is what makes it safe to restart the app.
   *
   * @expected the second call applies nothing
   */
  test("is a no-op when everything is already applied", async () => {
    await migrate(sql, EXAMPLE_MIGRATIONS);

    expect(await migrate(sql, EXAMPLE_MIGRATIONS)).toEqual([]);
  });

  /**
   * The scenario of a new release: a database that already holds data gets a
   * migration that did not exist in the previous version. Only the new
   * migration must run, and the existing rows must survive it.
   *
   * @expected only the added migration runs and the stored row is kept
   */
  test("applies only new migrations and keeps existing data", async () => {
    await migrate(sql, EXAMPLE_MIGRATIONS);
    await sql`INSERT INTO example_items (id, name) VALUES ('i1', 'first')`;

    const applied = await migrate(sql, [
      ...EXAMPLE_MIGRATIONS,
      {
        name: "002_add_note",
        sql: "ALTER TABLE example_items ADD COLUMN note TEXT",
      },
    ]);

    expect(applied).toEqual(["002_add_note"]);
    expect([...(await sql`SELECT id, name, note FROM example_items`)]).toEqual([
      { id: "i1", name: "first", note: null },
    ]);
  });

  /**
   * A broken migration must not be recorded, otherwise the next release
   * would skip it and the schema would silently drift.
   *
   * @expected the call rejects and only the earlier migration is recorded
   */
  test("does not record a migration that fails", async () => {
    await migrate(sql, EXAMPLE_MIGRATIONS);

    await expect(
      migrate(sql, [
        ...EXAMPLE_MIGRATIONS,
        {
          name: "002_broken",
          sql: "ALTER TABLE does_not_exist ADD COLUMN nope TEXT",
        },
      ]),
    ).rejects.toThrow();
    expect([...(await sql`SELECT name FROM schema_migrations`)]).toEqual([
      { name: "001_create_example_items" },
    ]);
  });
});
