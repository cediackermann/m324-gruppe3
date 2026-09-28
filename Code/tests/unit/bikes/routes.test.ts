import { describe, expect, test } from "bun:test";
import Fastify from "fastify";
import { registerBikeRoutes } from "../../../src/bikes/routes";
import type { Bike } from "../../../src/bikes/model";
import type { BikeRepository } from "../../../src/bikes/repository";
import { BikeService } from "../../../src/bikes/service";
import { registerErrorHandling } from "../../../src/error-handling";
import { AppError } from "../../../src/shared/errors";

const sampleBike: Bike = {
  id: "bike-1",
  type: "Ghost XY1",
  frameNumber: "XL6234-D2S",
  wheelHeight: 15,
  createdAt: "2026-01-15T10:00:00.000Z",
};

function buildBikeApp(repository: BikeRepository) {
  const app = Fastify();
  registerErrorHandling(app);
  registerBikeRoutes(
    app,
    new BikeService(
      repository,
      () => "bike-1",
      () => new Date(sampleBike.createdAt),
    ),
  );
  return app;
}

describe("POST /bikes", () => {
  /** Creates a bike with server-generated fields and stores it through the repository. */
  test("returns the created bike", async () => {
    let saved: Bike | undefined;
    const app = buildBikeApp({
      create: async (bike) => {
        saved = bike;
      },
      list: async () => [],
    });
    const response = await app.inject({
      method: "POST",
      url: "/bikes",
      payload: {
        type: "Ghost XY1",
        frameNumber: "xl6234-d2s",
        wheelHeight: "15",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<Bike>()).toEqual(sampleBike);
    expect(saved).toEqual(sampleBike);
    await app.close();
  });

  /** Rejects missing and invalid fields before the repository is called. */
  test("returns field errors for invalid input", async () => {
    let called = false;
    const app = buildBikeApp({
      create: async () => {
        called = true;
      },
      list: async () => [],
    });
    const response = await app.inject({
      method: "POST",
      url: "/bikes",
      payload: { type: " ", wheelHeight: -2 },
    });

    expect(response.statusCode).toBe(400);
    expect(
      response
        .json<{ error: { details: { field: string }[] } }>()
        .error.details.map((detail) => detail.field),
    ).toEqual(["type", "frameNumber", "wheelHeight"]);
    expect(called).toBe(false);
    await app.close();
  });

  /** Reports a duplicate frame number as a conflict without exposing storage details. */
  test("returns 409 for a duplicate frame number", async () => {
    const app = buildBikeApp({
      create: async () => {
        throw AppError.conflict("Frame number already exists.");
      },
      list: async () => [],
    });
    const response = await app.inject({
      method: "POST",
      url: "/bikes",
      payload: {
        type: "Ghost XY1",
        frameNumber: "XL6234-D2S",
        wheelHeight: 15,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "CONFLICT",
    );
    await app.close();
  });
});

describe("GET /bikes", () => {
  /** Returns every bike field in a structured list. */
  test("returns saved bikes", async () => {
    const app = buildBikeApp({
      create: async () => {},
      list: async () => [sampleBike, { ...sampleBike, id: "bike-2" }],
    });
    const response = await app.inject({ method: "GET", url: "/bikes" });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ bikes: Bike[] }>().bikes).toEqual([
      sampleBike,
      { ...sampleBike, id: "bike-2" },
    ]);
    await app.close();
  });

  /** Gives an explicit empty-state message when no bikes have been stored. */
  test("returns an empty list with a message", async () => {
    const app = buildBikeApp({ create: async () => {}, list: async () => [] });
    const response = await app.inject({ method: "GET", url: "/bikes" });

    expect(response.json<Record<string, unknown>>()).toEqual({
      bikes: [],
      message: "No bikes have been registered yet.",
    });
    await app.close();
  });

  /** Converts a repository failure into a clear service error. */
  test("returns 503 if the bike list cannot be loaded", async () => {
    const app = buildBikeApp({
      create: async () => {},
      list: async () => {
        throw new Error("disk failure");
      },
    });
    const response = await app.inject({ method: "GET", url: "/bikes" });

    expect(response.statusCode).toBe(503);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      "SERVICE_UNAVAILABLE",
    );
    await app.close();
  });

  /** Rejects unknown query fields instead of silently changing the result. */
  test("returns 400 for an invalid query", async () => {
    const app = buildBikeApp({ create: async () => {}, list: async () => [] });
    const response = await app.inject({
      method: "GET",
      url: "/bikes?unknown=1",
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
