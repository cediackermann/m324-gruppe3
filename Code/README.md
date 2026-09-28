# Bike Tours Backend

Two independently running Fastify services share the Bun toolchain and common HTTP helpers. The bike service owns bike data. The tour service owns tour data and asks the bike service over HTTP whether a selected bike exists. It never reads the bike database.

## Run locally

Requires Bun 1.3.13. From `Code/`:

```bash
bun install --frozen-lockfile
bun run dev
```

In another terminal:

```bash
bun run dev:tours
```

The bike API listens on `http://localhost:3000`, the tour API on `http://localhost:3001`. They use separate SQLite files, `data/bikes.db` and `data/tours.db`. `bun run start` and `bun run start:tours` run without file watching.

Both services accept `PORT`, `HOST`, and `DATABASE_PATH`. Setting `DATABASE_URL` selects PostgreSQL instead of SQLite. The tour service also accepts `BIKE_SERVICE_URL` (default `http://localhost:3000`). Each service applies only its own migrations when starting. Both expose `GET /health`.

## API

`POST /bikes` accepts `type`, `frameNumber`, and a positive `wheelHeight` (number or numeric string). It returns `201` with the stored bike, including generated `id` and `createdAt`. Frame numbers are normalized to uppercase and unique. Invalid fields return `400` with per-field details; a duplicate frame number returns `409`.

`GET /bikes` returns `{ "bikes": [...] }` with all bike fields. An empty list also contains `"message": "No bikes have been registered yet."`.

`POST /tours` accepts `startLocation`, `arrivalLocation`, `startsAt`, `endsAt`, `companion`, and `bikeId`. Times must be ISO 8601 timestamps with a timezone offset or `Z`. The two locations must differ, the end must be after the start, and `bikeId` must occur in the bike service's `GET /bikes` response. It returns `201` with the stored tour, including `id` and `createdAt`. Unknown bikes and invalid fields return `400`; an unreachable bike service returns `503`.

`GET /tours` returns `{ "tours": [...] }` for the tour overview. An empty list includes a message. All errors use `{ "error": { "code": "...", "message": "...", "details": [...] } }`.

Example:

```bash
curl -X POST localhost:3000/bikes -H 'content-type: application/json' -d '{"type":"Ghost XY1","frameNumber":"XL6234-D2S","wheelHeight":15}'
curl localhost:3000/bikes
curl -X POST localhost:3001/tours -H 'content-type: application/json' -d '{"startLocation":"Bahnhofplatz, Niederhasli","arrivalLocation":"Dorfstrasse, Oberhasli","startsAt":"2026-10-01T09:00:00Z","endsAt":"2026-10-01T11:00:00Z","companion":"Sam Meyer","bikeId":"REPLACE_WITH_RETURNED_BIKE_ID"}'
curl localhost:3001/tours
```

## Docker

```bash
docker compose up -d --build
docker compose ps
```

Compose runs both APIs with separate PostgreSQL containers and volumes. The same application image runs each service with a different command. The bike API uses port 3000 and the tour API port 3001. `docker compose down` stops the stack and keeps data; `docker compose down -v` also deletes both database volumes.

## Checks

```bash
bun test tests/unit
bun test tests/integration
bun run typecheck
bun run lint
bun run format:check
bun tests/system/smoke.ts
```

Unit tests use fake repositories and a fake bike lookup; they need no database or network. Integration tests start both APIs on local ports with separate in-memory SQLite databases and use real HTTP for bike validation. The system smoke test requires the two running services and is executed in CI against the Compose stack.

The active CI workflow is at the repository root, `.github/workflows/ci.yml`. Its build produces a Docker image tagged with the commit SHA for later artifact publishing. The job structure and test stages are described in [`docs/ci.md`](docs/ci.md).

## Project layout

`src/bikes/` and `src/tours/` each contain routes, service, repository, model, and migrations. The bike and tour server entry points are `src/server.ts` and `src/tours/server.ts`. Shared application wiring, validation, errors, and database helpers live under `src/` and `src/shared/`. The endpoint unit tests mirror their modules under `tests/unit/`.
