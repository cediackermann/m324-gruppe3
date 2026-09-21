import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext, AppDb, AppModule } from "./context";
import { registerErrorHandling } from "./error-handling";
import { registerHealthRoute } from "./health/routes";
import { createDatabase } from "./shared/db";

export type { AppContext, AppDb, AppModule } from "./context";

/** Options for {@link buildApp}. All of them are optional. */
export interface AppOptions {
  /** The feature modules to register. Defaults to none. */
  modules?: AppModule[];
  /**
   * The database to use. Defaults to a fresh in-memory SQLite database, so
   * a test that forgets to pass one still cannot touch the real data file
   * or a real Postgres connection.
   */
  db?: AppDb;
  /** Overrides the id generator, e.g. a counter in tests. */
  generateId?: () => string;
  /** Overrides the clock, e.g. a fixed date in tests. */
  now?: () => Date;
  /** Enables request logging. Off by default so tests stay quiet. */
  logger?: boolean;
}

/**
 * Builds the Fastify instance: shared error handling, the readiness probe,
 * and the given feature modules, all wired to one {@link AppContext}.
 *
 * It deliberately does NOT call `listen()`: tests drive the app with
 * `app.inject()` without opening a port, `src/server.ts` is the only place
 * that starts a real server.
 *
 * @param options modules and overridable infrastructure
 * @returns the configured, not yet listening Fastify instance
 */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  const context: AppContext = {
    db: options.db ?? { kind: "sqlite", sqlite: createDatabase(":memory:") },
    generateId: options.generateId ?? (() => crypto.randomUUID()),
    now: options.now ?? (() => new Date()),
  };

  registerErrorHandling(app);
  registerHealthRoute(app, context);

  for (const module of options.modules ?? []) {
    module(app, context);
  }

  return app;
}
