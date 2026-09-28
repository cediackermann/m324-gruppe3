const bikesUrl = process.env.BIKES_URL ?? "http://localhost:3000";
const toursUrl = process.env.TOURS_URL ?? "http://localhost:3001";

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const frameNumber = `CI-${crypto.randomUUID()}`;
const bikeResponse = await fetch(`${bikesUrl}/bikes`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    type: "Smoke test bike",
    frameNumber,
    wheelHeight: 15,
  }),
});
check(
  bikeResponse.status === 201,
  `Bike creation failed: ${bikeResponse.status}`,
);
const bike = (await bikeResponse.json()) as { id: string };

const bikes = (await (await fetch(`${bikesUrl}/bikes`)).json()) as {
  bikes: { id: string }[];
};
check(
  bikes.bikes.some((item) => item.id === bike.id),
  "Bike is missing from the list.",
);

const duplicate = await fetch(`${bikesUrl}/bikes`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ type: "Another bike", frameNumber, wheelHeight: 15 }),
});
check(duplicate.status === 409, "Duplicate frame number was accepted.");

const tourResponse = await fetch(`${toursUrl}/tours`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    startLocation: "Station Square",
    arrivalLocation: "Village Street",
    startsAt: "2026-10-01T09:00:00.000Z",
    endsAt: "2026-10-01T11:00:00.000Z",
    companion: "Sam Meyer",
    bikeId: bike.id,
  }),
});
check(
  tourResponse.status === 201,
  `Tour creation failed: ${tourResponse.status}`,
);
const tour = (await tourResponse.json()) as { id: string };

const tours = (await (await fetch(`${toursUrl}/tours`)).json()) as {
  tours: { id: string }[];
};
check(
  tours.tours.some((item) => item.id === tour.id),
  "Tour is missing from the list.",
);

const missingBike = await fetch(`${toursUrl}/tours`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    startLocation: "Station Square",
    arrivalLocation: "Village Street",
    startsAt: "2026-10-01T09:00:00.000Z",
    endsAt: "2026-10-01T11:00:00.000Z",
    companion: "Sam Meyer",
    bikeId: "missing-bike",
  }),
});
check(missingBike.status === 400, "Unknown bike was accepted.");
console.log("Bike and tour service smoke test passed.");
