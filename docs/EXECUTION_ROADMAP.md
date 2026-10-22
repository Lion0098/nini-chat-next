# Nini Chat — Phased Execution Roadmap

## Working agreement
- Work proceeds one phase at a time. Do not start the next phase until the user explicitly approves the current phase's results.
- Every phase has scope, deliverables, tests/evidence, a checkpoint, and a rollback-safe commit.
- Keep imported source as the baseline. Prefer small, reviewable commits; do not silently rewrite unrelated functionality.
- Never commit production secrets, API keys, OTPs, private user data, database dumps, or .env files.
- A phase is complete only when acceptance criteria are demonstrated. Documentation alone is not implementation.
- For server actions, inspect the actual VPS, confirm backups and target host before making changes. Do not install packages, open firewall ports, change DNS, or deploy without user approval.
- After each phase, report changed files, commit, tests and results, known risks, and the exact decision needed to proceed.

## Phase 0 — Baseline audit and reproducibility
Goal: establish what the imported code actually does before changing it.
Tasks:
1. Inventory repository files, runtime/framework versions, scripts, auth routes, database schema/migrations, API handlers, uploads, and external services.
2. Check dependency manifest and lockfile consistency; identify preview-only configuration and dead/alternate implementations.
3. Run available tests, typecheck, lint, and production build in a reproducible environment; record exact commands and failures.
4. Map current app flows and identify features that are implemented, partial, mocked, or missing.
5. Check repository hygiene: secrets, .env, ignored build artifacts, license/assets, and binary files.
6. Produce docs/BASELINE_AUDIT.md and a prioritized risk/defect list. No product behavior changes in this phase.
Acceptance criteria:
- Actual project structure and runtime are documented.
- Tests/build status is recorded with reproducible commands.
- Production blockers and unknowns are separated from confirmed defects.
- User reviews the report and explicitly approves Phase 1.

## Phase 1 — Deployment foundation for Ubuntu
Goal: create a reproducible, safe Node.js deployment path without claiming full production readiness.
Tasks:
1. Choose a supported Node.js LTS version compatible with the actual framework/dependencies.
2. Configure and test a Node-compatible production build output (the current repository was found to use a Vercel Nitro preset; replace only after verifying the correct target).
3. Select one deployment approach for the first release (Docker Compose or systemd); document the reason.
4. Add safe environment templates, .gitignore rules, health/readiness endpoint if appropriate, and Nginx/Caddy reverse-proxy example.
5. Define PostgreSQL service/connection, migrations, persistent volumes, and backup/restore steps. Production must fail clearly if required database configuration is missing; no silent in-memory fallback.
6. Test clean install, production build, start, health check, restart, and persistence locally or in an isolated test environment.
Acceptance criteria: documented clean deployment on test Ubuntu; build/start and health checks succeed; database data survives restart; secrets stay out of Git; no production VPS changes without user approval.

## Phase 2 — Data model and durable messaging foundation
Define PostgreSQL migrations for users, identifiers, sessions, conversations, memberships, messages, files, and audit events as needed. Enforce case-insensitive unique usernames at database level, immutable user IDs, timestamps, message ordering/cursors, indexes, and retention behavior. Verify all authorization boundaries and add migration, persistence, and authorization tests.
Acceptance criteria: clean migrations and upgrades work; duplicate/case-variant usernames are rejected; messages and accounts persist across restart; cross-account access tests pass.

## Phase 3 — Authentication and account lifecycle
Implement email + password + unique username; email verification optional by default, with normal use allowed before verification and later verification in account settings. Phone registration requires SMS.ir one-time code and unique username. Start with Sandbox; Production SMS needs explicit approval. Account linking requires an authenticated session and proof of control; never auto-merge accounts. Implement modern password hashing, sessions/logout/revocation, rate limits, hashed OTPs, expiry, one-time use, attempt limits, resend cooldowns, generic errors, and safe logging. Email verification requires a separate email delivery provider. Add backend policy settings for enabled registration methods and mandatory email/phone verification.
Acceptance criteria: tests cover both registration paths, login/logout, unverified-email use, email verification, OTP success/failure/expiry/reuse, rate limits, account linking, and policy toggles; no secrets in repo/logs; user approves tested flows.

