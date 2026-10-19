import { describe, expect, test } from "bun:test";
import Fastify from "fastify";
import { registerHealthRoute } from "../../../src/health/routes";
import { registerErrorHandling } from "../../../src/error-handling";
import type { AppContext } from "../../../src/context";
import { fakeSql } from "../../helpers/fake-sql";

/**
 * Builds a minimal Fastify app with only the health route and the shared
 * error handling, so these tests exercise `/health` in isolation.
 */
function buildHealthOnlyApp(ctx: AppContext, version?: string) {
  const app = Fastify({ logger: false });
  registerErrorHandling(app);
  registerHealthRoute(app, ctx, version);
  return app;
}

describe("registerHealthRoute", () => {
  /**
   * Happy path: a reachable Postgres connection answers with status ok.
   *
   * @expected status 200 and `{ status: "ok", database: "ok" }`
   */
  test("returns 200 when the database answers", async () => {
    const app = buildHealthOnlyApp({
      db: fakeSql(() => [{ result: 1 }]),
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
   * Happy path: when a version is configured, the probe reports it, so the
   * deployment pipeline can wait until the new commit is live.
   *
   * @expected status 200 and the configured version in the body
   */
  test("reports the running version when one is set", async () => {
    const app = buildHealthOnlyApp(
      {
        db: fakeSql(() => [{ result: 1 }]),
        generateId: () => "id",
        now: () => new Date(),
      },
      "abc123",
    );

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<Record<string, unknown>>()).toEqual({
      status: "ok",
      database: "ok",
      version: "abc123",
    });
    await app.close();
  });

  /**
   * Sad path: an unreachable Postgres connection must surface as a 503 in
   * the shared error format, not as an unhandled crash.
   *
   * @expected status 503 and code SERVICE_UNAVAILABLE
   */
  test("returns 503 when the connection fails", async () => {
    const app = buildHealthOnlyApp({
      db: fakeSql(() => {
        throw new Error("connection refused");
      }),
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
