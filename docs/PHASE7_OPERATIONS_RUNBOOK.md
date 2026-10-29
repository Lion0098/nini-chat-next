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


## SMS.ir and verification policy

1. Apply all SQL migrations through `0009_phase7_platform_ops.sql` before enabling Phase 7 controls.
2. Sign in with an owner/administrator account and open **Admin → SMS settings** (`/sms-settings`). Select SMS.ir, enter the template ID and the exact parameter name configured in the SMS.ir verification template (commonly `Code`), paste the API key, and enable the provider.
3. The API key is encrypted before being stored in `system_settings`. Configure `BETTER_AUTH_SECRET` (preferred) or `OTP_HASH_SECRET` with at least 32 characters and keep it stable across deployments; changing the encryption secret makes the stored API key unreadable and requires saving it again.
4. Keep `SMS_IR_MODE=sandbox` for initial setup. For production, set `SMS_IR_MODE=production`, obtain production credentials/template approval from SMS.ir, and explicitly confirm production mode in the admin screen. This confirmation is an operator guard, not proof that SMS.ir has approved the account.
5. The admin operations screen checks whether SMS/email settings appear configured and whether Phase 7 tables exist. These are configuration checks only; they do not send an OTP or guarantee provider delivery.
6. `require_email_verification` and `require_phone_verification` are enforced by authenticated server-function middleware. Admin/owner/administrator accounts retain a recovery path to avoid locking the installation out. Email-only accounts must verify their email when that policy is enabled; phone-backed accounts must verify their phone when the phone policy is enabled.
7. Do not put API keys, OTP values, bearer tokens, or full recipient numbers in logs or issue reports.

## Release evidence still required from the deployment owner

The repository CI can verify TypeScript, automated tests, migration contract checks, and the production build. It cannot prove the live database has the migrations, that the SMS.ir/Resend credentials are valid, that object storage accepts writes, or that a production backup can be restored. Before declaring a production rollout complete, record those results in `docs/PHASE7_RELEASE_GATE.md` using a staging environment and a disposable restore target. Never run a restore drill over production data.
