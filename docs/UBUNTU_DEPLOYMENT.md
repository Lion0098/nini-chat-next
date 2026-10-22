# Ubuntu VPS deployment (Docker Compose)

This is the first deployment path for the TypeScript/Node.js app. The separate `hosting/` PHP/MySQL version is not used by this deployment. These files prepare a reproducible deployment; they do not deploy anything to a real VPS or configure DNS/TLS automatically.

## Requirements

- Ubuntu 22.04 or 24.04 on a supported x86_64/arm64 VPS.
- Docker Engine and the Docker Compose plugin.
- A domain pointed to the VPS before public release.
- A valid TLS certificate before exposing the app publicly.

## Configure secrets

```sh
cp .env.example .env
openssl rand -hex 24
nano .env
chmod 600 .env
```

Replace the database password and `BETTER_AUTH_SECRET` with unique random values. Set `BETTER_AUTH_URL` to the final public HTTPS origin, without a trailing slash. Do not commit `.env`. If a database password contains URL-reserved characters, URL-encode it in `DATABASE_URL` or use a long alphanumeric password. Optional OAuth credentials must be your own provider credentials; production does not fall back to shared preview credentials.

## Validate and start

```sh
docker compose config
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --tail=100 app
curl -fsS http://127.0.0.1:3000/api/health
```

The app container waits for PostgreSQL, applies pending SQL migrations as an explicit pre-start command, then starts the Nitro Node server. The image build itself does not mutate the database. Migrations are idempotently tracked in `_migrations`; back up the database before deploying schema changes.

The app binds only to `127.0.0.1:3000` on the host. Put Nginx in front of it and use `deploy/nginx.conf.example` as a starting point after replacing the example domain and installing TLS certificates. Do not open port 3000 or PostgreSQL port 5432 publicly. Configure the VPS firewall for SSH and HTTPS (and HTTP only for certificate issuance/redirects).

## Operational commands

```sh
docker compose logs -f app
docker compose restart app
docker compose down              # stops containers; named database volume remains
docker compose up -d --build app
```

Do not use `docker compose down -v` on a production host unless you intentionally want to delete the database volume.

## Backup and restore

Create a backup outside the container and store it securely off-host:

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db pg_dump -U "$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)" -d "$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)" > "backups/nini-chat-$(date +%F-%H%M%S).sql"
```

Test restore on a separate test database before relying on a backup. Protect backup files because they contain personal data. Set an explicit retention policy and copy backups off the VPS.

## Production readiness caveats

- This is deployment scaffolding, not proof of a successful production release. A clean Docker build, live health check, TLS, restart test, and database restore test still need to be run in an actual environment.
- `BETTER_AUTH_SECRET`, `DATABASE_URL`, and `BETTER_AUTH_URL` are mandatory for production startup. The app intentionally refuses to use in-memory PGlite as a production database.
- Existing OAuth login is optional and requires separately configured provider credentials. Email/password and SMS.ir integration code is prepared in Phase 3; verify it end-to-end on the actual deployment with the configured email provider and SMS.ir Sandbox before production release.
- The current test suite had known baseline failures and dependency installation was unavailable during the prior audit. Re-run tests/build in CI before production launch.
- Never paste secrets into GitHub issues, commits, logs, or chat.


## Phase 3 — authentication, email, and SMS configuration

Before enabling authentication on a real host:

1. Set `VITE_AUTH_ENABLED=true`, `BETTER_AUTH_URL` to the final HTTPS origin, `BETTER_AUTH_SECRET` to a unique random secret of at least 32 characters, and `DATABASE_URL` to the production PostgreSQL connection string. Never use the preview PGlite database in production.
2. Email/password registration does **not** require email verification by default. Users can open Settings and request a verification link later. To send those links, configure `RESEND_API_KEY` and a verified sender address in `RESEND_FROM_EMAIL` (a bare address such as `noreply@example.com`); optionally set `RESEND_FROM_NAME`. Without these, sign-up and ordinary app use still work, but sending a verification link reports that email delivery is not configured.
3. Start SMS.ir in Sandbox mode: `SMS_IR_MODE=sandbox`, `SMS_IR_API_KEY_SANDBOX`, `SMS_IR_TEMPLATE_ID`, and the exact case-sensitive `SMS_IR_TEMPLATE_PARAMETER_NAME` used by the SMS.ir Verify template (default `Code`). Keep `SMS_IR_API_KEY_PRODUCTION` empty until Sandbox has been verified.
4. Phone OTP challenges store an HMAC hash, expire after 5 minutes, allow at most 3 attempts, are consumed once, and enforce a 60-second resend cooldown per number. The OTP HMAC uses `OTP_HASH_SECRET` when set, otherwise `BETTER_AUTH_SECRET`.
5. Do not enable SMS.ir Production until the owner explicitly approves it. Production requires `SMS_IR_MODE=production`, `SMS_IR_API_KEY_PRODUCTION`, and `SMS_IR_PRODUCTION_APPROVED=true`; this is a separate, deliberate switch.
6. After the owner creates their own account, bootstrap the first admin exactly once from the trusted server shell: `npm run admin:bootstrap -- owner@example.com`. The script requires `DATABASE_URL` and refuses to run if any admin already exists. Ordinary registration never promotes a user to admin.

The admin System tab can enable or disable new email/password and phone registrations separately. Existing users can still sign in when a registration method is disabled. Automatic account linking is disabled; do not merge an email, phone, or OAuth identity until an authenticated proof-of-control flow is implemented.
