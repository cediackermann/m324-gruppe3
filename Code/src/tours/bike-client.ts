import { z } from "zod";
import { AppError } from "../shared/errors";

export type BikeLookup = (bikeId: string) => Promise<boolean>;

const bikeList = z.object({ bikes: z.array(z.object({ id: z.string() })) });

/** Uses the bike service's list endpoint; tour storage never reads bike data. */
export function createBikeLookup(baseUrl: string): BikeLookup {
  return async (bikeId) => {
    try {
      const response = await fetch(new URL("/bikes", baseUrl), {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("Bike service returned an error.");
      const data = bikeList.parse(await response.json());
      return data.bikes.some((bike) => bike.id === bikeId);
    } catch {
      throw AppError.unavailable("The bike service is unavailable.");
    }
  };
}
