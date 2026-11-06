# Admin Phase 6 — Groups Management

## Delivered
- Expanded the admin group directory with member totals, group IDs, public/private visibility, join policy, archive state, search by title or ID, and loading/error/empty states.
- Added audited group settings updates for title, description, visibility, and join policy (`invite`, `approval`, `open`).
- Added reversible archive/unarchive controls with audit events.
- Added a member roster showing display name and role; admins can remove non-owner members only after supplying a reason.
- Group owners cannot be removed through this operation; ownership transfer is required first.
- Permanent group deletion remains available behind an explicit irreversible-action confirmation and is recorded in the admin audit log.
- Every new mutation is server-authorized with `requireAdmin`; UI visibility is not the security boundary.

## Schema and deployment
- Reuses existing `migrations/0008_phase6_groups_channels.sql` fields and membership history table; no new migration was added.
- The migration must be applied in the planned migration window before enabling these runtime controls on a database that has not yet received it.
- No VPS or production database migration was executed.

## Tests
- `scripts/admin-groups-phase6.test.mjs` covers group settings/archive, migration contracts, member removal audit, and owner protection.
