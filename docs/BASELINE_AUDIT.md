# Nini Chat — Phase 0 Baseline Audit

**Audit date:** 2026-10-23  
**Scope:** Read-only inspection of the uploaded Chat-nini-main-1.zip, local test attempts, and private GitHub repository Lion0098/nini-chat-next.  
**Status:** Phase 0 findings recorded. No application source files were changed in this phase.

## Executive summary

The project is a substantial prototype with an existing React/TypeScript web client, server functions, PostgreSQL-compatible schema, email/password authentication through Better Auth, a basic admin screen, groups/chats, reports, statuses, and call signaling. It is **not yet ready for production deployment on Ubuntu**. The main work is not starting from zero: it is consolidating the intended runtime, replacing preview-specific assumptions, hardening bootstrap/admin access, and implementing the agreed account and messaging requirements.

The repository has a private main branch and its tree contains 290 entries at audit time, including application source, migrations, scripts, the PHP alternative, and project documents. The uploaded ZIP contains 221 filesystem files (about 3.4 MB extracted). Key source files and the architecture described in the archive were inspected.

## Current technology and structure

- **Web/client:** React 19, TypeScript, Vite 8, TanStack Router/Start, Tailwind CSS.
- **Server/API:** TanStack Start server functions and routes; Better Auth for sessions and email/password, plus Grok OAuth-broker integration.
- **Database:** PostgreSQL via pg when DATABASE_URL is configured; otherwise PGlite embedded in memory.
- **Schema/migrations:** migrations/0001_auth.sql, migrations/0002_messenger.sql, plus a second auth schema copy under migrations/auth/.
- **Realtime:** the README describes AJAX polling; the call/signaling route exists, but a production WebSocket service has not been demonstrated.
- **Media:** message files, status media, and avatars are currently stored as base64/text data in PostgreSQL rather than external/private object storage.
- **Alternative implementation:** hosting/ contains a separate PHP/MySQL app intended for cPanel. Its runtime and data model are distinct from the Node/TypeScript application. For the selected Ubuntu VPS path, the TypeScript application should be treated as the primary implementation unless a deliberate migration decision says otherwise.
- **Deployment configuration:** vite.config.ts uses Nitro's Vercel preset for build/preview. startup.sh is preview-oriented and launches PHP's built-in server from /workspace/hosting; it is not a production Node.js deployment script.

## Confirmed blockers and risks

### P0 — Must resolve before public production

1. **First-user admin promotion:** src/server/api.ts → ensure() promotes a profile to admin when no other admin exists. With public registration enabled and no pre-provisioned admin, the first account that reaches this path can receive admin rights. Replace this with a deliberate, one-time, owner-controlled bootstrap process before opening registration publicly.
2. **Preview-specific authentication defaults:** src/lib/auth/server.ts defaults to a Grok auth broker and preview client credentials when deployment variables are absent. Production auth must fail closed unless the chosen self-hosted providers and required secrets/base URL are explicitly configured. Do not rely on the shared preview broker as the product's permanent identity system.
3. **No verified Ubuntu production build path:** the current Vite/Nitro configuration targets Vercel and the startup script runs the PHP variant. A supported Node server output and repeatable start/restart process have not been demonstrated.
4. **PGlite is an in-memory fallback:** when DATABASE_URL is missing, src/lib/db.ts selects PGlite in memory. That data can be lost on process restart. Production must require a durable PostgreSQL database and must not silently fall back.
5. **Agreed SMS authentication is not implemented:** the inspected TypeScript auth flow contains email/password and Grok OAuth buttons, but no SMS.ir OTP registration/sign-in integration was found. Phone storage/uniqueness in the profile schema is not proof of phone ownership.
6. **Email verification delivery is not demonstrated:** the inspected Better Auth configuration does not define a production email-verification delivery flow. Optional verification can be the default product policy, but verification-on-demand still needs a configured email delivery provider and secure token flow.

### P1 — Important architecture/product gaps

