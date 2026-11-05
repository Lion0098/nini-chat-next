# Admin Console — Section 2: User Management

**Status: implementation checkpoint; not yet accepted as complete.**

## Implemented in this checkpoint

- Added a server-side user-detail read endpoint restricted to accounts whose profile role is `admin` and whose assigned RBAC role is `owner` or `administrator`.
- Added an account detail panel showing immutable user ID, profile data, email/phone verification state, registration providers, creation/last-seen timestamps, group membership count, active session count, and recent device user-agent metadata.
- Added recent restriction history and a read-only timeline of administrative events targeting the account.
- Added an all/active/restricted filter to the existing user list.
- Kept session tokens, IP addresses, passwords, OTPs, and provider access/refresh tokens out of the detail response. Session rows are limited to active sessions and safe device metadata.
- Removed the irreversible hard-delete button from the user-management interface. Existing invitation, profile-edit, restriction/unrestriction, and session-revocation workflows remain available.

## Existing capabilities reused

- Manual account creation uses a random, hashed, single-use invitation token with a 48-hour expiry; the user chooses their own password.
- Profile edits preserve the immutable user ID and validate username uniqueness.
- Restriction actions require a reason and support an optional expiry.
- Session revocation deletes active Better Auth sessions and records an audit event.

## Validation

- Focused Node test suite: 6/6 passing in the isolated workbench.
- Full TypeScript check, production build, PostgreSQL runtime test, and browser interaction test have not yet run; the isolated workbench does not contain project dependencies. CI must validate the committed branch.
- No database migration was added or executed. No VPS, DNS, firewall, or production service was changed.

## Remaining before Section 2 acceptance

1. Implement deactivation/reactivation as a distinct account state, enforced by the authentication/session lifecycle (not by reusing the ban flag). This requires an additive migration and isolated migration tests; it must not be run on the VPS.
2. Review and harden the legacy `adminDeleteUser` server endpoint. The irreversible action is no longer exposed in the UI, but the legacy endpoint still exists and must be owner-gated or retired before acceptance.
3. Complete CI typecheck/build and PostgreSQL runtime tests, then perform a real browser smoke test against a non-production preview.

Do not merge to `main`, deploy, or run migrations on the production VPS as part of this checkpoint.
