# Ticketing / Continuous Improvement (Z2)

## Choice and repository fit

Use **GitHub Issues**: development already uses issues (#5–#12), and the pull request template asks for issue links and review evidence. Alternatives such as Jira Service Management or Zammad would add another system and GitHub integration. An issue form, labels, assignees, and issue history cover this project's support flow.

The application lives in `Code/` (Bun, Fastify, PostgreSQL, Docker). Short-lived `feature/**` and `fix/**` branches enter `main` through reviewed pull requests. [CI](ci.md) runs static checks, unit/integration tests, Docker build, and a system test; on `main`, the tested image is also published to GHCR. [Render](cd.md) deploys changes under `Code/` after checks pass. Z2 uses this process unchanged.

## One-time GitHub setup

1. Enable **Issues** in repository settings if needed. Customers need a GitHub account; a private repository also requires an invitation. Intake is through GitHub, without anonymous or email submission.
2. Under **Issues → Labels**, create the labels below. [Form labels must already exist](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms). Reuse `bug`, or create it if missing, for confirmed defects. Keep other existing labels.

   | Label | Meaning |
   | --- | --- |
   | `support` | Customer ticket; retained throughout its lifetime |
   | `support:l1` | Currently handled by first-level support |
   | `support:l2` | Currently handled by second-level support |

3. Name the responsible L1/L2 users and give them **Write** access. L1 watches repository issues and checks the unassigned L1 queue; the first supporter taking a ticket assigns themselves.
4. After review and merge into `main`, share [the customer form](https://github.com/cediackermann/m324-gruppe3/issues/new?template=support.yml). Its definition is [`.github/ISSUE_TEMPLATE/support.yml`](../../.github/ISSUE_TEMPLATE/support.yml).
5. The repository administrator (`cediackermann`) must protect `main` in **Settings → Branches**: require a PR, at least one other member's approval, and the existing **Static checks and tests** and **Docker build and system test** checks. These requirements are currently not enforced (see verification below). The authenticated account has Write access, without administration rights.

## Support flow

1. **Customer:** submit the problem, expected result, and impact; optionally add reproduction steps and environment/version. The open ticket receives `support` and `support:l1`.
2. **L1:** check `is:issue is:open label:support label:support:l1`, assign yourself, and reply with an assessment, questions, or solution. Every ticket starts here, including suspected bugs.
3. **Escalation:** comment findings, reproduction steps, attempted solutions, and escalation reason. On the **same issue**, replace `support:l1` with `support:l2`, retain `support`, and assign the agreed L2 supporter. L2 uses `is:issue is:open label:support label:support:l2`. The ticket ID, conversation, and history remain intact.
4. **L2:** investigate and add `bug` for confirmed defects. Use the development process below for fixes. To return to L1, comment the findings, replace the level label, and reassign the same ticket.
5. **Resolution:** document the solution. For fixes, link the successful Render deployment and verify `/health`'s `version` against the deployed commit before closing as **Completed**. Close confirmed support solutions as Completed; duplicates/withdrawals as **Not planned**, with an explanation. Reopen persistent problems. Retain `support` and the final level label on closed tickets.

## Bugfixes, review, and commit links

For example ticket `#123`, branch from current `main` as `fix/123-short-description` (or `feature/123-short-description` for features). Both match CI triggers. Reference the ticket in each relevant commit: `fix: handle duplicate frames (refs #123)`.

Put `Refs #123` in the PR template's **Issue(s)** field with test/CI evidence. Merge after another member's approval and passing CI; Render then deploys `main`. Keep the reference in squash commit messages too. Avoid auto-closing `Fixes #123` / `Closes #123` so support can verify deployment before closure. GitHub handles [issue links and closing keywords](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) directly.

## Data available to Z1

`support` identifies customer tickets throughout escalation, closure, and reopening. Z1 can read existing GitHub data; Z2 adds no metric calculation.

| Source | Fields available to Z1 |
| --- | --- |
| [Issues REST API](https://docs.github.com/en/rest/issues/issues#list-repository-issues) | `number`, `html_url`, `created_at`, `updated_at`, `closed_at`, `state`, `state_reason`, `labels`, `assignees` |
| [Issue comments](https://docs.github.com/en/rest/issues/comments#list-issue-comments) | Author, `created_at`, and reply text for identifying the first human support response |
| [Issue timeline](https://docs.github.com/en/rest/issues/timeline#list-timeline-events-for-an-issue) | Timestamped label, assignment, closure, reopening, and linked development activity |

Read `GET /repos/cediackermann/m324-gruppe3/issues?state=all&labels=support&per_page=100`; exclude entries containing `pull_request`. Read `/issues/{number}/comments` and `/issues/{number}/timeline` for history. Follow pagination on all endpoints. Private data needs repository access with Issues read permission.

These records support volume, resolution time, first-response, and escalation analysis. Use historical `support:l2` events for escalations, including tickets returned to L1. `updated_at` is not first response; `closed_at` is not deployment time. Distinguish Completed from Not planned and account for reopenings. Z1 owns definitions and evaluation.

## Verification

Locally validate YAML, required fields, and initial labels. After setup and merge, perform this acceptance check:

1. Submit a clearly marked test ticket; verify L1 labels/queue, self-assignment, and a reply.
2. Escalate with handover, label replacement, and reassignment; verify the same ID, answers, and comments.
3. For the next real fix, verify branch/commit/PR references, review, CI, deployment, and `/health` before resolution.
4. Close the test as Not planned with an explanation; verify timestamps and escalation history through the API.

Verified through GitHub CLI on 2026-10-26: the repository is public, Issues are enabled, and the existing collaborators have Write access or higher. Created and re-read `support`, `support:l1`, and `support:l2`; `bug` already exists. The ticket API request succeeds and returned no support tickets at verification. Both jobs in the [CI run for main at initial verification](https://github.com/cediackermann/m324-gruppe3/actions/runs/40287595966) passed.

`main` reported `protected: false`, and its effective rules list was empty. Admin setup remains necessary. The team must also name its L1/L2 supporters. The form becomes available after this branch is reviewed and merged into `main`; customer submission and live escalation acceptance remain pending until then.
