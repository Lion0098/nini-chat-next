# Phase 1 — Ubuntu Deployment Foundation Report

**Status:** Deployment scaffolding implemented; CI caught a pre-existing lockfile mismatch and is being used to repair and validate it.  
**Branch:** `phase1/ubuntu-deployment`  
**Implementation commit:** `0447b22ac33f3ec97a49b4d8023728a6fdb28149`  
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
- Added GitHub Actions validation for a clean install, production build, and Docker image build.

## Static validation performed

- Docker Compose YAML parsed successfully.
- `package.json` parsed and the new `start`/required-migration scripts were verified; build no longer runs migrations.
- Deployment safety assertions passed for the Node server preset, production database guard, production OAuth fallback behavior, and required migration mode.
- `node --check` passed for `scripts/start-production.mjs` and `scripts/migrate.mjs` when checked as `.mjs` files.

## CI finding and current validation status

The first GitHub Actions run failed at `npm ci` before application compilation. The concrete error is a pre-existing mismatch between `package.json` and `package-lock.json` (including an `ajv` 6.x/8.x resolution conflict). This confirms the earlier install problem was not just local networking. The workflow has been updated to regenerate the lockfile, commit it on this isolated branch if changed, then rerun `npm ci`, the production build, and Docker image build. The final run must be checked before calling Phase 1 fully validated.

The current execution environment has no Docker binary, so the image cannot be built locally. No production build, live deployment, PostgreSQL persistence/restart test, or restore test is claimed yet.

No VPS, firewall, DNS, domain, TLS certificate, or production service was changed. No secrets were added to Git. The branch is intentionally not merged into `main` pending validation and user approval.

## Review checkpoint

1. Check the workflow result and ensure the lockfile update (if needed) is committed on this branch.
2. If the clean install, production build, and Docker build pass, review the deployment files and confirm the intended VPS details before deployment.
3. If a step fails, fix it within Phase 1 and rerun validation.
4. Move to Phase 2 only after the user explicitly approves the Phase 1 results.
