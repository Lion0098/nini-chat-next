# Phase 1 — Ubuntu Deployment Foundation Report

**Status: COMPLETE — automated build and Docker Compose runtime smoke tests passed.**  
**Branch:** `phase1/ubuntu-deployment` (not merged to `main`)  
**Latest validated commit:** `8e1b0b5e6671ae144371c250409a8eacc7575eee`  
**Successful runtime workflow:** [Run 39868289923](https://github.com/Lion0098/nini-chat-next/actions/runs/39868289923)  
**Deployment guide:** [`docs/UBUNTU_DEPLOYMENT.md`](UBUNTU_DEPLOYMENT.md)

## Changes made

- Switched the Nitro build target from Vercel to the Node server preset.
- Removed database migrations from `npm run build`; added an explicit `db:migrate:required` command.
- Added a production startup guard requiring `DATABASE_URL`, `BETTER_AUTH_SECRET` (minimum 32 characters), and an HTTPS `BETTER_AUTH_URL`.
- Prevented production from silently using the in-memory PGlite database.
- Removed the shared preview OAuth client fallback in production. OAuth is optional and must use credentials configured by the operator.
- Added `/api/health`, which returns healthy only when a PostgreSQL query succeeds.
- Added a multi-stage Node 22 Dockerfile, Docker Compose with PostgreSQL 16 and a persistent named volume, `.env.example`, `.dockerignore`, and an Nginx TLS reverse-proxy example.
- Added `docs/UBUNTU_DEPLOYMENT.md` with configuration, start, health-check, operational, backup, and restore guidance.
- Repaired and committed the npm lockfile mismatch discovered by the first CI run.
- Added a GitHub Actions workflow that tests a clean install, production build, Compose configuration, Docker image build, app startup, database connectivity, database persistence across a container restart, and app recovery/restart.

## Validation evidence

The latest run [39868289923](https://github.com/Lion0098/nini-chat-next/actions/runs/39868289923) completed successfully. All critical steps passed:

1. `npm ci` — clean locked dependency installation.
2. `npm run build` — production bundle generated.
3. `docker compose config --quiet` — deployment configuration validated.
4. `docker compose build app` — production image built successfully.
5. PostgreSQL and application started successfully through Compose.
6. `/api/health` returned success after app startup.
7. A test row remained present after the PostgreSQL container was restarted.
8. App health recovered after database restart.
9. App health recovered after application restart.
10. Disposable test containers and their test volume were cleaned up.

The initial CI run revealed a stale npm lockfile; it was repaired on this isolated branch. A subsequent runtime-test attempt found an ordering issue in the test workflow (Compose was validated before a disposable `.env` existed); the workflow was corrected and the latest complete run passed. These were resolved during Phase 1.

## Boundaries and remaining production work

- This proves the automated Docker build and basic runtime/persistence smoke tests work on a hosted Ubuntu runner. It does **not** mean the application is deployed to your actual VPS.
- No VPS, firewall, DNS, domain, TLS certificate, or production service was changed.
- CI uses disposable test-only secrets and test data; no production credentials were added to Git.
- A full backup-and-restore drill on a separate test database is still required before production release.
- Email/password registration, optional email verification, SMS.ir OTP, username uniqueness, admin management, groups/channels, and messaging behavior are later phases, not implemented by this deployment foundation.
- The repository's previously identified baseline test failures are not represented as fixed by this deployment work; they must be addressed in the relevant later phases.

## Phase 1 acceptance

The deployment scaffold, clean install, production build, image build, startup/health check, and database/app restart smoke tests are complete and passing. Phase 1 is ready for user review. The next phase must not begin and this branch must not be merged to `main` until the user explicitly approves the Phase 1 result.
