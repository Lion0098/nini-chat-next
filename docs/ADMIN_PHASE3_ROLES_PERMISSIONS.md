# Nini Chat — Phase 3: Admin Roles & Permissions

## Delivered
- Centralized RBAC catalog for `owner`, `administrator`, `moderator`, `support`, and `auditor`.
- Explicit least-privilege permissions for dashboard/audit, user support, sessions, moderation, appeals, operations, system management, announcements, and role administration.
- Server-side `requireAdminPermission` checks both the legacy admin profile flag and the database-backed role assignment. A forged UI state or `profiles.role='admin'` alone cannot grant access.
- Existing full-console handlers remain restricted to owner/administrator through `admin.full_access`.
- Role assignment remains owner-only; administrators cannot promote or demote other admins or assign owner.
- Specialist endpoints use explicit permission keys: moderation, support user lookup/session revocation, audit, appeals, report notes, and operational status.
- Dashboard response includes the viewer's effective permission list so the UI can hide unavailable controls without replacing server enforcement.
- Automated static regression tests cover role coverage, least privilege, and server-side enforcement.

## Default permission matrix
| Role | Capabilities |
|---|---|
| Owner | All permissions, including role assignment |
| Administrator | Full console except role assignment |
| Moderator | Reports, moderation notes, and appeals |
| Support | Limited user lookup and session revocation |
| Auditor | Dashboard, audit history, operational status, read-only moderation notes/appeals |

## Security notes
- Role assignments continue to live in `admin_role_assignments`; no new database migration is required for this permission catalog.
- Existing role assignments are preserved.
- UI permissions are advisory only; all protected server functions enforce permissions independently.
- No database migration has been run on the VPS.

## Validation
Run `npm test`, `npm run typecheck`, and the production build in CI. Manual Preview validation is not available in this environment and remains a release follow-up.
