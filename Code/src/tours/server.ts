import { startService } from "../shared/serve";
import { tourMigrations } from "./migrations";
import { createToursModule } from "./routes";

await startService({
  module: createToursModule(
    process.env.BIKE_SERVICE_URL ?? "http://localhost:3000",
  ),
  sqliteMigrations: tourMigrations,
  postgresMigrations: tourMigrations,
  defaultPort: 3001,
  defaultDatabasePath: "data/tours.db",
});
