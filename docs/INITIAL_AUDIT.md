# Initial audit — Chat Nini

Date: 2026-10-22

## Archive integrity

- Archive extracted for inspection.
- ZIP integrity check passed.
- Approximately 285 files, 2.76 MB.
- No source changes were made to the original repository during this audit.

## Project composition

- Root application: React + TypeScript + Vite.
- Separate PHP/MySQL application under `hosting/`.
- These need separate runtime and deployment checks.

## Checks performed

### PHP syntax

All seven PHP files checked with `php -l` passed:

- `hosting/config.sample.php`
- `hosting/router.php`
- `hosting/api/index.php`
- `hosting/cron/tick.php`
- `hosting/lib/webpush.php`
- `hosting/lib/bootstrap.php`
- `hosting/install.php`

### JavaScript test suite

Command: `node --test scripts/**/*.test.mjs`

- 197 tests total
- 184 passed
- 13 failed

Failure clusters include:

1. Auth-invariant test expects a resolved `VITE_AUTH_ENABLED` value but could not obtain it without a running dev server.
2. Grok/PWA metadata tests report mismatches around Open Graph title/image fallback and document-head injection.
3. Migration-plan test reports a mismatch involving the auth migration under `migrations/auth/`.
4. App-env tests expect `VITE_AUTH_ENABLED: "false"` in `.grok/app-env.json`, but the supplied file only contains a `deploy.database` setting.

These failures require review before making fixes; some may reflect environment assumptions rather than application defects.

### TypeScript-focused tests

10 passed and 2 could not complete because the dependency `@tanstack/react-start` was not installed in the audit environment. This is not enough evidence to classify those two as application logic failures.

### Dependency install/build

A full dependency install could not be completed in the audit environment: online install timed out and offline install failed because the npm cache did not contain `ajv`. Therefore, a successful production build has not yet been verified.

## Security and migration gates

Before transferring all source files:

- Scan for credentials, API keys, private keys, tokens, and live database settings.
- Preserve sample configuration files, but do not copy real `hosting/config.php` or environment secrets.
- Review the PHP implementation and React implementation as separate applications.
- Confirm the intended authentication defaults before changing auth-related configuration.
- Make fixes in small commits and rerun the relevant tests after each change.

## Next stage

Transfer the reviewed source tree (excluding secrets and generated/dependency directories), then run dependency installation, type checks, tests, and production build in an environment with registry access.
