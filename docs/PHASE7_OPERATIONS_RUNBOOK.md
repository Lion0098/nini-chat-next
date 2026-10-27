# Phase 7 operational runbook (initial)

## Safety boundary
This application repository does not have credentials or an approved target host for production database backup/restore. Do not run destructive restore operations or alter the production VPS as part of this phase.

## Backup policy
- Configure automated PostgreSQL backups outside the application process using the hosting platform's approved backup mechanism.
- Encrypt backups at rest and in transit; restrict access to the owner/operations role.
- Keep at least one copy outside the primary VPS/account.
- Record timestamp, database/schema version, result, and artifact checksum; never store credentials in logs.
- Define retention with the data owner and applicable privacy requirements before enabling automated deletion.

## Restore drill
1. Provision an isolated staging database with equivalent PostgreSQL major version.
2. Restore the latest backup into staging only.
3. Apply migrations in order and run account, chat, group/channel, membership and audit-row count checks.
4. Verify login, read/send, group/channel access, report/appeal and admin authorization flows with test accounts.
5. Record duration, discrepancies and recovery point; do not overwrite production during a drill.

## Operational checks
The admin operational endpoint checks database query availability and announcement storage only. It does not prove SMS/email delivery, filesystem/object storage health, backup freshness, or alert delivery. Those checks require provider credentials and environment-specific integration.

## Retention and privacy
Do not automatically delete audit or moderation records until a retention period is approved. Exports must exclude passwords, session tokens, OTPs, API keys, message bodies and unrelated personal data. Restrict exports to owner/administrator and audit export activity.
