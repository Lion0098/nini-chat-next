# Phase 1 — Ubuntu Deployment Foundation Report

**Status:** Deployment scaffolding implemented. Clean install, production build, and Docker image build have passed on GitHub Actions; runtime integration checks are now being added.  
**Branch:** `phase1/ubuntu-deployment`  
**Lockfile repair commit:** `0d338224fe3ba492b8ef150c14e427e9c3e9ef35`  
**Validation workflow:** [Phase 1 Ubuntu deployment build](https://github.com/Lion0098/nini-chat-next/actions/workflows/phase1-deployment.yml)

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
- Added GitHub Actions validation for clean install, production build, Docker Compose configuration, image build, and runtime checks.

## Confirmed validation

The successful workflow run [39867452546](https://github.com/Lion0098/nini-chat-next/actions/runs/39867452546) passed all of these steps:

- `npm ci` — clean locked dependency installation.
- `npm run build` — production bundle generation.
- `docker build --tag nini-chat:phase1 .` — production image build.

The first workflow run failed before compilation due to the stale npm lockfile. The lockfile was regenerated and committed by GitHub Actions on this branch; the subsequent clean install/build/image build all passed.

## Runtime validation now being added

The workflow now runs the application and PostgreSQL together via Docker Compose, waits for `/api/health`, checks that a PostgreSQL probe row survives a database container restart, and verifies application health after database and app restarts. These checks must complete successfully before we treat the runtime portion as validated.

## Scope and remaining limits

- No VPS, firewall, DNS, domain, TLS certificate, or production service was changed.
- The CI test uses disposable data and test-only random secrets. No production secrets are stored in Git.
- A CI persistence check is not a full backup-and-restore drill; that still needs to be performed before production release.
- Email/password flows, SMS.ir integration, app functionality, and the planned admin panel are later phases, not part of this deployment foundation.
- The branch is intentionally not merged into `main` pending final validation and user approval.

## Acceptance checkpoint

1. Confirm the latest workflow passes the clean install, production build, image build, startup/health, database restart persistence, and application restart steps.
2. Review `docs/UBUNTU_DEPLOYMENT.md` and confirm VPS details before any real deployment.
3. Before production release, perform a protected backup-and-restore test and configure real DNS/TLS and firewall rules.
4. Move to Phase 2 only after the user explicitly approves Phase 1.
