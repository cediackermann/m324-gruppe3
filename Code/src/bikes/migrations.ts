import type { Migration } from "../shared/migrations";

export const sqliteBikeMigrations: Migration[] = [
  {
    name: "001_create_bikes",
    sql: `CREATE TABLE bikes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      frame_number TEXT NOT NULL UNIQUE,
      wheel_height REAL NOT NULL CHECK (wheel_height > 0),
      created_at TEXT NOT NULL
    )`,
  },
];

export const postgresBikeMigrations: Migration[] = [
  {
    name: "001_create_bikes",
    sql: `CREATE TABLE bikes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      frame_number TEXT NOT NULL UNIQUE,
      wheel_height DOUBLE PRECISION NOT NULL CHECK (wheel_height > 0),
      created_at TEXT NOT NULL
    )`,
  },
];
