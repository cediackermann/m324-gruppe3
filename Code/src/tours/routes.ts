import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppModule } from "../context";
import { parseOrThrow } from "../shared/validation";
import { PostgresBikeRepository } from "../bikes/repository";
import { PostgresTourRepository } from "./repository";
import { TourService } from "./service";

/** Registers the tour endpoints with an injectable service. */
export function registerTourRoutes(
  app: FastifyInstance,
  service: TourService,
): void {
  app.post("/tours", async (request, reply) => {
    const tour = await service.create(request.body);
    return reply.status(201).send(tour);
  });

  app.get("/tours", async (request) => {
    parseOrThrow(z.strictObject({}), request.query, "Invalid tour query.");
    const tours = await service.list();
    return tours.length === 0
      ? { tours, message: "No tours have been registered yet." }
      : { tours };
  });
}

/**
 * Registers the tour endpoints. Bikes live in the same database, so a tour's
 * bike is checked directly through the bike repository.
 */
export const toursModule: AppModule = (app, ctx) => {
  const bikes = new PostgresBikeRepository(ctx.db);
  registerTourRoutes(
    app,
    new TourService(
      new PostgresTourRepository(ctx.db),
      (bikeId) => bikes.exists(bikeId),
      ctx.generateId,
      ctx.now,
    ),
  );
};
