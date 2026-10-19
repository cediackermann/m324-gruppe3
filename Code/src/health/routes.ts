import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context";
import { AppError } from "../shared/errors";
import { ping } from "../shared/db";

/**
 * Registers the readiness probe. It actually queries the database, so a
 * broken/unreachable connection shows up here instead of in the first real
 * request. Used by docker compose's `HEALTHCHECK`, the hosting platform and
 * the CI pipeline.
 *
 * @param app the Fastify instance to register the route on
 * @param ctx the shared app context (its database is queried directly)
 */
export function registerHealthRoute(
  app: FastifyInstance,
  ctx: AppContext,
): void {
  app.get("/health", async () => {
    const ok = await ping(ctx.db).catch(() => false);
    if (!ok) {
      throw AppError.unavailable("The database did not answer as expected.");
    }
    return { status: "ok", database: "ok" };
  });
}
