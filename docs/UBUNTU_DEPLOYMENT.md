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
- Existing OAuth login is optional and requires separately configured provider credentials. Email/password behavior should be verified end-to-end after deployment; SMS.ir is a later phase.
- The current test suite had known baseline failures and dependency installation was unavailable during the prior audit. Re-run tests/build in CI before production launch.
- Never paste secrets into GitHub issues, commits, logs, or chat.
