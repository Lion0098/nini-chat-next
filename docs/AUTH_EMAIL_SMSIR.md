# Nini Chat — Authentication and Account Policy

## Product decisions
- Primary deployment target: Ubuntu VPS.
- Users can register/sign in using either email + password or mobile number + SMS OTP.
- Email verification is optional by default. A user may register with email, password, and a unique username, sign in immediately, send messages, and use normal features without verifying the email. They can verify it later from Account Settings.
- Phone-based registration uses mobile number + SMS OTP verification and a unique username. A phone number is considered verified only after the OTP is successfully checked.
- Every account must have a unique username. Duplicate usernames must be rejected reliably by the database, not only by frontend validation.
- The future Admin Panel must expose configurable policies to enable/disable mandatory email verification and mandatory phone verification, and control which registration/sign-in methods are enabled.
- Policy changes should affect new signups and clearly defined access rules for existing users. Admin settings must be server-authorized and audited.

## Registration flows

### Email + password
1. User enters username, email, and password.
2. Server validates and normalizes username/email, validates password, and checks uniqueness.
3. Account is created with email_verified_at set to NULL.
4. User receives an authenticated session immediately and may use standard messaging features.
5. Account Settings offers email verification and resending the verification email.
6. If an administrator has enabled mandatory email verification, enforce the policy according to the configured rollout rule (new accounts only or all affected accounts); do not silently assume a global lockout.

### Phone + SMS OTP
1. User enters username and mobile number.
2. Server sends an OTP through SMS.ir, using the configured Sandbox environment during development.
3. User enters the code; the server validates its hash, expiry, attempt count, and one-time-use state.
4. Account is created or activated with phone_verified_at set, and the user receives a session.
5. Username uniqueness and phone uniqueness are enforced by database constraints.

### Account linking and collisions
- Do not automatically merge email and phone accounts just because an identifier matches.
- Linking a phone or email to an existing account requires an authenticated session and proof of control of the identifier.
- Normalize email and phone values consistently. Define username rules (allowed characters, length, case-insensitivity) and enforce them consistently in API and database.
- Reserve sensitive/system usernames and reject impersonation of protected accounts.

## Admin settings (future Admin Panel)
Provide server-side settings for:
- Enable/disable email + password registration.
- Enable/disable phone + SMS registration.
- Require email verification: on/off.
- Require phone verification: on/off.
- Optionally require verification only for specific features, if product policy later needs it.
- Configure resend limits, OTP expiry/attempt limits, and abuse controls within safe bounds.
- Audit who changed a setting, when it changed, and the previous/new values.
- Admins must not be able to view passwords, OTPs, or provider API keys.

Verification requirements must be enforced by the backend, not just hidden or shown in the UI. Disabling a requirement must not invalidate existing verification records.

## Security requirements
- Passwords use a modern password hashing algorithm; never store plaintext.
- OTPs are generated with a cryptographically secure generator, stored only as hashes, expire quickly (e.g. 5 minutes), are single-use, and have strict attempt limits.
- Apply per-IP and per-identifier rate limits, resend cooldowns, daily send limits, and abuse monitoring.
- Do not log OTP values or API keys. Mask phone numbers and avoid leaking whether an account exists.
- SMS.ir keys and email-provider credentials are server-side environment variables, never frontend code or Git.
- Begin with SMS.ir Sandbox. Test provider errors, timeouts, invalid template IDs, expired/reused codes, incorrect attempts, and rate limiting before the user explicitly approves switching to Production.
- Email verification is separate from SMS.ir and needs an email delivery provider/configuration.
- Use secure sessions, HTTPS, appropriate CSRF protection, restrictive trusted origins, and session rotation after authentication or sensitive account changes.

## Implementation order
1. Inspect current auth routes, user schema, and database migration strategy.
2. Define username/email/phone normalization and uniqueness constraints.
3. Implement optional email verification and the email + password flow.
4. Implement SMS.ir verification with Sandbox-only configuration and tests.
5. Add configurable backend policy settings so future Admin Panel toggles can control methods and mandatory verification without rewriting auth.
6. Add tests for duplicate usernames (including case variants), account linking, login/session behavior, optional verification, and enabled/disabled admin policies.
7. Deploy to Ubuntu and verify database persistence, rate limits, and complete end-to-end flows.

## Deployment note
Use PostgreSQL as the persistent production database. Do not rely on in-memory or embedded preview databases for real user accounts and messages. Keep secrets outside the repository and verify the restore process for backups.
