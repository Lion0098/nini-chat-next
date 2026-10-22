# Chat Nini — Next

Private development repository for the staged migration and stabilization of the Chat Nini project.

## Current status

- [x] Create a private repository.
- [x] Record the initial audit findings.
- [ ] Transfer the source code from the supplied archive after a secret/configuration scan.
- [ ] Install dependencies and run the complete build.
- [ ] Fix failing tests in small, reviewable commits.
- [ ] Validate the React/Vite app and the PHP/MySQL hosting variant separately.

## Project layout expected from the supplied archive

- Root: React, TypeScript, Vite application and test scripts.
- `hosting/`: separate PHP/MySQL hosting implementation.

These implementations will be checked separately before deployment; they should not be assumed to share the same runtime or configuration.

## Development notes

The initial archive passed ZIP integrity validation. PHP syntax checks passed for all seven PHP files inspected. The JavaScript test suite reported 184 passing and 13 failing tests; full dependency installation and the production build were blocked in the audit environment by package-registry access.

See [docs/INITIAL_AUDIT.md](docs/INITIAL_AUDIT.md) for details. No production credentials or deployment secrets belong in this repository.
