import { describe, expect, test } from "bun:test";
import { createDatabase, ping } from "../../src/shared/db";
import { fakeSql } from "../helpers/fake-sql";

/**
 * Unit tests for the database helpers that need no running Postgres.
 * Migrations against a real database are covered in
 * `tests/integration/db.test.ts`.
 */
describe("createDatabase", () => {
  /**
   * Happy path: given a connection string, a usable client comes back. This
   * does not open a real connection — `Bun.sql` connects lazily on the
   * first query — so no network/Postgres instance is needed here.
   *
   * @expected a callable client (usable as a tagged template)
   */
  test("returns a callable SQL client for a connection string", () => {
    const sql = createDatabase("postgres://user:pass@localhost:5432/app");

    expect(typeof sql).toBe("function");
  });
});

describe("ping", () => {
  /**
   * Happy path: a query that resolves with `result: 1` means the database
   * answered as expected.
   *
   * @expected true
   */
  test("returns true when the query resolves with result 1", async () => {
    expect(await ping(fakeSql(() => [{ result: 1 }]))).toBe(true);
  });

  /**
   * Sad path: an empty result set (e.g. a broken query) must not be
   * mistaken for success.
   *
   * @expected false, not a thrown error
   */
  test("returns false when the query resolves with no rows", async () => {
    expect(await ping(fakeSql(() => []))).toBe(false);
  });

  /**
   * Sad path: a connection failure rejects the query; `ping` itself does not
   * swallow that — callers (like the health route) decide how to handle it.
   *
   * @expected the rejection propagates
   */
  test("propagates a connection failure instead of hiding it", async () => {
    const sql = fakeSql(() => {
      throw new Error("connection refused");
    });

    await expect(ping(sql)).rejects.toThrow("connection refused");
  });
});
