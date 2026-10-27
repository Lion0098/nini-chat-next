# Phase 5 — Admin Security and Console (follow-up completion pass)

## Implemented on `phase5/admin-security-console`
- Explicit owner/administrator/moderator/support/auditor role assignments, owner-only role grants, protected owner, server-side gates on legacy full-admin operations, and profile-role synchronization.
- Dashboard, searchable read-only audit history, append-only audit log, reasoned temporary/permanent restrictions, lazy expiry on the restricted user's next authenticated request, and session revocation.
- Secure admin-created invitation flow: administrator submits name, username, and email; a cryptographically random one-time token is generated, only its SHA-256 hash is stored, and the invitation link expires after 48 hours. Email delivery uses the existing Resend-compatible server integration. The invitee sets their own password; the administrator never supplies or sees it. Redemption validates expiry and claims the invitation before linking it to the created account.
- Dedicated least-privilege APIs: moderators can list and change report status; support can perform limited user lookup and revoke sessions. These roles are not authorized to call legacy full-console mutation endpoints.
- Static invariants expanded for invitations and scoped role endpoints; migration `0007_admin_invitations.sql` added.

## Configuration and operational requirements
- Set `BETTER_AUTH_URL` to the canonical public HTTPS origin and configure `RESEND_API_KEY` plus `RESEND_FROM_EMAIL` before sending invitations. If delivery is not configured or fails, the invitation is removed and the API returns an error rather than reporting success.
- Invitation emails and actual signup cannot be live-tested without valid external email-provider credentials.
- Restriction expiry is still lazy (processed on the restricted user's next authenticated request), not a background scheduler.

## Verification status
- Static invariant suite: **9/9 tests passed** using Node's test runner against the updated source fixture.
- Full project test suite, TypeScript typecheck, production build, and applying migrations against PostgreSQL/PGlite still require a dependency-installed environment; these checks are not claimed as passed by this isolated edit pass.
- No production database was modified and no changes were merged to `main`.
