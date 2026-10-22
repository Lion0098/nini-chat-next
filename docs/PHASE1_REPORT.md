# Phase 1 — Ubuntu Deployment Foundation Report

**Status:** Implemented in an isolated branch; external build validation pending.  
**Branch:** `phase1/ubuntu-deployment`  
**Commit:** `0447b22ac33f3ec97a49b4d8023728a6fdb28149`

## Changes made

- Switched the Nitro build target from Vercel to the Node server preset.
- Removed database migrations from `npm run build`; added an explicit `db:migrate:required` command.
- Added a production startup guard requiring `DATABASE_URL`, `BETTER_AUTH_SECRET` (minimum 32 characters), and an HTTPS `BETTER_AUTH_URL`.
- Prevented production from silently using the in-memory PGlite database.
- Removed the shared preview OAuth client fallback in production. OAuth is optional and must use credentials configured by the operator.
- Added `/api/health`, which returns healthy only when a PostgreSQL query succeeds.
- Added a multi-stage Node 22 Dockerfile, Docker Compose with PostgreSQL 16 and a persistent named volume, `.env.example`, `.dockerignore`, and an Nginx TLS reverse-proxy example.
- Added `docs/UBUNTU_DEPLOYMENT.md` with configuration, start, health-check, operational, backup, and restore guidance.

## Static validation performed

- Docker Compose YAML parsed successfully.
- `package.json` parsed and the new `start`/required-migration scripts were verified; build no longer runs migrations.
- Deployment safety assertions passed for the Node server preset, production database guard, production OAuth fallback behavior, and required migration mode.
- `node --check` passed for `scripts/start-production.mjs` and `scripts/migrate.mjs` when checked as `.mjs` files.

## Not yet verified

The current execution environment has no Docker binary, so the Docker image has not been built here. The project dependency installation previously timed out, and the existing baseline already has failing tests. This report does **not** claim a successful production build, a successful live deployment, or tested PostgreSQL persistence/restore. A GitHub Actions workflow is added to attempt the clean dependency install and Docker build on the deployment branch; its result must be checked before calling Phase 1 fully validated.

No VPS, firewall, DNS, domain, TLS certificate, or production service was changed. No secrets were added to Git. The branch is intentionally not merged into `main` pending validation and user approval.

## Review checkpoint

1. Check the workflow result for this branch.
2. If the build passes, review the deployment files and confirm the intended VPS details before deployment.
3. If it fails, fix the failure within Phase 1 and rerun validation.
4. Move to Phase 2 only after the user explicitly approves the Phase 1 results.
