import type { SQL } from "bun";
import type { Db } from "../shared/db";
import type { Tour } from "./model";

export interface TourRepository {
  create(tour: Tour): Promise<void>;
  list(): Promise<Tour[]>;
}

type TourRow = {
  id: string;
  start_location: string;
  arrival_location: string;
  starts_at: string;
  ends_at: string;
  companion: string;
  bike_id: string;
  created_at: string;
};

function toTour(row: TourRow): Tour {
  return {
    id: row.id,
    startLocation: row.start_location,
    arrivalLocation: row.arrival_location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    companion: row.companion,
    bikeId: row.bike_id,
    createdAt: row.created_at,
  };
}

export class SqliteTourRepository implements TourRepository {
  constructor(private readonly db: Db) {}

  async create(tour: Tour): Promise<void> {
    this.db.run(
      "INSERT INTO tours (id, start_location, arrival_location, starts_at, ends_at, companion, bike_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        tour.id,
        tour.startLocation,
        tour.arrivalLocation,
        tour.startsAt,
        tour.endsAt,
        tour.companion,
        tour.bikeId,
        tour.createdAt,
      ],
    );
  }

  async list(): Promise<Tour[]> {
    return this.db
      .query<TourRow, []>(
        "SELECT id, start_location, arrival_location, starts_at, ends_at, companion, bike_id, created_at FROM tours ORDER BY starts_at DESC, id",
      )
      .all()
      .map(toTour);
  }
}

export class PostgresTourRepository implements TourRepository {
  constructor(private readonly sql: SQL) {}

  async create(tour: Tour): Promise<void> {
    await this
      .sql`INSERT INTO tours (id, start_location, arrival_location, starts_at, ends_at, companion, bike_id, created_at)
      VALUES (${tour.id}, ${tour.startLocation}, ${tour.arrivalLocation}, ${tour.startsAt}, ${tour.endsAt}, ${tour.companion}, ${tour.bikeId}, ${tour.createdAt})`;
  }

  async list(): Promise<Tour[]> {
    const rows = await this
      .sql`SELECT id, start_location, arrival_location, starts_at, ends_at, companion, bike_id, created_at FROM tours ORDER BY starts_at DESC, id`;
    return (rows as TourRow[]).map(toTour);
  }
}