1. **Username registration is not fully atomic:** signup creates the Better Auth account and then separately calls saveProfile() to set the username. The database has a case-insensitive unique index, which is good, but if username saving fails after account creation the user may be left with an account without the intended username/profile. Normalize/validate consistently and handle this flow transactionally or with a safe recovery path.
2. **Migrations are duplicated and tests disagree with the tree:** migrations/0001_auth.sql exists at the migration root and migrations/auth/0001_auth.sql also exists. A migration-plan test expects the auth schema to exist only under the subdirectory and currently fails. Establish one canonical schema/migration strategy.
3. **Migrations may run during build:** npm run build invokes npm run db:migrate; scripts/migrate.mjs applies SQL to DATABASE_URL when set. Production database mutations should be an explicit deploy/release step, not an accidental side effect of compiling/building.
4. **Admin console is partial:** current admin server functions cover user list/edit/create/delete, group list/update/delete, reports, and a small set of settings. The current settings are signup enabled, upload limit, and maintenance message. No comprehensive immutable admin audit log, granular RBAC, membership timeline, or admin toggles for required email/SMS verification were found.
5. **Manual account creation UX/security needs redesign:** the admin form currently accepts a password directly and renders its field as ordinary text. Prefer an invite or one-time set-password flow; do not let administrators view or retain plaintext credentials.
6. **Media storage will constrain growth:** message files, avatars, and statuses are stored in database fields. This is acceptable for a small prototype but is not a good long-term media architecture for a growing messaging service. Plan private file/object storage with per-file authorization and retention.
7. **Realtime and calls need validation:** the README describes polling, while call signaling is implemented separately. There is no evidence yet of reliable multi-client realtime delivery, production TURN configuration, or end-to-end voice/video testing.
8. **Two implementations create maintenance risk:** PHP/MySQL and TypeScript/PostgreSQL should not both be extended as equal production implementations unless shared API/data contracts and a migration strategy are deliberately defined.

## Current authentication versus agreed target

**Observed now**
- Email/password sign-up and sign-in exist in the UI and Better Auth configuration.
- Signup UI asks for a username, email, password, and display name; username is written after the auth account is created.
- Grok Google/X OAuth provider buttons are present.
- Profile schema has nullable username and phone fields and a case-insensitive username unique index.
- Phone uniqueness is enforced for non-empty values, but no SMS OTP verification was found.
- Email verification is not mandatory in the current UI flow, but a production email-verification workflow is not demonstrated.
- The first-user admin promotion logic is present.

**Required target**
- Email + password + unique username, usable immediately without email verification by default.
- Optional email verification from account settings.
- Phone registration using SMS.ir OTP (Sandbox first) and unique username.
- Secure linking of a verified phone/email to an existing account only after authentication and proof of ownership; no automatic account merge.
- Server-enforced, future admin-controlled switches for enabled registration methods and mandatory email/phone verification.
- Production secrets held only in server-side environment configuration.

## Tests and reproducibility

Environment used for the local read-only checks:
- Node.js v22.16.0, npm 10.9.2, PHP 8.4.24.
- node_modules/ was absent in the uploaded project.
- npm ci --ignore-scripts --no-audit --no-fund timed out after 180 seconds, so a clean dependency install could not be completed in this environment.

Results:
- node --test 'scripts/**/*.test.mjs': **184 passed, 13 failed, 197 total**.
- node --experimental-strip-types --test ... on the selected TypeScript test files: **10 passed, 2 failed**. The two failed test files could not import missing packages (ERR_MODULE_NOT_FOUND, including jose), so these are not a complete behavioral verdict.
- php -l on the 7 PHP files: **7 passed, 0 syntax errors**.
- npm run typecheck: blocked because dependencies/types are not installed ( @types/node and vite/client missing).
- npm run lint: could not run because eslint is not installed.
- node scripts/check-auth-invariant.mjs: failed to read the resolved dev server VITE_AUTH_ENABLED because the Vite/dependency environment was not available.

The 13 Node-script test failures cluster around:
- the shipped .grok/app-env.json missing the expected VITE_AUTH_ENABLED=false setting (four checks including the invariant check);
- metadata/PWA plugin expectations for title/OG metadata (seven checks);
- a migration test expecting the auth schema to remain only under migrations/auth/ (one check).
The exact failures should be re-run after dependency installation before deciding which represent code defects versus stale tests/fixtures.

## Repository hygiene

- .gitignore excludes .env, .env.*, node_modules, build output, and the PHP runtime config.
- The initial filename/pattern scan did not find obvious private-key blocks or AWS access-key patterns. This is not a substitute for a full secret scanner.
- Do not commit SMS.ir keys, Better Auth secrets, database credentials, real OTPs, or user data.

## Recommended order from the findings

1. Resolve the dependency/install and test reproducibility problem so the baseline can be re-run.
2. Decide the production Node/Nitro target and remove preview-only deployment assumptions without changing user-facing features yet.
3. Make production database configuration mandatory and move migrations to an explicit deployment step.
4. Replace first-user admin promotion with a secure bootstrap and audit the admin authorization model.
5. Implement the agreed username/email/SMS authentication flows and verification policy controls.
6. Continue with durable messaging, media storage, and the expanded admin console.

## Phase 0 decision checkpoint

Phase 0 findings are documented; no application code was changed. Before Phase 1, review this report and approve proceeding with the Ubuntu deployment foundation. The first implementation commit should address only the selected deployment foundation and should not yet implement SMS login or rewrite unrelated UI features.
