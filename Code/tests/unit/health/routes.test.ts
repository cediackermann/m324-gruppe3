import { describe, expect, test } from "bun:test";
import Fastify from "fastify";
import type { SQL } from "bun";
import { registerHealthRoute } from "../../../src/health/routes";
import { registerErrorHandling } from "../../../src/error-handling";
import { createDatabase } from "../../../src/shared/db";
import type { AppContext } from "../../../src/context";

/**
 * Builds a minimal Fastify app with only the health route and the shared
 * error handling, so these tests exercise `/health` in isolation.
 */
function buildHealthOnlyApp(ctx: AppContext) {
  const app = Fastify({ logger: false });
  registerErrorHandling(app);
  registerHealthRoute(app, ctx);
  return app;
}

/**
 * A minimal stand-in for Bun's `SQL` tagged-template client, just enough for
 * the health route to call it. Avoids needing a real Postgres connection in
 * a unit test.
 *
 * @param respond what the "query" resolves to, or a function to throw instead
 */
function fakeSql(respond: () => Array<{ result: number }>): SQL {
  const tag = (async () => respond()) as unknown as SQL;
  return tag;
}

describe("registerHealthRoute (sqlite driver)", () => {
  /**
   * Happy path: a working, migrated database answers with status ok and the
   * current schema version.
   *
   * @expected status 200 and `{ status: "ok", database: "ok", schemaVersion }`
   */
  test("returns 200 with the schema version when the database answers", async () => {
    const db = createDatabase(":memory:");
    const app = buildHealthOnlyApp({
      db: { kind: "sqlite", sqlite: db },
      generateId: () => "id",
      now: () => new Date(),
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<Record<string, unknown>>()).toEqual({
      status: "ok",
      database: "ok",
      schemaVersion: 0,
    });
    await app.close();
  });

  /**
   * Sad path: a closed/unreachable database must surface as a 503 in the
   * shared error format, not as an unhandled crash.
   *
   * @expected status 503 and code SERVICE_UNAVAILABLE
   */
  test("returns 503 when the database cannot be queried", async () => {
    const db = createDatabase(":memory:");
    db.close();
    const app = buildHealthOnlyApp({
      db: { kind: "sqlite", sqlite: db },
      generateId: () => "id",
      now: () => new Date(),
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "SERVICE_UNAVAILABLE",
    );
    await app.close();
  });
});

describe("registerHealthRoute (postgres driver)", () => {
  /**
   * Happy path: a reachable Postgres connection answers with status ok. No
   * schema version is reported for this driver yet (see shared/postgres.ts).
   *
   * @expected status 200 and `{ status: "ok", database: "ok" }`
   */
  test("returns 200 when the database answers", async () => {
    const app = buildHealthOnlyApp({
      db: { kind: "postgres", sql: fakeSql(() => [{ result: 1 }]) },
      generateId: () => "id",
      now: () => new Date(),
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<Record<string, unknown>>()).toEqual({
      status: "ok",
      database: "ok",
    });
    await app.close();
  });

  /**
   * Sad path: an unreachable Postgres connection must surface as a 503, the
   * same as the SQLite driver, so callers don't need to care which is active.
   *
   * @expected status 503 and code SERVICE_UNAVAILABLE
   */
  test("returns 503 when the connection fails", async () => {
    const app = buildHealthOnlyApp({
      db: {
        kind: "postgres",
        sql: fakeSql(() => {
          throw new Error("connection refused");
        }),
      },
      generateId: () => "id",
      now: () => new Date(),
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "SERVICE_UNAVAILABLE",
    );
    await app.close();
  });
});
