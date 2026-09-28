import { expect, test } from "bun:test";
import { buildApp } from "../../src/app";
import { sqliteBikeMigrations } from "../../src/bikes/migrations";
import { bikesModule } from "../../src/bikes/routes";
import { createDatabase } from "../../src/shared/db";
import { createBikeLookup } from "../../src/tours/bike-client";
import { tourMigrations } from "../../src/tours/migrations";
import { createToursModule } from "../../src/tours/routes";

/**
 * Starts both Fastify services on separate ports and databases. A tour can
 * only be created after its real HTTP request reaches the bike service.
 */
test("creates a tour using a bike from the other service's API", async () => {
  const bikeDb = createDatabase(":memory:", sqliteBikeMigrations);
  const tourDb = createDatabase(":memory:", tourMigrations);
  const bikeApp = buildApp({
    db: { kind: "sqlite", sqlite: bikeDb },
    modules: [bikesModule],
  });
  const bikeUrl = await bikeApp.listen({ port: 0, host: "127.0.0.1" });
  const tourApp = buildApp({
    db: { kind: "sqlite", sqlite: tourDb },
    modules: [createToursModule(bikeUrl)],
  });
  const tourUrl = await tourApp.listen({ port: 0, host: "127.0.0.1" });

  try {
    const bikeResponse = await fetch(`${bikeUrl}/bikes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "Ghost XY1",
        frameNumber: "XL6234-D2S",
        wheelHeight: 15,
      }),
    });
    expect(bikeResponse.status).toBe(201);
    const bike = (await bikeResponse.json()) as { id: string };

    const tourInput = {
      startLocation: "Bahnhofplatz, Niederhasli",
      arrivalLocation: "Dorfstrasse, Oberhasli",
      startsAt: "2026-10-01T09:00:00.000Z",
      endsAt: "2026-10-01T11:00:00.000Z",
      companion: "Sam Meyer",
      bikeId: bike.id,
    };
    const tourResponse = await fetch(`${tourUrl}/tours`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tourInput),
    });
    expect(tourResponse.status).toBe(201);
    const created = (await tourResponse.json()) as {
      id: string;
      bikeId: string;
    };
    expect(created.bikeId).toBe(bike.id);

    const list = (await (await fetch(`${tourUrl}/tours`)).json()) as {
      tours: { id: string }[];
    };
    expect(list.tours[0]?.id).toBe(created.id);
    expect(
      tourDb
        .query(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bikes'",
        )
        .get(),
    ).toBeNull();

    const missingBikeResponse = await fetch(`${tourUrl}/tours`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...tourInput, bikeId: "missing" }),
    });
    expect(missingBikeResponse.status).toBe(400);
  } finally {
    await tourApp.close();
    await bikeApp.close();
    tourDb.close();
    bikeDb.close();
  }
});

/** Enforces frame-number uniqueness in the database, including letter case. */
test("rejects a duplicate frame number after the first bike is stored", async () => {
  const db = createDatabase(":memory:", sqliteBikeMigrations);
  const app = buildApp({
    db: { kind: "sqlite", sqlite: db },
    modules: [bikesModule],
  });
  try {
    const payload = {
      type: "Ghost XY1",
      frameNumber: "xl6234-d2s",
      wheelHeight: 15,
    };
    expect(
      (await app.inject({ method: "POST", url: "/bikes", payload })).statusCode,
    ).toBe(201);
    const duplicate = await app.inject({
      method: "POST",
      url: "/bikes",
      payload: { ...payload, frameNumber: "XL6234-D2S" },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(
      (await app.inject({ method: "GET", url: "/bikes" })).json<{
        bikes: unknown[];
      }>().bikes,
    ).toHaveLength(1);
  } finally {
    await app.close();
    db.close();
  }
});

/** Converts a failed HTTP connection to the shared dependency error. */
test("reports an unreachable bike service", async () => {
  await expect(
    createBikeLookup("http://127.0.0.1:1")("bike-1"),
  ).rejects.toMatchObject({
    statusCode: 503,
    code: "SERVICE_UNAVAILABLE",
  });
});
