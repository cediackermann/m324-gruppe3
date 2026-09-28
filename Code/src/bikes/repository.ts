import type { SQL } from "bun";
import type { Db } from "../shared/db";
import { AppError } from "../shared/errors";
import type { Bike } from "./model";

export interface BikeRepository {
  create(bike: Bike): Promise<void>;
  list(): Promise<Bike[]>;
}

type BikeRow = {
  id: string;
  type: string;
  frame_number: string;
  wheel_height: number;
  created_at: string;
};

function toBike(row: BikeRow): Bike {
  return {
    id: row.id,
    type: row.type,
    frameNumber: row.frame_number,
    wheelHeight: row.wheel_height,
    createdAt: row.created_at,
  };
}

function isDuplicate(error: unknown): boolean {
  const cause = error as {
    code?: string;
    errno?: string | number;
    constraint?: string;
  };
  return (
    cause?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (String(cause?.errno) === "23505" &&
      cause?.constraint === "bikes_frame_number_key")
  );
}

export class SqliteBikeRepository implements BikeRepository {
  constructor(private readonly db: Db) {}

  async create(bike: Bike): Promise<void> {
    try {
      this.db.run(
        "INSERT INTO bikes (id, type, frame_number, wheel_height, created_at) VALUES (?, ?, ?, ?, ?)",
        [
          bike.id,
          bike.type,
          bike.frameNumber,
          bike.wheelHeight,
          bike.createdAt,
        ],
      );
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("Frame number already exists.");
      throw error;
    }
  }

  async list(): Promise<Bike[]> {
    return this.db
      .query<BikeRow, []>(
        "SELECT id, type, frame_number, wheel_height, created_at FROM bikes ORDER BY created_at DESC, id",
      )
      .all()
      .map(toBike);
  }
}

export class PostgresBikeRepository implements BikeRepository {
  constructor(private readonly sql: SQL) {}

  async create(bike: Bike): Promise<void> {
    try {
      await this
        .sql`INSERT INTO bikes (id, type, frame_number, wheel_height, created_at)
        VALUES (${bike.id}, ${bike.type}, ${bike.frameNumber}, ${bike.wheelHeight}, ${bike.createdAt})`;
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("Frame number already exists.");
      throw error;
    }
  }

  async list(): Promise<Bike[]> {
    const rows = await this
      .sql`SELECT id, type, frame_number, wheel_height, created_at FROM bikes ORDER BY created_at DESC, id`;
    return (rows as BikeRow[]).map(toBike);
  }
}
