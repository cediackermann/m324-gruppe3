import { buildApp } from "./app";
import { bikesModule } from "./bikes/routes";
import { createDatabase, migrate } from "./shared/db";
import { toursModule } from "./tours/routes";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Start a local database with `docker compose up -d db` and see README.md.",
  );
  process.exit(1);
}

const db = createDatabase(databaseUrl);
await migrate(db);

const app = buildApp({
  db,
  logger: true,
  modules: [bikesModule, toursModule],
  // Render sets RENDER_GIT_COMMIT; Docker Compose passes APP_VERSION.
  version: process.env.RENDER_GIT_COMMIT ?? process.env.APP_VERSION,
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(async () => {
      await db.close();
      process.exit(0);
    });
  });
}

await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
});
