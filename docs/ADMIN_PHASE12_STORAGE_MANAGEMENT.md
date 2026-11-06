# Nini Chat — Admin Phase 12: Storage Management

## Delivered

- Storage inventory, category/status counts, and hourly/daily/weekly/monthly upload-ledger usage.
- Server-enforced `storage.read` and `storage.manage`: Owner/Administrator manage, Auditor read-only, Moderator/Support no access.
- Global disk-storage/quota switches, default maximum upload size, and hourly/daily/weekly/monthly quota controls.
- Per-extension allow/deny and maximum-size/category policies.
- Per-user daily/weekly/monthly/max-file overrides and upload-disable control.
- Recent file listing with quarantine, restore, and permanent-delete actions. Permanent deletion quarantines first, removes the physical blob, then marks metadata deleted and clears message file references. Restore is rejected if the blob is missing.
- Physical paths, storage keys, and hashes are not exposed. All mutations emit administrative audit events.

## Backup boundary

The existing encrypted `scripts/backup-storage.sh` remains operator-invoked. This phase does not claim automated scheduling, backup completion, database backup, or restore verification. A secure scheduler/agent and coordinated PostgreSQL backup/restore workflow remain necessary.

## Database and deployment

Reuses `stored_files`, `file_type_policies`, `file_user_quota_overrides`, `file_upload_usage`, and `system_settings` from migrations 0010/0011. No new migration was required and no migration was executed on the VPS.

## Validation

Added `scripts/admin-storage-management-phase12.test.mjs` for RBAC, schema reuse, quota/policy validation, file lifecycle, and backup-boundary contracts. TypeScript, unit/contract tests, targeted lint, and production build validation are run before CI. Browser/Preview testing remains pending until a Preview URL is available.
