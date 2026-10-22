# Nini Chat — Ubuntu VPS Production Roadmap

## Decision

The primary target is a self-managed Ubuntu VPS. The long-term product goal is a personal messaging platform (Telegram-like in scope), with a web client first and an Android client later. The web and Android clients must share a documented, versioned backend API; the Android app must not depend on web-only cookies, page routes, or browser state.

## Current repository findings (initial audit)

- The repository contains a React + TypeScript client built with Vite and TanStack Start, with Nitro configured using the `vercel` preset today.
- `src/lib/db.ts` selects a real PostgreSQL-compatible database through `DATABASE_URL`, but falls back to embedded, in-memory PGlite when that variable is absent. That fallback is suitable for local preview, **not production persistence**: process restarts can lose data.
- The current authentication code includes a Grok auth broker / preview fallback. A self-hosted product must explicitly decide and implement its own production identity providers or email/phone login rather than silently depending on a preview broker.
- The repository also includes a separate PHP implementation in `hosting/`, documented for shared hosting. Treat it as a legacy/alternate implementation while evaluating parity; do not mix its runtime with the primary Node.js app by accident.
- `startup.sh` is preview-oriented (fixed `/workspace` paths and PHP built-in server). It is not a production Ubuntu deployment script.
- Current `vite.config.ts` selects Nitro's Vercel preset for build/preview. The deployment work must select and test a compatible Node/server preset before claiming the app is production-ready.

## Target deployment shape

1. **Web app + API:** React/TypeScript and TanStack Start on a supported Node.js LTS release; production build served by a Node server behind Nginx or Caddy with HTTPS.
2. **Database:** PostgreSQL on the VPS for an initial single-server deployment, with persistent disk, restricted network access, migrations, and tested backups/restore. Use `DATABASE_URL`; never rely on PGlite for production.
3. **Authentication:** explicit production configuration, secure sessions, correct public base URL, trusted origins, secure cookies, rate limits, and recovery flows. No development identity or preview credentials in production.
4. **Messaging:** verify whether the existing server API supports durable conversations, message history, delivery/read states, pagination, and per-user authorization. Add a realtime transport (WebSocket or SSE as appropriate) only after the event/data model is defined; polling alone is not the desired long-term realtime design.
5. **Media:** private file storage outside the public web root, upload size/type limits, authorization on every download, and a later path to S3-compatible object storage.
6. **Android readiness:** document an API contract (OpenAPI or equivalent), stable resource IDs, token/session strategy for native clients, pagination, upload flow, push-notification registration, and backward-compatible API versioning.
7. **Voice/video (later phase):** treat WebRTC signaling and TURN relay as a separate feature with its own operational/security requirements; do not promise reliable calling until a TURN server and real-network tests are in place.
8. **Operations:** systemd or Docker Compose, Nginx/Caddy TLS, firewall, non-root service account, environment secrets outside Git, health checks, structured logs, automated security updates, database/media backups, and restore drills.

## Safe implementation sequence

### Phase 0 — Baseline and safeguards
- Keep the original import intact as a reference point.
- Run dependency installation, typecheck, lint, tests, and production build in a reproducible environment; record each failure instead of masking it.
- Inventory every environment variable, auth provider, database migration, upload path, and external service.
- Add a production environment template containing names and safe placeholders only (never credentials).

### Phase 1 — Make the Node app deployable
- Choose a Node-compatible Nitro output and verify the generated server entry point.
- Add a reproducible Ubuntu deployment path (prefer Docker Compose or systemd; choose one, not both without a reason).
- Configure PostgreSQL and durable storage; fail closed at startup if production database/auth settings are missing.
- Add `/api/health` readiness checks and a reverse-proxy configuration; bind the app to localhost behind the proxy.
- Test clean install, build, start, restart, and database persistence after restart.

### Phase 2 — Messaging correctness and security
- Review authorization on all conversation/message/file operations; prevent cross-user IDOR access.
- Add durable message storage, stable ordering/cursors, input validation, rate limiting, and delivery/read semantics where needed.
- Add automated tests for two separate users, unauthorized conversation access, file access, and restart persistence.
- Decide and document encryption scope. Do not claim end-to-end encryption unless it is actually implemented and independently reviewed.

### Phase 3 — Realtime and mobile contract
- Add authenticated realtime events without making the browser UI the source of truth.
- Publish an API schema and compatibility policy before building the Android app.
- Add push notifications and native-friendly authentication/upload flows when the core API is stable.

## Production release gates

Do not expose the app publicly until all are true:

- Production build and typecheck pass (or every remaining failure is understood and explicitly accepted).
- Production authentication is configured; no preview/dev-user fallback is possible.
- PostgreSQL and media persist across service restarts.
- HTTPS, secure cookies, trusted origins, secret management, rate limiting, and authorization tests are in place.
- Backups are created and a restore has been tested.
- Health checks, logs, and a rollback procedure are documented.

## Not decided yet

- Domain name and public hostname.
- Ubuntu version, VPS RAM/CPU/disk, and whether PostgreSQL will share the VPS initially.
- Login method (email, phone/SMS, Google, or a combination).
- Whether voice/video is in the first release or a later milestone.
