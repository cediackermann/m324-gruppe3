import type { FastifyInstance } from "fastify";
import type { SQL } from "bun";
import type { Db as SqliteDb } from "./shared/db";

/**
 * The database handed to feature modules through {@link AppContext}.
 *
 * There are two drivers, picked by `src/server.ts` from the environment:
 * - `"sqlite"` — a local `bun:sqlite` file. Used for local dev and every
 *   unit test, because it needs no external service and no network.
 * - `"postgres"` — a Bun `SQL` client (Neon/Vercel Postgres). Used in
 *   production, where the platform's filesystem is read-only/ephemeral
 *   (e.g. Vercel) and a local SQLite file cannot persist anything.
 *
 * A repository (or anything else reading `ctx.db`) switches on `kind` and
 * uses `sqlite` or `sql` accordingly; see `src/health/routes.ts` for the
 * pattern.
 */
export type AppDb =
  | { kind: "sqlite"; sqlite: SqliteDb }
  | { kind: "postgres"; sql: SQL };

/**
 * Infrastructure that every feature module shares. It is built by
 * {@link buildApp} in `app.ts` and handed to each module, so modules never
 * reach for globals like `crypto.randomUUID()` or `new Date()` directly.
 * Tests can therefore make ids and timestamps deterministic.
 */
export interface AppContext {
  /** The migrated database. Repositories run their queries against it. */
  db: AppDb;
  /** Generates the auto id of a new entity. */
  generateId: () => string;
  /** Returns the current time. */
  now: () => Date;
}

/**
 * A feature module (bikes, tours, health, ...). It registers its own routes
 * on the given Fastify instance and gets the shared {@link AppContext} for
 * its dependencies.
 *
 * Convention: every endpoint gets its own directory under `src/`, e.g.
 * `src/bikes/routes.ts` (this file) → `service.ts` (business logic) →
 * `repository.ts` (an interface, plus one implementation per {@link AppDb}
 * driver — e.g. `SqliteBikeRepository`/`PostgresBikeRepository` — so unit
 * tests can swap in a fake and production picks the real one based on
 * `ctx.db.kind`). Only code shared by every endpoint — `app.ts`,
 * `server.ts`, `context.ts`, `error-handling.ts`, `shared/` — stays flat at
 * the top of `src/`, because it isn't itself an endpoint. `src/health/
 * routes.ts` follows the same pattern; it just has no service or
 * repository layer because it reads `ctx.db` directly.
 *
 * @example
 * // src/bikes/routes.ts
 * export const bikesModule: AppModule = (app, ctx) => {
 *   const repo = ctx.db.kind === "sqlite"
 *     ? new SqliteBikeRepository(ctx.db.sqlite)
 *     : new PostgresBikeRepository(ctx.db.sql);
 *   const service = new BikeService(repo, ctx);
 *   app.post("/bikes", async (req, reply) => reply.status(201).send(await service.create(req.body)));
 * };
 */
export type AppModule = (app: FastifyInstance, ctx: AppContext) => void;
