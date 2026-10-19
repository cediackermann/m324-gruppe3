import { afterAll, beforeEach, expect, test } from "bun:test";
import { buildApp } from "../../src/app";
import { bikesModule } from "../../src/bikes/routes";
import { migrate } from "../../src/shared/db";
import { toursModule } from "../../src/tours/routes";
import { openTestDatabase, resetDatabase } from "../helpers/test-db";

/**
 * Runs the full app (both modules) against a real, freshly migrated
 * Postgres database, so SQL, constraints and the bike check are exercised
 * for real.
 */
const sql = openTestDatabase();

beforeEach(async () => {
  await resetDatabase(sql);
  await migrate(sql);
});
afterAll(() => sql.close());

function buildFullApp() {
  return buildApp({ db: sql, modules: [bikesModule, toursModule] });
}

const tourInput = {
  startLocation: "Bahnhofplatz, Niederhasli",
  arrivalLocation: "Dorfstrasse, Oberhasli",
  startsAt: "2026-10-01T09:00:00.000Z",
  endsAt: "2026-10-01T11:00:00.000Z",
  companion: "Sam Meyer",
};

/** Creates a tour for a stored bike and rejects a bike that does not exist. */
test("creates a tour using a stored bike", async () => {
  const app = buildFullApp();
  try {
    const bikeResponse = await app.inject({
      method: "POST",
      url: "/bikes",
      payload: {
        type: "Ghost XY1",
        frameNumber: "XL6234-D2S",
        wheelHeight: 15,
      },
    });
    expect(bikeResponse.statusCode).toBe(201);
    const bike = bikeResponse.json<{ id: string }>();

    const tourResponse = await app.inject({
      method: "POST",
      url: "/tours",
      payload: { ...tourInput, bikeId: bike.id },
    });
    expect(tourResponse.statusCode).toBe(201);
    const created = tourResponse.json<{ id: string; bikeId: string }>();
    expect(created.bikeId).toBe(bike.id);

    const list = (await app.inject({ method: "GET", url: "/tours" })).json<{
      tours: { id: string }[];
    }>();
    expect(list.tours.map((tour) => tour.id)).toEqual([created.id]);

    const missingBike = await app.inject({
      method: "POST",
      url: "/tours",
      payload: { ...tourInput, bikeId: "missing" },
    });
    expect(missingBike.statusCode).toBe(400);
  } finally {
    await app.close();
  }
});

/** Enforces frame-number uniqueness in the database, including letter case. */
test("rejects a duplicate frame number after the first bike is stored", async () => {
  const app = buildFullApp();
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
  }
});

/** The readiness probe queries the real database. */
test("reports a healthy database", async () => {
  const app = buildFullApp();
  try {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.json<Record<string, unknown>>()).toEqual({
      status: "ok",
      database: "ok",
    });
  } finally {
    await app.close();
  }
});
