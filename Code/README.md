# Biketouren — Backend

[![CI](https://github.com/cediackermann/m324-gruppe3/actions/workflows/ci.yml/badge.svg)](https://github.com/cediackermann/m324-gruppe3/actions/workflows/ci.yml)

API backend for the M324 CI/CD practice project ("Biketouren"). This repo is
the platform: a Fastify app, a shared error format, a database (SQLite
locally, Postgres in production) with migrations, and the Docker/CI setup
around it. Feature endpoints (bikes, tours) are built on top of it as
separate modules — see `src/context.ts` (`AppModule`) for the extension
point.

Requires [Bun](https://bun.com) `1.3.13` (pinned in the `Dockerfile` and CI
so all three stay in sync).

## Run locally

```bash
bun install
bun run dev
```

`dev` starts the server with hot reload (`bun --watch`) on
`http://localhost:3000`. On first start it creates `data/app.db` and applies
the (currently empty) migrations automatically.

```bash
curl localhost:3000/health
# {"status":"ok","database":"ok","schemaVersion":0}
```

`bun run start` runs the same server without hot reload — closer to how the
Docker image runs it.

### Configuration

All optional, read from the environment (`.env` is loaded automatically by
Bun, no `dotenv` needed):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | port the server listens on |
| `HOST` | `0.0.0.0` | host the server binds to |
| `DATABASE_PATH` | `data/app.db` | SQLite file; use `:memory:` for a throwaway DB |
| `DATABASE_URL` | unset | Postgres connection string; when set, **overrides `DATABASE_PATH`** and switches the whole app to Postgres |

## Database driver: SQLite vs. Postgres

`src/server.ts` picks the driver automatically:

- **`DATABASE_URL` unset (default, local dev, docker compose)** → `bun:sqlite`
  file at `DATABASE_PATH`. Zero setup, no external service, what the
  Dockerfile/docker-compose volume story is built around.
- **`DATABASE_URL` set (e.g. on Vercel)** → Postgres via `Bun.sql`
  (`src/shared/postgres.ts`). Needed because platforms like Vercel run the
  app as serverless functions with a read-only/ephemeral filesystem — a
  local SQLite file would not survive between requests, let alone between
  deploys. Point `DATABASE_URL` at a Neon or Vercel Postgres database.

Both drivers implement the same `AppDb` shape (`{ kind: "sqlite" | "postgres",
... }`, see `src/context.ts`); code that touches the database switches on
`ctx.db.kind`. Right now that's only `GET /health`, which reports
`schemaVersion` for SQLite (migrations run) and just `status`/`database` for
Postgres (no Postgres migrations exist yet — add them the same way
`shared/db.ts`'s SQLite migrations work, once a feature module needs tables).

## Run with Docker

Two services, mirroring production instead of a single all-in-one container:

```bash
docker compose up -d --build
curl localhost:3000/health
```

- **`app`** — the web server. Stateless: nothing it needs to keep survives
  in this container.
- **`db`** — Postgres, the same driver production uses (`DATABASE_URL` is
  wired between them automatically). `app` waits for `db`'s healthcheck
  before starting.

The data lives on `db`'s named volume (`db-data`), not inside either
container, so it survives a redeploy (`docker compose up -d --build` again
with new code recreates `app`, `db` and its volume are untouched).
**`docker compose down -v` deletes that volume and the data with it** —
plain `docker compose down` does not.

Tag a specific release instead of the default `dev` tag:

```bash
APP_VERSION=$(git rev-parse --short HEAD) docker compose up -d --build
```

This is the same Postgres path used in production (e.g. Vercel + Neon) —
useful for testing the real containerized stack locally before deploying.
Vercel itself doesn't run `docker-compose`; there, just set `DATABASE_URL`
on the platform to point at your hosted Postgres instance (see "Database
driver" above).

**A Bun 1.3.13 quirk that shaped the Dockerfile:** `Bun.sql`'s Postgres
connector fails to open a socket when the process's working directory is
literally `/app` — confirmed independent of ownership/permissions, and only
`Bun.sql`'s own connector is affected (raw `Bun.connect()` still works
there). The Dockerfile uses `/srv` instead. Re-check this if you bump the
Bun version — it may be fixed upstream.

## Tests, types, lint, format

```bash
bun test              # unit tests (bun:test), isolated — no external services needed
bun run typecheck
bun run lint           # eslint.config.mjs — flat config, TS-aware
bun run format:check    # prettier --check .; bun run format to fix
```

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

1. **`test`** — `bun install --frozen-lockfile`, then format check, lint,
   typecheck, `bun test`. No external services — this has to pass with
   `bun:sqlite` alone.
2. **`docker-build`** (after `test` passes) — builds the real two-service
   stack (`docker compose up -d --build`, app + Postgres), waits for `app`'s
   own `HEALTHCHECK` to report healthy, then asserts `GET /health` actually
   returns `"status":"ok"` — not just "the image built".

Both jobs pin Bun to `1.3.13`, matching the `Dockerfile` and local dev, so
CI can't pass on a Bun version that behaves differently elsewhere (see the
`/app`-working-directory bug documented above — this is exactly the kind of
thing a version drift could silently reintroduce).

## Project layout

```
src/
  app.ts                    buildApp(options) — wires everything below, does NOT listen()
  server.ts                  the only place that opens a port / the real DB file
  context.ts                  AppContext (db, generateId, now), AppDb union, AppModule type
  error-handling.ts            registerErrorHandling(app) — shared error + not-found handlers
  health/
    routes.ts                   registerHealthRoute(app, ctx) — GET /health, queries the active DB driver
  shared/                     code shared by every endpoint, not an endpoint itself
    errors.ts                  AppError + the shared { error: { code, message, details } } format
    validation.ts               parseOrThrow(schema, input, message) — Zod → 400 with per-field details
    db.ts                        SQLite: createDatabase(path), migrate(db), currentVersion(db)
    migrations.ts                 SQLite: ordered, versioned SQL migrations (empty — feature modules add theirs)
    postgres.ts                   Postgres: createPostgresDatabase(url), pingPostgres(sql) via Bun.sql
  bikes/, tours/, ...        one directory per endpoint (not built yet): routes.ts → service.ts → repository.ts
tests/unit/                bun:test, mirrors src/ (e.g. tests/unit/health/routes.test.ts)
docs/ai-log.md              AI usage log for this project
Dockerfile, docker-compose.yml, .dockerignore    the container path, separate from `bun run dev` (see below)
.github/workflows/ci.yml    format/lint/typecheck/test + docker build+health, on every push/PR
eslint.config.mjs, .prettierignore    lint + format config
```

**Convention:** every endpoint gets its own directory under `src/` —
`routes.ts` registers the routes, `service.ts` holds the business logic,
`repository.ts` is an interface plus its `bun:sqlite` implementation so unit
tests can swap in a fake. `health/` already follows this (minus a
service/repository, since it just reads `ctx.db` directly); `bikes/` and
`tours/` will be added the same way. Only code genuinely shared by every
endpoint — `app.ts`, `server.ts`, `context.ts`, `error-handling.ts`,
`shared/` — stays flat at the top of `src/`, because none of it is itself an
endpoint.

A feature module is a function `(app, ctx) => void` (see `AppModule` in
`src/context.ts`) registered in `src/server.ts`; `ctx` gives it the migrated
database plus `generateId()`/`now()` so its own tests can stub both.

`bun run dev` / `bun run start` run the server directly with Bun — no Docker
involved. The `Dockerfile`/`docker-compose.yml` are a separate path, only
used when you explicitly run `docker compose up` (see "Run with Docker"
above); they don't run automatically and aren't required for local dev.
