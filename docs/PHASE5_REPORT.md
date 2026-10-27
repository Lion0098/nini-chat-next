# Phase 5 — Admin Security and First Console

## Implemented in this branch
- Additive migration `0006_admin_security.sql` introduces scoped admin role assignments: owner, administrator, moderator, support, and auditor.
- Existing admin profiles are backfilled without changing ordinary accounts; the earliest existing admin is assigned the initial owner role and remaining admins become administrators.
- The trusted one-time `admin:bootstrap` script grants the explicit initial owner assignment.
- Legacy privileged console APIs require an explicit owner/administrator assignment in addition to the existing admin profile flag.
- Added backend-protected dashboard counts, audit-event listing, and owner-only admin-role assignment endpoints.
- Added dashboard metrics, a read-only audit-history tab, and owner-only role-assignment controls to the admin UI.
- Added append-only audit storage with a database trigger preventing update/delete, plus audit records for user create/update/delete, role changes, and report status changes. Audit metadata filters credential-like keys and does not store passwords, tokens, OTPs, or API keys.
- Added static invariant tests for role migration, audit immutability, authorization gates, mutation audit coverage, and UI wiring.

## Remaining gaps before Phase 5 acceptance
- The current user-creation screen still uses the existing admin-set password flow. Replacing it with expiring invite/set-password links is not complete.
- Moderator and support capabilities are not granted access to legacy full-admin mutation endpoints, but their narrowly scoped moderation/support APIs are not implemented yet. Auditor read access is wired for dashboard and audit history.
- Ban/unban still uses the existing suspension toggle and does not yet capture reason/duration; session revocation is not exposed as a dedicated audited workflow; account timeline is represented by searchable audit events, not a dedicated per-user timeline view.
- The migration and static tests must still be run in the project's PostgreSQL/PGlite test environment, followed by typecheck/build and authorization integration tests. No production database has been changed.

## Verification
- `node --check` passed for the new static test file.
- Static invariant tests passed in an isolated workbench (`5/5`).
- Full test suite, database migration against PostgreSQL/PGlite, typecheck, and production build have not yet been run for this branch.
