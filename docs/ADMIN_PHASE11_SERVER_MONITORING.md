# Nini Chat — Admin Phase 11: Server Monitoring

## Delivered

- Dedicated Server Monitoring tab with automatic 30-second refresh.
- Authenticated `adminGetServerMonitoring`, protected by `server.monitor.read`.
- Reports runtime platform/architecture, Node version, visible CPU count, load averages, runtime uptime, process RSS/heap, runtime host memory, database size, active/max connections, query latency, and configured storage-filesystem capacity when readable.
- Owner, Administrator, and Auditor can read. Moderator and Support cannot.
- Unavailable filesystem/database probes are reported as unavailable, not as zero or healthy.

## Measurement boundary

Metrics describe the runtime/container hosting this app process. They do not establish the health of a separate VPS, hypervisor, or other hosts. A host-level agent and authenticated ingestion endpoint are still required for full VPS CPU utilization, per-disk monitoring, network throughput, service/process inventory, and remote node checks.

## Database and deployment

Reuses existing PostgreSQL views and the configured file-storage path. No migration was added or executed on the VPS.

## Validation

Added `scripts/admin-server-monitoring-phase11.test.mjs` for RBAC, metric-source, and UI-scope contracts. TypeScript, unit/contract tests, targeted lint, and production build validation are run before CI. Browser/Preview testing remains pending until a Preview URL is available.
