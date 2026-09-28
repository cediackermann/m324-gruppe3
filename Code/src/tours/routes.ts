import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppModule } from "../context";
import { parseOrThrow } from "../shared/validation";
import { createBikeLookup } from "./bike-client";
import { PostgresTourRepository, SqliteTourRepository } from "./repository";
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

export function createToursModule(bikeServiceUrl: string): AppModule {
  return (app, ctx) => {
    const repository =
      ctx.db.kind === "sqlite"
        ? new SqliteTourRepository(ctx.db.sqlite)
        : new PostgresTourRepository(ctx.db.sql);
    registerTourRoutes(
      app,
      new TourService(
        repository,
        createBikeLookup(bikeServiceUrl),
        ctx.generateId,
        ctx.now,
      ),
    );
  };
}
