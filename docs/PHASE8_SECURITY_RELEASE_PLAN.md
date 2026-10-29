# Phase 8 — Security, reliability, and first production release

## Status
Phase 8 has started on `phase8/security-reliability`, based on the Phase 7 checkpoint. This branch is intentionally separate; `main` is not changed and no deployment is performed by this phase-start commit.

## Scope and order

### 8.1 — Automated security baseline
- Run dependency vulnerability auditing in CI and treat high/critical advisories as a release blocker until fixed or explicitly risk-accepted.
- Keep CI permissions least-privilege and pin no secrets in repository files.
- Re-run auth invariants, typecheck, tests, and production build on the Phase 8 branch.
- Triage findings by exploitability, runtime reachability, fix availability, and compatibility; do not blindly force dependency upgrades.

### 8.2 — Application security review
- Review authentication and session lifecycle, role enforcement, same-site/CSRF protections, input validation, rate limiting, SQL access, upload handling, and secret handling.
- Add regression tests for every confirmed high-risk defect and abuse case.
- Verify that authentication and authorization failures fail closed without leaking sensitive details.

### 8.3 — Reliability and recovery
- Validate migration ordering and upgrade behavior on a disposable database.
- Exercise process restart, persistent data, storage write/read/delete, backup restore, and rollback in staging.
- Keep destructive restore, production database changes, DNS/firewall changes, and VPS deployments out of scope until the owner approves the exact target and procedure.

### 8.4 — Production readiness
- Review non-root runtime, HTTPS/reverse proxy, firewall boundaries, monitoring, structured privacy-safe logs, retention, alerting, and operational ownership.
- Record realistic small-deployment load-test results and resource limits.
- Complete operator incident, restore, and rollback runbooks; document privacy/terms requirements that need owner/legal review.

## Release acceptance criteria
- [ ] CI passes dependency audit, auth invariant checks, typecheck, tests, migration contract checks, and production build.
- [ ] No unresolved critical/high-severity finding unless the owner explicitly records risk acceptance and compensating controls.
- [ ] Authorization, rate-limit, upload, and session abuse tests pass.
- [ ] A database backup has been restored into a disposable environment and the result recorded.
- [ ] Restart/persistence, storage, monitoring, alerting, and rollback have evidence from an approved staging environment.
- [ ] HTTPS, firewall, non-root runtime, and production environment settings are verified on the actual target.
- [ ] The owner explicitly approves production release after reviewing the evidence.

## Evidence ledger
Record each check with date, commit SHA, environment, exact command/procedure, result, and any accepted risk. Never include credentials, tokens, OTPs, production user data, or raw sensitive logs. Mark external checks as **not run** until evidence exists; repository CI does not prove production readiness.

## Initial implementation slice
This first slice adds a dedicated CI security/reliability gate with dependency auditing and the existing project checks. Any audit failure is an actionable finding to triage, not permission to bypass the gate. Production integration checks remain pending until approved staging credentials and infrastructure are available.
