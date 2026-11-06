# Nini Chat — Admin Phase 9: Notifications Center

## Delivered on `phase10/vps-file-storage`
- Added a dedicated Notifications Center tab, protected by the `announcements.manage` permission.
- Added search over announcement title/body and filters for all, active, and inactive announcements.
- Completed the announcement lifecycle: create, edit, activate/deactivate, and confirmed permanent delete.
- All announcement management endpoints enforce `announcements.manage` server-side, validate bounded input, return `not_found` for missing records, and write audit events for create/update/status/delete actions.
- The UI clearly identifies these as public in-app announcements. Private user messages and bulk direct messages remain separate features and are not mixed into this public feed.
- Existing public delivery continues to return active announcements only.

## Existing schema reused
- `system_announcements` from migration `0009_phase7_platform_ops.sql`; no new migration was introduced and no migration was run on the VPS.

## Validation
- Added `scripts/admin-notifications-phase9.test.mjs` for public-feed behavior, endpoint permissions, audit coverage, and lifecycle UI.
- GitHub Actions typecheck, full tests, migration checks, and production build are required after commit.
- Browser/Preview validation remains pending because no Preview URL is available.
