import { describe, expect, test } from "bun:test";
import { buildApp, type AppModule } from "../../src/app";
import { MIGRATIONS } from "../../src/shared/migrations";

/**
 * Integration-level tests for `buildApp`: does it wire the pieces together
 * correctly (health route, error handling, modules, shared context)?
 * The error format itself is covered exhaustively in
 * `error-handling.test.ts`; the readiness probe in `health.test.ts`.
 */
describe("buildApp", () => {
  /**
   * Happy path: the app boots without any feature module and answers the
   * readiness probe, proving `registerHealthRoute` is wired up.
   *
   * @expected status 200, a reachable database and the current schema version
   */
  test("serves /health with a working database and no module registered", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<Record<string, unknown>>()).toEqual({
      status: "ok",
      database: "ok",
      schemaVersion: MIGRATIONS.length,
    });
    await app.close();
  });

  /**
   * Happy path: a feature module gets registered and receives the shared
   * context, so its ids and timestamps come from the injected stubs.
   *
   * @expected the route of the module answers with the stubbed id and date
   */
  test("registers a module and passes the shared context to it", async () => {
    const module: AppModule = (instance, ctx) => {
      instance.get("/demo", async () => ({
        id: ctx.generateId(),
        createdAt: ctx.now().toISOString(),
      }));
    };
    const app = buildApp({
      modules: [module],
      generateId: () => "fixed-id",
      now: () => new Date("2026-01-15T10:00:00.000Z"),
    });

    const response = await app.inject({ method: "GET", url: "/demo" });

    expect(response.json<Record<string, unknown>>()).toEqual({
      id: "fixed-id",
      createdAt: "2026-01-15T10:00:00.000Z",
    });
    await app.close();
  });

  /**
   * Sad path: `buildApp` must apply the shared error handling to routes
   * registered by feature modules too, not only to its own routes.
   *
   * @expected status 500 and the shared error format, not an unhandled crash
   */
  test("applies the shared error handling to a module's routes", async () => {
    const module: AppModule = (instance) => {
      instance.get("/crash", async () => {
        throw new Error("boom");
      });
    };
    const app = buildApp({ modules: [module] });

    const response = await app.inject({ method: "GET", url: "/crash" });

    expect(response.statusCode).toBe(500);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "INTERNAL_ERROR",
    );
    await app.close();
  });
});
