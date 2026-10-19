import type { Migration } from "../shared/migrations";

const createTours = `CREATE TABLE tours (
  id TEXT PRIMARY KEY,
  start_location TEXT NOT NULL,
  arrival_location TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  companion TEXT NOT NULL,
  bike_id TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

export const tourMigrations: Migration[] = [
  { name: "001_create_tours", sql: createTours },
];
