# Continuous Integration (P3)

The active workflow is [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) at the repository root. It runs on pushes to `main`, `develop`, `feature/**`, and `fix/**`, on pull requests that change `Code/` or the workflow, and by manual dispatch. Feature work should enter `main` through a reviewed pull request. The teacher can run the same checks locally using the commands below and trigger the workflow manually with repository access.

## Test stages and build result

The `test` job installs the locked dependencies with Bun 1.3.13, then checks formatting, lint, types, isolated endpoint unit tests, and the integration tests. The integration tests run against a PostgreSQL 16 service container (`app_test` database) started by the job. The `docker-build` job runs only after these checks pass. It builds `biketouren:<commit SHA>`, starts the API container and one PostgreSQL container, waits for the health endpoint, and runs a system smoke test that creates and lists a bike and a tour. The image tag is the exact build result that a later P3b publish step can push to a registry; P3 does not publish it.

`bun test tests/unit` covers route validation, successful results, empty lists, conflicts, and dependency failures with fake repositories, bike lookups, and a fake SQL client. `bun test tests/integration` runs the migrations and the full app against real PostgreSQL, including the unique frame-number constraint and the bike check for tours. `bun tests/system/smoke.ts` checks the running Compose stack, including PostgreSQL startup, creation, listing, duplicate frames, and unknown bikes.

## Variants evaluated

| Variant | Jobs and checks | Result and decision |
| --- | --- | --- |
| Original workflow in repository history | One fast test job, then Docker build and `/health` | Its recorded local run passed 25 tests and one healthy Docker API (see `docs/ai-log.md`, 2026-09-21 CI entry). It could not detect a broken bike-to-tour request. |
| Two-service workflow (commit `2100160`) | Fast checks and HTTP integration in one job, then Docker build and a real API workflow in the second job | Passed in run #2. Replaced when the services were merged into one. |
| Current workflow | Same two jobs; the test job starts a PostgreSQL service container for the integration tests, and the Docker job runs one API and one database | Selected. The app now uses PostgreSQL only, so the integration tests must use a real database; the system test exercises the built image. |

The test stages stay in one fast job because they share the same dependency install and run quickly. Docker runs in a later job because its setup is slower and it needs PostgreSQL. Repeated pushes to the same branch cancel older runs. The workflow uses a frozen lockfile and a pinned Bun version for reproducibility. Docker image caching is left to the runner; it can be evaluated after run times are available.

## Local validation and review record

Local validation on 2026-09-28: `bun test tests/unit` passed 40 tests; `bun test tests/integration` passed 3 tests; format, lint, and typecheck passed. `docker compose build bikes`, `docker compose up -d --no-build`, and the Compose smoke test passed with two healthy PostgreSQL-backed APIs. A first smoke run found that Bun's PostgreSQL error exposes SQLSTATE `23505` as `errno`; after correcting the conflict mapping, the next smoke run passed. Direct database checks showed `bikes` only in the bike database and `tours` only in the tour database. [GitHub Actions run #2](https://github.com/cediackermann/m324-gruppe3/actions/runs/36397835527) for commit `2100160` completed successfully: static checks and tests took about 15 seconds, and Docker build and system test about 43 seconds. A pull request should include this CI run link and reviewer comments; the root pull request template asks for both. The D3 process document is not present in this checkout, so its rules still need to be checked by the team during review. Pull request approval remains pending.

## AI review

Prompt: "Review the existing CI workflow against the Bike Tours P3 requirements and issues #5-#12."

Observation: The prior Docker job only checked `/health`, so it could pass when bike creation, tour creation, or the HTTP dependency was broken. Its workflow was also duplicated under `Code/.github/workflows/`, where GitHub Actions does not run it.

Change: The root workflow now runs the integration test and a Compose smoke test; the duplicate workflow was removed. The smoke test checks both API lists after creation. The image is tagged with the commit SHA.

Validation: The local unit and integration tests passed, and the Compose build and smoke test passed after correcting the PostgreSQL conflict mapping. Both jobs also passed in [GitHub Actions run #2](https://github.com/cediackermann/m324-gruppe3/actions/runs/36397835527). The two-job layout gave separate, readable results with a total job duration of about one minute, so the team is keeping it for this version.
