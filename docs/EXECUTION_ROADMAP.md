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
Implement email + password + unique username; email verification is optional by default, normal use is allowed before verification, and a verification link can be requested from account Settings. Phone registration uses SMS.ir OTP and a unique username. Start in Sandbox; Production SMS needs explicit owner approval. OTPs are HMAC-hashed, expire, are single-use, have an attempt cap and resend cooldown. Registration-method toggles are enforced server-side and available in the admin System tab. The first admin is bootstrapped explicitly from a trusted server shell; ordinary sign-up never grants admin. Automatic account linking is disabled until an authenticated proof-of-control flow is implemented. Mandatory verification-policy toggles remain in Phase 7. Email verification delivery requires a configured sender.
Acceptance criteria: CI covers migration, username/phone uniqueness, auth contracts, phone normalization, build, and runtime database checks; real browser signup/login/logout and external Sandbox/email delivery must be smoke-tested before production acceptance; no secrets in repo/logs; user approves tested flows.

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
Phase 1 deployment scaffolding is validated on `phase1/ubuntu-deployment` (run `39868289923`). Phase 2 data-model work is validated on `phase2/data-model` (run `39869089304`). Phase 3 authentication implementation is on `phase3/auth-lifecycle`, commit `24c430291c2fb25147324b374ecc248645cb3420`; CI run `39870814285` passed clean install, auth/migration tests, phone normalization tests, production build, Docker build, PostgreSQL schema/uniqueness checks, and restart/persistence checks. Review `docs/PHASE3_REPORT.md`. SMS/email delivery and real browser flows still need testing with credentials configured outside the repository. Automatic account linking remains disabled until a proof-of-control flow exists; mandatory verification policy toggles are assigned to Phase 7. Do not start Phase 4 or merge to `main` until Phase 3 external smoke tests are completed and the user explicitly approves.



## Phase 5 final implementation checkpoint — `phase5/admin-security-console`
The final implementation pass adds owner role grant/revocation with profile-role synchronization, owner protection, reasoned temporary/permanent restrictions, automatic expiry processing on the restricted user's next authenticated request, audited session revocation, dashboard/audit UI, and expanded static invariants. Static invariant suite: 9 unique tests pass. Full project tests, typecheck, production build and live PostgreSQL/PGlite migration execution remain unverified because project dependencies are not installed in the isolated workbench. The follow-up implementation adds email-delivered, hashed single-use invitations (48-hour expiry) and role-scoped moderator/support APIs. External email delivery, full project tests, typecheck, production build and PostgreSQL/PGlite migration execution remain unverified and are required before merge to `main`. Restriction expiry remains lazy rather than scheduler-driven.
