# Nini Chat — Admin Phase 8: Moderation Center

## Delivered on `phase10/vps-file-storage`
- Replaced broad `admin.full_access` checks on report listing and status changes with `moderation.read` and `moderation.manage` respectively.
- Report status mutations now check the affected row, return `not_found` when it no longer exists, and retain the established `report.status_changed` audit event for backward compatibility.
- Added an authenticated effective-access endpoint so the admin console can build navigation from the caller's assigned RBAC role and permission catalog. Server-side guards remain authoritative.
- The console hides tabs and mutation controls outside the caller's permissions. Moderators can review reports and appeals; read-only roles do not receive write controls.
- Moderation notes remain internal, are loaded only with `moderation.notes.read`, and the editor is shown only with `moderation.notes.write`.
- Added loading/error/retry states for reports, appeals, and internal notes.

## Existing schema reused
- `reports`, `moderation_report_notes`, `moderation_appeals`, and `admin_user_restrictions` from migrations `0002`, `0006`, and `0009`.
- No new migration was introduced and no migration was run on the VPS.

## Validation
- Added `scripts/admin-moderation-phase8.test.mjs` for permission boundaries, audit behavior, read-only notes, and permission-aware navigation.
- GitHub Actions typecheck, full tests, migration checks, and production build are required after commit.
- Browser/Preview validation remains pending because no Preview URL is available.