## Phase 4 — Core messaging experience
Implement or complete one-to-one conversations, send/receive, paginated history, stable ordering, delivery state, unread counts, authenticated realtime transport (WebSocket or appropriate alternative), reconnect behavior, editing/deletion rules, block/report flow, and safe uploads with private storage and authorization.
Acceptance criteria: two test accounts can chat in real time; history persists after restart; access control and pagination tests pass; unauthorized users cannot access uploads.

## Phase 5 — Admin security and first console
Implement server-side RBAC and protected admin APIs. Define roles for owner/super-admin, administrator, moderator, support, and read-only auditor. Add append-only audit events; never record passwords, OTPs, tokens, or API keys. Build dashboard and user search/details. Add manual account creation via safe invite/set-password flow, profile edits, deactivate/reactivate, ban/unban with reason and duration, session revocation, and account timeline. All permissions must be enforced by the backend.
Acceptance criteria: normal users cannot call admin APIs; privileged mutations are audited; user create/edit/ban/unban workflows pass authorization tests; high-impact actions have safeguards.

## Phase 6 — Groups, channels, and membership history
Define distinct group and channel permission models. Add create/edit/archive, owners/admins, invitations, visibility, join permissions, and ownership transfer. Record join/leave, role changes, removals, and admin interventions. Test role boundaries and unauthorized membership changes.
Acceptance criteria: group/channel flows work end-to-end; membership history is queryable and correctly attributed; unauthorized role changes are rejected.

## Phase 7 — Platform settings, moderation, and operations
Add admin controls for registration methods, mandatory verification, safe rate limits, maintenance mode, feature flags, upload limits, and announcements. Add reports, moderation queue, appeals/notes, and role-limited content access. Add health/metrics for API, database, storage, SMS/email status, errors, and backup freshness. Add log retention, privacy-aware exports, backup/restore drills, and alerts. Switching SMS.ir to Production requires owner-level confirmation.
Acceptance criteria: settings are validated, audited, and enforced server-side; credentials are not displayed; restore drill and basic operational checks succeed.

## Phase 8 — Security, reliability, and first production release
Review authentication, authorization, sessions, input validation, rate limits, uploads, secrets, and dependency vulnerabilities. Test restore, restart recovery, migrations, abuse cases, and rate limits. Configure HTTPS, firewall, non-root service, monitoring, logs, updates, and rollback. Load-test a realistic small deployment and write operator runbook, incident/restore steps, privacy/terms requirements, and release checklist.
Acceptance criteria: no unresolved critical/high-severity blocker without explicit risk acceptance; backup restore tested; monitoring and rollback operational; user explicitly approves production release.

## Phase 9 — Android API readiness and native client
Publish a versioned API contract (OpenAPI or equivalent) and compatibility rules. Define native-client auth/session/token rotation, upload flow, pagination, and device registration. Add push notification registration and delivery. Build Android only after core backend flows and API contract stabilize. Test web and Android against the same backend and account data.
Acceptance criteria: API contract is versioned; Android can sign in, chat, and receive notifications without browser-only behavior; backend changes are backward-compatible or versioned.

## Phase 10 — Advanced features
Each feature is separately scoped and approved: voice messages; search, replies, reactions, pins, and richer message controls; device/session management; voice/video calls with WebRTC signaling and TURN; end-to-end encryption only with deliberate cryptographic design and security review; additional integrations and community features. Each feature gets tests, security review, and explicit approval.

## Current checkpoint
Phase 0 is complete and documented in `docs/BASELINE_AUDIT.md`. Phase 1 deployment scaffolding and automated validation are complete on the isolated branch `phase1/ubuntu-deployment`; it is not merged into `main`. Latest workflow run `39868289923` passed clean dependency install, production build, Docker Compose validation, image build, app startup/health, PostgreSQL data persistence across container restart, and app recovery/restart. Review `docs/PHASE1_REPORT.md` and `docs/UBUNTU_DEPLOYMENT.md`. A CI smoke test is not a substitute for a backup/restore drill or deployment on the actual VPS. Do not start Phase 2 or merge to `main` until the user reviews the evidence and explicitly approves.