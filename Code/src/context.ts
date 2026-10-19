import type { FastifyInstance } from "fastify";
import type { Db } from "./shared/db";

/**
 * Infrastructure that every feature module shares. It is built by
 * {@link buildApp} in `app.ts` and handed to each module, so modules never
 * reach for globals like `crypto.randomUUID()` or `new Date()` directly.
 * Tests can therefore make ids and timestamps deterministic.
 */
export interface AppContext {
  /** The migrated Postgres database. Repositories run their queries against it. */
  db: Db;
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
 * `repository.ts` (an interface plus its Postgres implementation, so unit
 * tests can swap in a fake). Only code shared by every endpoint — `app.ts`,
 * `server.ts`, `context.ts`, `error-handling.ts`, `shared/` — stays flat at
 * the top of `src/`, because it isn't itself an endpoint. `src/health/
 * routes.ts` follows the same pattern; it just has no service or
 * repository layer because it reads `ctx.db` directly.
 *
 * @example
 * // src/bikes/routes.ts
 * export const bikesModule: AppModule = (app, ctx) => {
 *   const service = new BikeService(new PostgresBikeRepository(ctx.db), ...);
 *   app.post("/bikes", async (req, reply) => reply.status(201).send(await service.create(req.body)));
 * };
 */
export type AppModule = (app: FastifyInstance, ctx: AppContext) => void;
