import type { SQL } from "bun";
import { createDatabase } from "../../src/shared/db";

/**
 * Opens the integration test database from `TEST_DATABASE_URL`.
 *
 * It deliberately does not use `DATABASE_URL`: Bun loads `.env` for tests
 * too, and {@link resetDatabase} deletes everything, so a test run must never
 * reach the development or production database by accident.
 *
 * @returns the client for the test database
 */
export function openTestDatabase(): SQL {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Run `docker compose up -d db`, then " +
        "TEST_DATABASE_URL=postgres://app:app@localhost:5432/app_test bun test tests/integration",
    );
  }
  if (!new URL(url).pathname.includes("test")) {
    throw new Error(
      "TEST_DATABASE_URL must point to a database whose name contains 'test', because the tests delete all of its data.",
    );
  }
  return createDatabase(url);
}

/**
 * Drops every table, so each test starts from an empty, unmigrated database.
 *
 * @param sql the test database
 */
export async function resetDatabase(sql: SQL): Promise<void> {
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
}
