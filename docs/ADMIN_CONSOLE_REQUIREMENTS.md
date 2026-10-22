# Nini Chat — Admin Console Requirements

## Product objective
Build a secure, comprehensive administrative console for operating the messaging platform: users, accounts, moderation, groups/channels, verification policy, configuration, audit history, and service health. The console is a planned product capability; this document does not imply it is already implemented.

## Core security model
- Admin access must be server-side authorized using explicit roles and granular permissions, not merely a hidden route or UI flag.
- Support role-based access control (RBAC): owner/super-admin, administrator, moderator, support agent, and read-only auditor. Keep permissions configurable and least-privilege.
- Require strong authentication for administrators; recommend MFA, short privileged sessions, re-authentication for sensitive actions, and session revocation.
- Record an append-only audit event for privileged actions: actor, action, target, timestamp, request/correlation ID, outcome, and safe before/after changes. Never log passwords, OTPs, API keys, session tokens, or full authentication secrets.
- Require confirmation and, for destructive/high-impact actions, a reason and/or second-person approval. Prefer reversible soft-delete/deactivation over irreversible deletion.
- Protect admin APIs against CSRF, IDOR, injection, brute force, and privilege escalation. Separate admin API permissions from ordinary user API permissions.
- Privacy: expose only data required for the operator's role. Do not provide a way to read users' plaintext passwords or OTPs.

## Dashboard and platform operations
- Overview: total users, new registrations, active users, online connections, messages, groups/channels, storage usage, and recent security/moderation events.
- Health: app/API status, database connectivity, queue/realtime status, SMS/email provider status, disk/memory, error rates, and backup status. Avoid exposing secrets or internal infrastructure details to non-owners.
- Search and filters across users, usernames, email/phone (masked where appropriate), account status, verification status, registration method, creation date, and recent activity.
- Export only authorized, minimal datasets; audit exports and protect personal information.

## User and account management
- Search, view, create manually, edit allowed profile fields, suspend, ban, unban, deactivate/reactivate, and soft-delete accounts.
- Set/reset username subject to uniqueness and reserved-name rules; edit display name and other public profile fields.
- View account creation time, last sign-in, registration method, email/phone verification state, sessions/devices, and moderation history subject to permissions.
- Manually created accounts must use a secure invite or password-reset/set-password flow. Admins must never choose or view a user's plaintext password.
- Password reset should issue a one-time link/code or force the user to set a new password; do not let admins retrieve existing credentials.
- For phone/email changes, require proof of ownership or a documented, audited recovery override with reason and heightened permission.
- Ban/suspension actions should support reason, start/end time, scope (platform-wide or feature-specific), appeal/review notes, and audit history.
- Provide session/device revocation and force-logout for compromised accounts.
- Preserve immutable user IDs and historical records when usernames or profile details change.

## Groups and channels
- Create, edit, archive, and manage groups/channels.
- Add/remove members, invite users, promote/demote owners/admins/moderators, and configure membership/visibility/join permissions.
- Manage public/private status, join links, descriptions, avatars, and ownership transfer.
- Apply moderation actions to messages or members with reason and audit trail.
- Prevent an admin action from silently changing content ownership; log who performed each change.
- Define channel versus group capabilities explicitly (e.g. channels may be broadcast-first; groups support member conversations).

## Messaging and moderation
- Search message metadata and moderation-reported content according to role and privacy policy.
- Delete or hide reported messages where policy permits, restrict posting, mute users, and manage reports/appeals.
- Do not create unrestricted browsing of all private conversations by default. Any exceptional access to private content must be narrowly scoped, permission-gated, justified, audited, and governed by a clear privacy policy.
- Rate-limit messaging and account actions; detect spam, mass invites, abusive uploads, and repeated verification attempts.
- Retain moderation evidence only for a defined period and allow lawful deletion/export processes where applicable.

## Registration and verification controls
- Enable/disable email + password registration and phone + SMS registration.
- Independently toggle mandatory email verification and mandatory phone verification.
- Configure policies on the server; frontend toggles alone are not sufficient.
- Define whether a policy change affects existing accounts or only new signups before enabling it. Avoid accidental global lockouts.
- Manage SMS.ir Sandbox/Production mode and provider health without displaying API keys. Changing to Production requires owner-level permission and explicit confirmation.
- Manage email verification provider configuration through secret references/environment settings, never reveal stored credentials in the UI.

## Configuration and content administration
- Manage safe application settings, feature flags, maintenance mode, supported upload limits, rate limits, and public system announcements.
- Separate public announcements from private user messages.
- Configure user-facing policy/help pages and terms/privacy versions with change history.
- Keep sensitive infrastructure settings, database credentials, signing keys, and raw environment secrets out of ordinary admin screens.

## Logs and membership history
- Searchable audit log with filters by actor, action, target, date, outcome, and request ID.
- User timeline: registration, sign-ins (safe metadata only), verification events, profile changes, group/channel joins/leaves, bans/suspensions, session revocations, and admin interventions.
- Group/channel timeline: creation, settings changes, membership changes, ownership transfers, and moderation events.
- Distinguish application logs, security events, message moderation records, and immutable administrative audit logs.
- Set retention periods and restrict log access. Never store raw passwords, OTPs, session tokens, or API keys in logs.

## Implementation architecture
- Store roles, permissions, admin settings, moderation actions, membership events, and audit events in PostgreSQL with migrations and appropriate indexes.
- Use service-layer authorization so the same rules apply across web UI and API/mobile clients.
- Keep admin API endpoints separate and versioned where useful; the future Android app must not be able to call privileged operations without server authorization.
- Make high-impact workflows transactional where possible, with idempotency for retried actions.
- Add automated tests for privilege boundaries, unauthorized user edits, duplicate usernames, banned-user behavior, role changes, audit-log creation, and policy toggles.

## Delivery phases
1. **Foundation:** admin RBAC, protected admin route/API, audit log, initial dashboard, user search/details.
2. **Accounts:** manual user creation, profile edits, verification state, safe password reset, ban/unban, sessions/devices, membership timeline.
3. **Groups/channels:** create/edit/archive, memberships, roles, invites, visibility, audit events.
4. **Moderation and operations:** reports, message moderation, rate limits, health dashboard, announcements, feature flags.
5. **Hardening:** MFA, approvals for high-impact actions, export controls, retention policy, backup/restore tests, security review.

## Acceptance criteria
- No admin action is authorized only by the frontend.
- Every privileged mutation creates an audit event, including failed high-risk attempts where appropriate.
- Unique usernames and immutable IDs are enforced at the database layer.
- Manual account creation never reveals or stores a plaintext password for the admin.
- Ban/unban and role changes are immediately enforced by APIs and active sessions.
- Admin settings are validated, audited, and enforced server-side.
- A normal user cannot access admin APIs by changing a URL or request payload.
- Backups and audit retention are documented and tested before public launch.
