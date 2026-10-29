# Phase 8 — Security and reliability baseline

## Status
The repository-side Phase 8 baseline is implemented on `phase8/security-reliability`. This is a practical first pass, not a full penetration test or production certification. `main` is unchanged and no deployment has been performed.

## Delivered
- Dedicated CI workflow with least-privilege token permissions.
- Locked dependency installation, informational dependency audit, auth invariant checks, typecheck, unit/contract tests, migration contract checks, and production build.
- Release/runbook documentation for external environment validation and recovery.

## Follow-up security maintenance
The initial audit reported five advisories (2 low, 1 moderate, 1 high, 1 critical). Findings remain visible in CI but are not currently configured to block functional validation. The Better Auth adapter chain and Zod advisory should be prioritized for a compatible dependency update and regression testing. Do not use `npm audit fix --force` blindly because it may install versions outside the project's declared dependency range.

## Operator checks (outside repository-only completion)
- [ ] Apply and verify migrations in the target environment.
- [ ] Verify real email and SMS provider delivery using approved staging credentials.
- [ ] Verify storage write/read/delete and restore a backup into a disposable environment.
- [ ] Verify HTTPS, reverse proxy, firewall, process restart, monitoring, and rollback on the actual deployment.

No production changes, destructive restores, or real SMS/email sends were performed as part of Phase 8.
