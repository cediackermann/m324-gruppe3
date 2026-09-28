import {
  sqliteBikeMigrations,
  postgresBikeMigrations,
} from "./bikes/migrations";
import { bikesModule } from "./bikes/routes";
import { startService } from "./shared/serve";

await startService({
  module: bikesModule,
  sqliteMigrations: sqliteBikeMigrations,
  postgresMigrations: postgresBikeMigrations,
  defaultPort: 3000,
  defaultDatabasePath: "data/bikes.db",
});
