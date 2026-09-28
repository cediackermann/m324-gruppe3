import type { FastifyInstance } from "fastify";
import type { AppModule } from "../context";
import { parseOrThrow } from "../shared/validation";
import { z } from "zod";
import { PostgresBikeRepository, SqliteBikeRepository } from "./repository";
import { BikeService } from "./service";

/** Registers the bike endpoints with an injectable service. */
export function registerBikeRoutes(
  app: FastifyInstance,
  service: BikeService,
): void {
  app.post("/bikes", async (request, reply) => {
    const bike = await service.create(request.body);
    return reply.status(201).send(bike);
  });

  app.get("/bikes", async (request) => {
    parseOrThrow(z.strictObject({}), request.query, "Invalid bike query.");
    const bikes = await service.list();
    return bikes.length === 0
      ? { bikes, message: "No bikes have been registered yet." }
      : { bikes };
  });
}

export const bikesModule: AppModule = (app, ctx) => {
  const repository =
    ctx.db.kind === "sqlite"
      ? new SqliteBikeRepository(ctx.db.sqlite)
      : new PostgresBikeRepository(ctx.db.sql);
  registerBikeRoutes(app, new BikeService(repository, ctx.generateId, ctx.now));
};
