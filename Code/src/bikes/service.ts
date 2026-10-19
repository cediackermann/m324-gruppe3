import { z } from "zod";
import { AppError } from "../shared/errors";
import { parseOrThrow } from "../shared/validation";
import type { Bike } from "./model";
import type { BikeRepository } from "./repository";

const bikeInput = z.strictObject({
  type: z.string().trim().min(1, "Type is required."),
  frameNumber: z
    .string()
    .trim()
    .min(1, "Frame number is required.")
    .transform((value) => value.toUpperCase()),
  wheelHeight: z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(/^\d+(?:\.\d+)?$/, "Wheel height must be a positive number.")
        .transform(Number),
    ])
    .pipe(z.number().finite().positive("Wheel height must be positive.")),
});

export class BikeService {
  constructor(
    private readonly repository: BikeRepository,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async create(input: unknown): Promise<Bike> {
    const values = parseOrThrow(bikeInput, input, "Invalid bike details.");
    const bike: Bike = {
      id: this.generateId(),
      ...values,
      createdAt: this.now().toISOString(),
    };
    try {
      await this.repository.create(bike);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unavailable("The bike could not be saved.");
    }
    return bike;
  }

  async list(): Promise<Bike[]> {
    try {
      return await this.repository.list();
    } catch {
      throw AppError.unavailable("The bike list could not be loaded.");
    }
  }
}
