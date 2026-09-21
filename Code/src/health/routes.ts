import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context";
import { AppError } from "../shared/errors";
import { currentVersion } from "../shared/db";
import { pingPostgres } from "../shared/postgres";

/**
 * Registers the readiness probe. It actually queries the database — whichever
 * driver is active — so a broken/unreachable connection shows up here
 * instead of in the first real request. Used by docker compose's
 * `HEALTHCHECK` and by the CI pipeline.
 *
 * @param app the Fastify instance to register the route on
 * @param ctx the shared app context (its database is queried directly)
 */
export function registerHealthRoute(app: FastifyInstance, ctx: AppContext): void {
  app.get("/health", async () => {
    if (ctx.db.kind === "sqlite") {
      let row: { result: number } | null;
      try {
        row = ctx.db.sqlite.query<{ result: number }, []>("SELECT 1 AS result").get();
      } catch {
        // A closed connection or a broken driver throws rather than
        // returning an empty result; both mean the same thing here.
        throw AppError.unavailable("The database did not answer as expected.");
      }
      if (row?.result !== 1) {
        throw AppError.unavailable("The database did not answer as expected.");
      }
      return { status: "ok", database: "ok", schemaVersion: currentVersion(ctx.db.sqlite) };
    }

    const ok = await pingPostgres(ctx.db.sql).catch(() => false);
    if (!ok) {
      throw AppError.unavailable("The database did not answer as expected.");
    }
    // Postgres migrations aren't set up yet (see shared/postgres.ts), so
    // there is no schema version to report for this driver yet.
    return { status: "ok", database: "ok" };
  });
}
