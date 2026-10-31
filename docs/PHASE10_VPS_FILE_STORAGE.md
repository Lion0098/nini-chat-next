# Phase 10.1 — quota and backup groundwork

This increment adds per-user quota override records, an upload accounting ledger, and a nullable stored-file relation on messages. It also adds signature detection for common safe media/document types. Unknown signatures intentionally fail closed. The local storage path is now rejected if it resolves under the app public web root.

## Backups
The backup script is opt-in and runs only when an operator invokes it on the VPS. Inject BACKUP_PASSPHRASE from a secret manager; never store it in this repository, cron text, or shell history. Configure NINI_STORAGE_ROOT, BACKUP_DIR, RETENTION_DAYS and optionally OFFSITE_DIR. It creates an AES-256-CBC encrypted tar archive and SHA-256 sidecar.

This script backs up blobs only, not PostgreSQL. Back up the database separately with encrypted pg_dump output, coordinate blob/database snapshots, copy both off-site, and test restore into a separate staging directory before relying on them. Never restore over a live storage root without preserving the current directory and using a maintenance window.

No VPS commands, production migrations, backups, or data movement were run by this commit. file_storage_enabled remains false and uploads still use the legacy database Base64 path. Quota enforcement, API cutover, admin controls, legacy migration and automated restore tests remain to be implemented.
