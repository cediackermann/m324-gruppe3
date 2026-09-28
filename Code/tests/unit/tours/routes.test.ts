import { describe, expect, test } from "bun:test";
import Fastify from "fastify";
import type { BikeLookup } from "../../../src/tours/bike-client";
import type { Tour } from "../../../src/tours/model";
import type { TourRepository } from "../../../src/tours/repository";
import { registerTourRoutes } from "../../../src/tours/routes";
import { TourService } from "../../../src/tours/service";
import { registerErrorHandling } from "../../../src/error-handling";
import { AppError } from "../../../src/shared/errors";

const input = {
  startLocation: "Bahnhofplatz, Niederhasli",
  arrivalLocation: "Dorfstrasse, Oberhasli",
  startsAt: "2026-10-01T09:00:00.000Z",
  endsAt: "2026-10-01T11:00:00.000Z",
  companion: "Sam Meyer",
  bikeId: "bike-1",
};

function buildTourApp(
  repository: TourRepository,
  bikeExists: BikeLookup = async () => true,
) {
  const app = Fastify();
  registerErrorHandling(app);
  registerTourRoutes(
    app,
    new TourService(
      repository,
      bikeExists,
      () => "tour-1",
      () => new Date("2026-01-15T10:00:00.000Z"),
    ),
  );
  return app;
}

const emptyRepository = (): TourRepository => ({
  create: async () => {},
  list: async () => [],
});

describe("POST /tours", () => {
  /** Validates the bike through the injected client and returns the saved tour. */
  test("creates a tour for an existing bike", async () => {
    let checked: string | undefined;
    let saved: Tour | undefined;
    const app = buildTourApp(
      {
        create: async (tour) => {
          saved = tour;
        },
        list: async () => [],
      },
      async (id) => {
        checked = id;
        return true;
      },
    );
    const response = await app.inject({
      method: "POST",
      url: "/tours",
      payload: input,
    });

    expect(response.statusCode).toBe(201);
    expect(checked).toBe("bike-1");
    expect(saved).toEqual({
      id: "tour-1",
      ...input,
      createdAt: "2026-01-15T10:00:00.000Z",
    });
    expect(response.json<Tour>()).toEqual(saved!);
    await app.close();
  });

  /** Rejects identical places and an end time before the start time. */
  test("returns field errors for invalid places and times", async () => {
    let checked = false;
    const app = buildTourApp(emptyRepository(), async () => {
      checked = true;
      return true;
    });
    const response = await app.inject({
      method: "POST",
      url: "/tours",
      payload: {
        ...input,
        arrivalLocation: "bahnhofplatz, niederhasli",
        endsAt: input.startsAt,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(
      response
        .json<{ error: { details: { field: string }[] } }>()
        .error.details.map((detail) => detail.field),
    ).toEqual(["arrivalLocation", "endsAt"]);
    expect(checked).toBe(false);
    await app.close();
  });

  /** Rejects missing required fields and a timestamp without a timezone. */
  test("returns 400 for incomplete tour details", async () => {
    const app = buildTourApp(emptyRepository());
    const response = await app.inject({
      method: "POST",
      url: "/tours",
      payload: {
        startLocation: "Station Square",
        startsAt: "2026-10-01T09:00:00",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(
      response
        .json<{ error: { details: { field: string }[] } }>()
        .error.details.map((detail) => detail.field),
    ).toContain("startsAt");
    await app.close();
  });

  /** Rejects a bike that the bike service does not know. */
  test("returns 400 for an unknown bike", async () => {
    const app = buildTourApp(emptyRepository(), async () => false);
    const response = await app.inject({
      method: "POST",
      url: "/tours",
      payload: input,
    });

    expect(response.statusCode).toBe(400);
    expect(
      response.json<{ error: { details: { field: string }[] } }>().error
        .details[0]?.field,
    ).toBe("bikeId");
    await app.close();
  });

  /** Reports an unreachable bike service without creating a tour. */
  test("returns 503 when the bike service is unavailable", async () => {
    let saved = false;
    const app = buildTourApp(
      {
        create: async () => {
          saved = true;
        },
        list: async () => [],
      },
      async () => {
        throw AppError.unavailable("The bike service is unavailable.");
      },
    );
    const response = await app.inject({
      method: "POST",
      url: "/tours",
      payload: input,
    });

    expect(response.statusCode).toBe(503);
    expect(saved).toBe(false);
    await app.close();
  });
});

describe("GET /tours", () => {
  /** Returns stored tour details for the overview. */
  test("returns saved tours", async () => {
    const tour: Tour = {
      id: "tour-1",
      ...input,
      createdAt: "2026-01-15T10:00:00.000Z",
    };
    const app = buildTourApp({
      create: async () => {},
      list: async () => [tour],
    });
    const response = await app.inject({ method: "GET", url: "/tours" });

    expect(response.statusCode).toBe(200);
    expect(response.json<Record<string, unknown>>()).toEqual({ tours: [tour] });
    await app.close();
  });

  /** Gives a clear empty state when no tours exist. */
  test("returns an empty list with a message", async () => {
    const app = buildTourApp(emptyRepository());
    const response = await app.inject({ method: "GET", url: "/tours" });

    expect(response.json<Record<string, unknown>>()).toEqual({
      tours: [],
      message: "No tours have been registered yet.",
    });
    await app.close();
  });

  /** Reports a storage failure with the shared error format. */
  test("returns 503 if the tour list cannot be loaded", async () => {
    const app = buildTourApp({
      create: async () => {},
      list: async () => {
        throw new Error("disk failure");
      },
    });
    const response = await app.inject({ method: "GET", url: "/tours" });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "SERVICE_UNAVAILABLE",
    );
    await app.close();
  });
});
