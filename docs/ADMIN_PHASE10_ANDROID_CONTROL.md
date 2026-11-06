# Nini Chat — Admin Phase 10: Android Control Center

## Delivered
- Added a dedicated Android Control tab in the admin console.
- Added release-policy fields: latest version, minimum supported version, HTTPS update URL, update message, and force-update switch.
- Added Android maintenance mode and a maintenance message.
- Added a public read-only `getAndroidAppConfig` server function for the Android client to fetch the safe release policy.
- Added separate authenticated admin read and write endpoints protected by `android.control.read` and `android.control.manage`.
- Owner and Administrator can manage the policy; Auditor can read it. Moderator and Support do not receive this capability.
- Server validation enforces strict `major.minor.patch` versions, a minimum version not newer than latest, HTTPS-only update links without embedded credentials, bounded messages, and a required update URL when force-update is enabled.
- All changes persist in the existing `system_settings` table and emit `android.release_policy_updated` audit events with before/after values.
- UI supports Persian/English, read-only roles, loading/error/retry, and save feedback.

## Explicit integration boundary
- The current repository has no Android device-registration table, FCM token lifecycle, or Android client code that consumes a remote policy. Therefore this phase does not display fabricated device counts, claim push delivery, or remotely enforce updates on already-installed clients.
- The Android app must call `getAndroidAppConfig` at startup/resume and implement version comparison, update navigation, and maintenance presentation. Device inventory and push delivery require a separate client registration/FCM integration phase.

## Database and deployment
- Reuses `system_settings` from migration `0009_phase7_platform_ops.sql`; no new migration is required.
- No migration was executed on the VPS.

## Validation
- Added `scripts/admin-android-control-phase10.test.mjs` for RBAC boundaries, public-config exposure, validation rules, UI behavior, and schema reuse.
- GitHub Actions validation must pass TypeScript, unit/contract tests, migration checks, and production build.
- Browser/Preview testing remains pending until a Preview URL is available.
