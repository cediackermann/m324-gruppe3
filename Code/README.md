# Bike Tours Backend

One Fastify service serves the bike and tour endpoints from a single PostgreSQL database. Bikes and tours are separate modules (`src/bikes/`, `src/tours/`) with their own routes, service, repository, and migrations. Before a tour is stored, the tour module checks through the bike repository that the selected bike exists.

## Run locally

Requires Bun 1.3.13 and Docker. From `Code/`:

```bash
bun install --frozen-lockfile
docker compose up -d db
DATABASE_URL=postgres://app:app@localhost:5432/app bun run dev
```

Bun loads `.env` automatically, so you can put `DATABASE_URL=postgres://app:app@localhost:5432/app` in `Code/.env` instead of typing it each time (`.env` is git-ignored). The API listens on `http://localhost:3000`. `bun run start` runs without file watching.

The service requires `DATABASE_URL` and also accepts `PORT` (default `3000`) and `HOST` (default `0.0.0.0`). For hosted databases such as Neon, use a URL with `?sslmode=require`. Pending migrations are applied on startup. `GET /health` checks the database connection.

## API

`POST /bikes` accepts `type`, `frameNumber`, and a positive `wheelHeight` (number or numeric string). It returns `201` with the stored bike, including generated `id` and `createdAt`. Frame numbers are normalized to uppercase and unique. Invalid fields return `400` with per-field details; a duplicate frame number returns `409`.

`GET /bikes` returns `{ "bikes": [...] }` with all bike fields. An empty list also contains `"message": "No bikes have been registered yet."`.

`POST /tours` accepts `startLocation`, `arrivalLocation`, `startsAt`, `endsAt`, `companion`, and `bikeId`. Times must be ISO 8601 timestamps with a timezone offset or `Z`. The two locations must differ, the end must be after the start, and `bikeId` must be an existing bike. It returns `201` with the stored tour, including `id` and `createdAt`. Unknown bikes and invalid fields return `400`; an unreachable database returns `503`.

`GET /tours` returns `{ "tours": [...] }` for the tour overview. An empty list includes a message. All errors use `{ "error": { "code": "...", "message": "...", "details": [...] } }`.

Example:

```bash
curl -X POST localhost:3000/bikes -H 'content-type: application/json' -d '{"type":"Ghost XY1","frameNumber":"XL6234-D2S","wheelHeight":15}'
curl localhost:3000/bikes
curl -X POST localhost:3000/tours -H 'content-type: application/json' -d '{"startLocation":"Bahnhofplatz, Niederhasli","arrivalLocation":"Dorfstrasse, Oberhasli","startsAt":"2026-10-01T09:00:00Z","endsAt":"2026-10-01T11:00:00Z","companion":"Sam Meyer","bikeId":"REPLACE_WITH_RETURNED_BIKE_ID"}'
curl localhost:3000/tours
```

## Docker

```bash
docker compose up -d --build
docker compose ps
```

Compose runs the API (port 3000) and one PostgreSQL container with a volume. PostgreSQL is also published on port 5432 for local development and the integration tests. When the volume is first created, it also creates an `app_test` database for the tests. `docker compose down` stops the stack and keeps data; `docker compose down -v` also deletes the database volume.

For a copyable Docker walkthrough of all three user stories, see [`docs/demo.md`](docs/demo.md).

## Checks

```bash
bun test tests/unit
docker compose up -d db
TEST_DATABASE_URL=postgres://app:app@localhost:5432/app_test bun test tests/integration
bun run typecheck
bun run lint
bun run format:check
bun tests/system/smoke.ts
```

Unit tests use fake repositories, a fake bike lookup, and a fake SQL client; they need no database or network. Integration tests run the full app and the migrations against a real PostgreSQL database. They read `TEST_DATABASE_URL` (never `DATABASE_URL`), delete all data in it before each test, and refuse to run unless the database name contains `test`. The system smoke test requires the running Compose stack (or `BASE_URL`) and is executed in CI.

The active CI workflow is at the repository root, `.github/workflows/ci.yml`. Its build produces a Docker image tagged with the commit SHA for later artifact publishing. The job structure and test stages are described in [`docs/ci.md`](docs/ci.md).

## Deployment

Every push to `main` that passes CI is deployed automatically to Render (API) and Neon (PostgreSQL), both on free tiers. The deploy job checks that the new commit is live and rolls back to the previous one if it is not. `GET /health` reports the running commit in `version`. Setup, rollback, secrets, and monitoring are described in [`docs/cd.md`](docs/cd.md).

## Project layout

`src/bikes/` and `src/tours/` each contain routes, service, repository, model, and migrations. The single entry point is `src/server.ts`. `scripts/` holds the deployment helper, and `render.yaml` at the repository root describes the Render service. Shared application wiring, validation, errors, and database helpers live under `src/` and `src/shared/`; `src/shared/migrations.ts` lists every module's migrations in order. The endpoint unit tests mirror their modules under `tests/unit/`; shared test helpers live in `tests/helpers/`.
