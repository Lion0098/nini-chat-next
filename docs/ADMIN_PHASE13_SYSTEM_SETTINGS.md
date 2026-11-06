# Admin Phase 13 — System Settings

## Delivered

- Hardened the existing System Settings screen rather than introducing a duplicate configuration store.
- Dedicated server-side system.manage authorization is enforced by both read and write endpoints.
- Settings input is type-checked and range-checked on the server. Invalid values are rejected instead of silently clamped.
- Settings are written in one parameterized JSONB upsert and each key receives a fresh updated_at timestamp.
- The audit event now records the complete safe before/after policy snapshot.
- The settings screen has loading and error/retry states, disables controls while saving, shows the last settings update, and confirms high-impact changes.
- Registration pause messaging is consistently enforced for email registration and new phone accounts. Existing phone accounts can still request OTPs to sign in.
- Upload quota and VPS file-storage controls remain in the dedicated Storage Management tab to avoid competing settings.
- No database migration was added; existing system_settings and admin_audit_events tables are reused.

## Enforced settings

| Setting | Enforcement |
|---|---|
| Global/email/phone registration switches | /api/auth registration guard |
| Registration pause message | Blocks new email and phone accounts; existing phone sign-in remains available |
| Required email/phone verification | authMiddleware checks policy on authenticated requests |
| Login/signup/OTP rate limits | /api/auth database-backed rate limiter |
| Legacy upload byte cap | Existing upload API checks max_upload_bytes |
| VPS storage quotas and per-file limits | Dedicated Storage Management controls |

## Safety and limitations

- Enabling required verification can affect existing non-admin users on their next authenticated request. The UI requires confirmation and explains this impact.
- Registration pause does not disable sign-in for existing accounts.
- This phase does not add global maintenance mode, change environment secrets, or configure SMS/email provider credentials.
- No migration was run on the VPS. Preview was not manually exercised because no Preview URL was provided.

## Validation

- scripts/admin-system-settings-phase13.test.mjs
- TypeScript check
- Existing script and library test suites
- ESLint on changed source and test files
- Production build
