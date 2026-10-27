# Phase 5 — Admin Security and Console (final implementation pass)

## Implemented
- Scoped admin role assignments for owner, administrator, moderator, support and auditor.
- Explicit owner bootstrap and backend authorization gates for privileged admin APIs.
- Owner-only role grant/revocation; profile role and explicit assignment remain synchronized; owner cannot be demoted via the console.
- Dashboard metrics and searchable, read-only audit history.
- Append-only audit log protected by a database trigger. Credential-like metadata keys are filtered.
- Audit events for user create/update/delete, role changes/revocation, report status changes, restriction changes/expiry, and session revocation.
- Reason-required restrictions with optional expiry from 1 hour to 365 days; blank duration means indefinite. Expired restrictions are processed on the restricted user's next authenticated request.
- Admin UI actions to create/remove restrictions and revoke all sessions for another user.
- Static invariant tests for migration shape, auth gates, audit protection, UI wiring, role consistency, restrictions, expiry and session revocation.

## Remaining limitations
- User creation still uses the existing admin-created password flow; email-delivered, expiring invitation/set-password is not implemented because no mail-delivery integration is configured for this phase.
- Moderator/support roles can be assigned but do not yet have separate narrowly scoped moderation/support APIs; they cannot use legacy full-admin mutation APIs.
- Restriction expiry is lazy (processed at the restricted user's next authenticated request), not driven by a background scheduler.

## Verification
- `node --check` passed for `scripts/admin-security-phase5.test.mjs`.
- Static invariant tests passed in the isolated workbench: 7 unique tests.
- Full project test suite, TypeScript typecheck, production build, and execution of migration against PostgreSQL/PGlite could not be run because the isolated workbench does not have the project dependencies installed (`typescript` and `@electric-sql/pglite` are unavailable).
- No production database was changed. Do not merge this branch until the full project checks pass in CI or a configured development environment.
