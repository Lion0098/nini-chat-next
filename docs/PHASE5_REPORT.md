# Phase 5 — Admin Security and First Console

## Implemented in this branch
- Additive migration `0006_admin_security.sql` introduces scoped admin role assignments: owner, administrator, moderator, support, and auditor.
- Existing admin profiles are backfilled without changing ordinary accounts; the earliest existing admin is assigned the initial owner role and remaining admins become administrators.
- Legacy privileged console APIs now require an explicit owner/administrator assignment in addition to the existing admin profile flag.
- Added backend-protected dashboard counts, audit-event listing, and owner-only admin-role assignment endpoints.
- Added append-only audit storage with a database trigger preventing update/delete, plus audit records for user create/update/delete, role changes, and report status changes. Audit metadata filters credential-like keys and does not store passwords, tokens, OTPs, or API keys.
- Added static invariant tests for role migration, audit immutability, authorization gates, and mutation audit coverage.

## Important scope notes
- This commit adds the server/API security foundation and dashboard/audit data endpoints; the existing admin UI still needs dedicated role-management and audit-history screens.
- The current user creation screen still uses the existing admin-set password flow. Replacing it with expiring invite/set-password links is a follow-up security item and is not claimed complete here.
- Moderator and support capabilities are intentionally not granted access to legacy full-admin mutation endpoints. Their narrowly scoped moderation/support APIs are not implemented in this phase commit; only owner/administrator and auditor read access are wired.
- The migration and static tests must still be run in the project's PostgreSQL/PGlite test environment, followed by typecheck/build and authorization integration tests. No production database has been changed.

## Verification
- Static invariant test source added at `scripts/admin-security-phase5.test.mjs`.
- Full test suite, typecheck, and production build have not yet been run for this branch.
