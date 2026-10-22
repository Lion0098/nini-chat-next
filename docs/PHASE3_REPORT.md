# Phase 3 — Authentication and Account Lifecycle

**Status:** Implementation branch prepared; CI validation pending.  
**Branch:** `phase3/auth-lifecycle` (based on the validated Phase 2 branch; not merged to `main`).

## Implemented in this branch

- Email/password registration and sign-in through Better Auth, with the chosen username submitted before account creation.
- Case-insensitive unique username index on the auth user table, with a backfill from existing profiles. Profile edits, admin edits, and admin-created accounts synchronize the username to the auth user record.
- Email verification is optional by default. Users can keep using the app without verifying email and can request a verification link from the existing Settings panel later.
- A server-only Resend-compatible email sender for verification links. It requires `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`; no secret is committed.
- Phone sign-in/registration via Better Auth's phone-number plugin and the SMS.ir Verify endpoint. New phone accounts must supply a unique username; existing phone accounts can still request an OTP when new registrations are disabled.
- Iranian mobile normalization to E.164 and SMS.ir domestic format.
- OTPs are stored as HMAC-SHA256 hashes using `OTP_HASH_SECRET` or `BETTER_AUTH_SECRET`; plaintext OTPs are not stored. Challenges expire after 5 minutes, allow at most 3 attempts, are consumed once, and enforce a 60-second resend cooldown per phone number. Expired challenges are pruned during subsequent sends.
- SMS.ir defaults to Sandbox mode. Production sending requires the production API key plus `SMS_IR_PRODUCTION_APPROVED=true` and `SMS_IR_MODE=production`.
- Global signup control plus independent email and phone registration toggles in the existing admin System tab, enforced at the server auth route as well as the UI.
- Removed automatic promotion of the first registered user to admin. Added a one-time `npm run admin:bootstrap -- owner@example.com` command that requires `DATABASE_URL` and refuses to run if an admin already exists.
- Explicit auth-disabled guard; auth endpoints return unavailable when `VITE_AUTH_ENABLED=false`.
- Automatic account linking is disabled. Linking an email/password, phone, or OAuth identity must wait for a separate authenticated proof-of-control flow; identities are never silently merged.

## Safety / scope notes

- No SMS.ir API key, Resend key, password, or production credential is stored in the repository.
- Email verification is not required for ordinary use. Sending a verification email is unavailable until the deployment configures an email sender.
- SMS delivery has not yet been tested against the user's actual SMS.ir Sandbox credentials because credentials were not supplied to the repository workflow. Do not paste them into source code or chat; configure them as server environment variables and test Sandbox before approving Production.
- The admin UI now controls which registration methods accept new users. Mandatory email-verification policy and a safe identity-linking flow remain intentionally gated for a later admin/security phase; account linking is currently disabled.
- A successful CI run validates compilation, migrations, database constraints, and focused contract tests. It does not prove external SMS/email delivery or deployment to the actual VPS.

## Validation checklist

The Phase 3 CI run must pass clean dependency installation, migration/auth contract tests, phone normalization tests, production build, Docker image build, PostgreSQL migration, case-insensitive username uniqueness, phone uniqueness, OTP schema presence, and database/application restart checks. External delivery and full browser registration flows must then be verified using the configured Sandbox/email provider before this phase is considered fully production-validated.
