# Continuous Deployment: decisions and evidence

This document explains why the current deployment solution was chosen, per assessment criterion. It records only what was actually implemented, observed, or decided. Untested points are marked as such. Setup and operation are described in [`cd.md`](cd.md).

**Final solution:** one Docker web service on Render (free plan, Frankfurt) and a PostgreSQL database on Neon (free plan, Frankfurt). GitHub Actions tests every commit. Render deploys a new commit on `main` only after all GitHub Actions checks on it have passed (auto-deploy trigger "After CI checks pass", [`render.yaml`](../../render.yaml)). Live: <https://m324-gruppe3.onrender.com/health>

## 1. CD processes and variants

**Preparation.** Before deploying, the two services (bikes, tours) with two databases were merged into one service with one PostgreSQL database (PR [#18](https://github.com/cediackermann/m324-gruppe3/pull/18)). That reduced hosting to one web service and one database and removed the HTTP call between services, which would have needed two cold starts on a free tier.

| Variant | Status | Result |
| --- | --- | --- |
| A. Own Linux server (Oracle Always Free VM, or a self-hosted GitHub runner) with Docker Compose | Evaluated, not implemented | Needs a credit card (Oracle) or a machine that is always on. The team chose a hosted service instead. |
| B. Free PaaS with SQLite | Rejected | Free PaaS tiers have no persistent disk, so the SQLite file would be lost on every deploy. This led to PostgreSQL only. |
| C. Deploy job in GitHub Actions calling Render's deploy hook (`ref=<SHA>`), waiting until `/health` reports the SHA, read-only production checks, automatic rollback | Implemented (PR [#19](https://github.com/cediackermann/m324-gruppe3/pull/19), [#20](https://github.com/cediackermann/m324-gruppe3/pull/20)), then removed | Both runs on `main` failed at the hook step: [run 39223351254](https://github.com/cediackermann/m324-gruppe3/actions/runs/39223351254) with `curl: (3) Malformed input to a URL function` (reproduced locally with a trailing newline in the secret, fixed in #20), and [run 39224588412](https://github.com/cediackermann/m324-gruppe3/actions/runs/39224588412) because the secret was not a valid Render deploy hook. Deploy hooks belong to Render's paid plans since its 2026 plan change. |
| D. Render auto-deploy "On Commit" | Observed, rejected | Render deployed `main` without waiting for CI. Run 39224588412 logged `Live version before deploy: 5ea2f86…`, its own commit, before the deploy job did anything. Untested code could therefore go live. |
| E. Release through a `production` branch that Render auto-deploys, moved only by CI | Designed, discarded before testing | Not needed once variant F was available. |
| F. Render auto-deploy "After CI checks pass" | **Final** (PR [#21](https://github.com/cediackermann/m324-gruppe3/pull/21)) | Render deploys a commit on `main` only after all GitHub Actions checks on it have passed and skips it if one fails. No deployment credentials in GitHub. |

**Continuous Delivery vs. Continuous Deployment.** The final solution is Continuous Deployment: every commit on `main` that passes CI goes live without a manual step. Continuous Delivery would only need Render's auto-deploy turned off, so that a person starts each deploy in the Render dashboard; this was not used.

**Why F.** It is the only tested variant that is free, deploys only tested commits, and needs no extra infrastructure. It gives up the automatic version check and rollback of variant C (see sections 4 and 5).

## 2. Branching strategy and versioning

- **Branches:** work happens on `feature/*`, `fix/*`, and similar branches and reaches `main` through pull requests. CI ([`ci.yml`](../../.github/workflows/ci.yml)) runs on every push to these branches and on every pull request. Only `main` is deployed: Render watches `main` only, so other branches and pull requests never reach production.
- **`main` is production.** Every commit on `main` that changes `Code/` and passes CI is deployed. Commits that change nothing under `Code/` (for example `Theorie/`) do not trigger a deploy, because `Code/` is Render's root directory.
- **Version = Git commit SHA.** CI builds the image as `biketouren:<SHA>`; `GET /health` reports the running commit in `version` (`RENDER_GIT_COMMIT` on Render, `APP_VERSION` in Compose). The CI Docker job checks that `/health` reports exactly the tested SHA. Any deployed state can therefore be traced to one commit and its CI run.
- **No SemVer tags or releases.** With Continuous Deployment every commit on `main` is a release, so the commit SHA is the version.
- **Not in place:** `main` has no branch protection (checked on 2026-10-26). A direct push to `main` would also be deployed, as long as CI passes.

## 3. Scalability and availability

- **Availability:** one instance on Render's free plan, without redundancy and without an SLA. The service sleeps after about 15 minutes without requests; the next request takes up to a minute. A commit with a failing check is not deployed, so the previous version keeps running.
- **Health check:** `/health` queries the database. Render uses it as the service's health check path (`healthCheckPath` in `render.yaml`).
- **Database:** managed PostgreSQL on Neon, separate from the app. The app keeps no state of its own (no local files, no sessions in memory).
- **Scalability:** because the app is stateless, it could run on several instances on a paid Render plan without code changes. One change would be needed then: migrations currently run on startup, which is only safe with a single instance, so they would move to a separate step before the deploy.
- **Why accepted:** a school project with little traffic, and free hosting was a requirement. Cold starts and the single instance are the price of the free plan.

## 4. Rollout

- **Applied:** a quality-gated, all-at-once rollout. A new commit replaces the running version only after the `test` job (format, lint, types, unit and integration tests against PostgreSQL) and the `docker-build` job (image build, Compose system smoke test, version check) have passed.
- **Observed deploys:** `9ddca56` (live on 2026-10-19) and `5ea2f86` (live on 2026-10-19, logged by run 39224588412), both still via variant D; `beeb249` (the PR #21 merge, live when checked on 2026-10-26 07:24 UTC). Whether Render waited for the checks on `beeb249` was not recorded.
- **Not implemented:** Blue/Green, Canary, and feature toggles. The free plan runs a single instance with no way to split traffic between two versions; Blue/Green or Canary would need a second service and a proxy or paid features.
- **Pending validation:** a commit pushed to `main` should first show Render waiting for the GitHub checks, then the deploy, and finally `/health` reporting the new SHA. This has not been recorded yet.

## 5. Rollback

**Emergency plan for a bad release:**

1. **Detect:** `/health` returns an error or reports an unexpected `version`, or Render shows a failed deploy.
2. **Roll back:** in the Render dashboard, open **Events**, choose an earlier successful deploy, and click **Rollback**. Render then also pauses auto-deploy, so a new commit cannot override the rollback.
3. **Fix:** revert or fix the commit through a pull request. CI tests it, and once auto-deploy is turned back on, Render deploys it.
4. **Database:** migrations are not rolled back. They must stay compatible with the previous app version (add columns instead of renaming or dropping them), so that a rollback of the app alone is safe.

- **Previously implemented:** variant C had an automatic rollback (redeploy the previously live SHA after a failed production check). It never ran, because both runs failed one step earlier at the deploy hook, and it was removed with the deploy job in PR #21.
- **Not yet tested in practice:** neither a dashboard rollback nor a revert deploy has been performed.

## 6. Monitoring and health-check evidence

- **`GET /health`** checks the database connection and reports the running commit. Check on 2026-10-26 07:24 UTC:

  ```json
  { "status": "ok", "database": "ok", "version": "beeb249b28133b93fef8ef200a58fa7ba91fac3a" }
  ```

  `beeb249` is the newest commit on `main` at that time, so the deployed version matches the repository.
- **In CI:** the `docker-build` job waits until `/health` of the built image answers with the tested SHA and then runs the system smoke test, for example [run 39225301341](https://github.com/cediackermann/m324-gruppe3/actions/runs/39225301341) for `beeb249`.
- **On Render:** `/health` is the health check path; deploy events and logs are visible in the Render dashboard.
- **Check it yourself:**

  ```bash
  curl -s https://m324-gruppe3.onrender.com/health
  git log origin/main -1 --format=%H
  ```

## 7. AI use

All AI suggestions were checked against documentation, local runs, or real CI and deploy results before being adopted. Details are in [`ai-log.md`](ai-log.md).

| AI suggestion | Validation | Decision |
| --- | --- | --- |
| Self-hosted runner on an own machine as the easiest free option | Compared with hosted services | Rejected by the team: needs a machine that is always on |
| Keep SQLite for local tests and use PostgreSQL in production | Team weighed it against a simpler single driver | Team chose PostgreSQL only; the AI rewrote the tests to run against a real PostgreSQL in Compose and CI |
| Merge both services into one | Checked that the assignment allows it; 31 unit and 7 integration tests, Docker smoke test, CI run | Adopted (PR #18) |
| Deploy hook with commit SHA, version check, automatic rollback | Render docs checked; deployed on `main` | Rejected: hook URL failed (newline, then invalid value), and deploy hooks need a paid plan. The AI's first assumption that hooks are free was wrong |
| Release through a `production` branch | Not tested | Discarded |
| Team: "Render deploys automatically, remove our pipeline". AI: only with "After CI checks pass", because "On Commit" deploys untested code | Observed in run 39224588412 (variant D) | Adopted (PR #21) |
| Neon: direct connection string without `channel_binding` | Not verified separately; the first Render deploy failed on the database connection and worked after the string was corrected | Adopted |
| Protect `main` (pull request and passing checks required) | — | Not implemented |
