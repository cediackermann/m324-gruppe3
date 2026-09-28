import { z } from "zod";
import { AppError } from "../shared/errors";
import { parseOrThrow } from "../shared/validation";
import type { BikeLookup } from "./bike-client";
import type { Tour } from "./model";
import type { TourRepository } from "./repository";

const tourInput = z
  .strictObject({
    startLocation: z.string().trim().min(1, "Start location is required."),
    arrivalLocation: z.string().trim().min(1, "Arrival location is required."),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    companion: z.string().trim().min(1, "Companion is required."),
    bikeId: z.string().trim().min(1, "Bike is required."),
  })
  .superRefine((value, context) => {
    if (
      value.startLocation.toLowerCase() === value.arrivalLocation.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        path: ["arrivalLocation"],
        message: "Arrival location must differ from start location.",
      });
    }
    if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after start time.",
      });
    }
  });

export class TourService {
  constructor(
    private readonly repository: TourRepository,
    private readonly bikeExists: BikeLookup,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async create(input: unknown): Promise<Tour> {
    const values = parseOrThrow(tourInput, input, "Invalid tour details.");
    if (!(await this.bikeExists(values.bikeId))) {
      throw AppError.validation("Invalid tour details.", [
        { field: "bikeId", message: "The selected bike does not exist." },
      ]);
    }
    const tour: Tour = {
      id: this.generateId(),
      ...values,
      createdAt: this.now().toISOString(),
    };
    try {
      await this.repository.create(tour);
    } catch {
      throw AppError.unavailable("The tour could not be saved.");
    }
    return tour;
  }

  async list(): Promise<Tour[]> {
    try {
      return await this.repository.list();
    } catch {
      throw AppError.unavailable("The tour list could not be loaded.");
    }
  }
}
