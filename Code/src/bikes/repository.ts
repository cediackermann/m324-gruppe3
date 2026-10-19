import type { Db } from "../shared/db";
import { AppError } from "../shared/errors";
import type { Bike } from "./model";

export interface BikeRepository {
  create(bike: Bike): Promise<void>;
  list(): Promise<Bike[]>;
  exists(id: string): Promise<boolean>;
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
    errno?: string | number;
    constraint?: string;
  };
  // Bun's Postgres driver reports the SQLSTATE (23505 = unique violation)
  // in `errno`.
  return (
    String(cause?.errno) === "23505" &&
    cause?.constraint === "bikes_frame_number_key"
  );
}

export class PostgresBikeRepository implements BikeRepository {
  constructor(private readonly sql: Db) {}

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

  async exists(id: string): Promise<boolean> {
    const rows = await this.sql`SELECT 1 FROM bikes WHERE id = ${id}`;
    return rows.length > 0;
  }
}
