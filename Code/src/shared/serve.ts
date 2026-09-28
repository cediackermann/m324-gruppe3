import { buildApp } from "../app";
import type { AppDb, AppModule } from "../context";
import { createDatabase } from "./db";
import type { Migration } from "./migrations";
import { createPostgresDatabase, migratePostgres } from "./postgres";

interface ServiceOptions {
  module: AppModule;
  sqliteMigrations: Migration[];
  postgresMigrations: Migration[];
  defaultPort: number;
  defaultDatabasePath: string;
}

/** Opens one service's database, applies its schema, then starts its API. */
export async function startService(options: ServiceOptions): Promise<void> {
  const db: AppDb = process.env.DATABASE_URL
    ? {
        kind: "postgres",
        sql: createPostgresDatabase(process.env.DATABASE_URL),
      }
    : {
        kind: "sqlite",
        sqlite: createDatabase(
          process.env.DATABASE_PATH ?? options.defaultDatabasePath,
          options.sqliteMigrations,
        ),
      };

  if (db.kind === "postgres") {
    await migratePostgres(db.sql, options.postgresMigrations);
  }

  const app = buildApp({ db, logger: true, modules: [options.module] });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      app.close().then(async () => {
        if (db.kind === "sqlite") db.sqlite.close();
        else await db.sql.close();
        process.exit(0);
      });
    });
  }

  await app.listen({
    port: Number(process.env.PORT ?? options.defaultPort),
    host: process.env.HOST ?? "0.0.0.0",
  });
}
