import { describe, expect, test } from "bun:test";
import type { SQL } from "bun";
import { createPostgresDatabase, pingPostgres } from "../../src/shared/postgres";

/**
 * A minimal stand-in for Bun's `SQL` tagged-template client, just enough to
 * exercise `pingPostgres`'s own logic without a real Postgres connection.
 *
 * @param respond what the "query" resolves to, or a function to throw instead
 */
function fakeSql(respond: () => unknown[]): SQL {
  return (async () => respond()) as unknown as SQL;
}

describe("createPostgresDatabase", () => {
  /**
   * Happy path: given a connection string, a usable client comes back. This
   * does not open a real connection — `Bun.sql` connects lazily on the
   * first query — so no network/Postgres instance is needed here.
   *
   * @expected a callable client (usable as a tagged template)
   */
  test("returns a callable SQL client for a connection string", () => {
    const sql = createPostgresDatabase("postgres://user:pass@localhost:5432/app");

    expect(typeof sql).toBe("function");
  });
});

describe("pingPostgres", () => {
  /**
   * Happy path: a query that resolves with `result: 1` means the database
   * answered as expected.
   *
   * @expected true
   */
  test("returns true when the query resolves with result 1", async () => {
    const sql = fakeSql(() => [{ result: 1 }]);

    expect(await pingPostgres(sql)).toBe(true);
  });

  /**
   * Sad path: an empty result set (e.g. a broken query) must not be
   * mistaken for success.
   *
   * @expected false, not a thrown error
   */
  test("returns false when the query resolves with no rows", async () => {
    const sql = fakeSql(() => []);

    expect(await pingPostgres(sql)).toBe(false);
  });

  /**
   * Sad path: a connection failure rejects the query; `pingPostgres` itself
   * does not swallow that — callers (like the health route) decide how to
   * handle it.
   *
   * @expected the rejection propagates
   */
  test("propagates a connection failure instead of hiding it", async () => {
    const sql = fakeSql(() => {
      throw new Error("connection refused");
    });

    await expect(pingPostgres(sql)).rejects.toThrow("connection refused");
  });
});
