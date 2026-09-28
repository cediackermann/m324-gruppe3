# Continuous Integration (P3)

The active workflow is [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) at the repository root. It runs on pushes to `main`, `develop`, `feature/**`, and `fix/**`, on pull requests that change `Code/` or the workflow, and by manual dispatch. Feature work should enter `main` through a reviewed pull request. The teacher can run the same checks locally using the commands below and trigger the workflow manually with repository access.

## Test stages and build result

The `test` job installs the locked dependencies with Bun 1.3.13, then checks formatting, lint, types, isolated endpoint unit tests, and the HTTP integration test. The integration test starts two Fastify servers with different in-memory SQLite databases, so it needs no external service. The `docker-build` job runs only after these checks pass. It builds `biketouren:<commit SHA>`, starts two API containers and two PostgreSQL containers, waits for both health endpoints, and runs a system smoke test that creates and lists a bike and a tour. The image tag is the exact build result that a later P3b publish step can push to a registry; P3 does not publish it.

`bun test tests/unit` covers route validation, successful results, empty lists, conflicts, and dependency failures with fake repositories and bike lookups. `bun test tests/integration` checks a real HTTP request from the tour service to the bike service and verifies that the tour database has no bike table. `bun tests/system/smoke.ts` checks the running Compose stack, including PostgreSQL startup, creation, listing, duplicate frames, and unknown bikes.

## Variants evaluated

| Variant | Jobs and checks | Result and decision |
| --- | --- | --- |
| Original workflow in repository history | One fast test job, then Docker build and `/health` | Its recorded local run passed 25 tests and one healthy Docker API (see `docs/ai-log.md`, 2026-09-21 CI entry). It could not detect a broken bike-to-tour request. |
| Current workflow | Fast checks and HTTP integration in one job, then Docker build and a real API workflow in the second job | Selected. Fast failures stop before the Docker build; the system test exercises the built image and the cross-service contract. |

The test stages stay in one fast job because they share the same dependency install and run quickly. Docker runs in a later job because its setup is slower and it needs PostgreSQL. Repeated pushes to the same branch cancel older runs. The workflow uses a frozen lockfile and a pinned Bun version for reproducibility. Docker image caching is left to the runner; it can be evaluated after run times are available.

## Local validation and review record

Local validation on 2026-09-28: `bun test tests/unit` passed 40 tests; `bun test tests/integration` passed 3 tests; format, lint, and typecheck passed. `docker compose build bikes`, `docker compose up -d --no-build`, and the Compose smoke test passed with two healthy PostgreSQL-backed APIs. A first smoke run found that Bun's PostgreSQL error exposes SQLSTATE `23505` as `errno`; after correcting the conflict mapping, the next smoke run passed. Direct database checks showed `bikes` only in the bike database and `tours` only in the tour database. A pull request should include the hosted CI run link and reviewer comments; the root pull request template asks for both. The D3 process document is not present in this checkout, so its rules still need to be checked by the team during review. GitHub-hosted run logs and pull request approval cannot be recorded until this change is pushed and reviewed.

## AI review

Prompt: "Review the existing CI workflow against the Bike Tours P3 requirements and issues #5-#12."

Observation: The prior Docker job only checked `/health`, so it could pass when bike creation, tour creation, or the HTTP dependency was broken. Its workflow was also duplicated under `Code/.github/workflows/`, where GitHub Actions does not run it.

Change: The root workflow now runs the integration test and a Compose smoke test; the duplicate workflow was removed. The smoke test checks both API lists after creation. The image is tagged with the commit SHA.

Validation: The local unit and integration tests passed, and the Compose build and smoke test passed after correcting the PostgreSQL conflict mapping. A hosted run is not claimed here. The team should keep the two-job layout if its logs show useful failure isolation and acceptable runtime; otherwise it should revisit the split based on measured runs.
