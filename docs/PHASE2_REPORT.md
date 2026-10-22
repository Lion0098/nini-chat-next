# Phase 2 — Data Model and Durable Messaging Foundation

**Status: COMPLETE — focused tests, production build, Docker image build, and PostgreSQL runtime smoke tests passed.**  
**Branch:** `phase2/data-model` (based on the validated Phase 1 branch; not merged to `main`).  
**Validated commit:** `fbdce0b81610809e2b8d450db3a3901ee2446207`  
**Successful CI run:** [39869089304](https://github.com/Lion0098/nini-chat-next/actions/runs/39869089304)

## Scope

This phase builds on the existing PostgreSQL schema instead of duplicating the Better Auth user/session tables or the messenger's current tables.

- Add canonical direct-chat pair columns and a partial unique index so concurrent open-direct requests cannot create a second canonical chat for the same two users.
- Backfill one canonical pair for existing direct chats that have exactly two members; do not delete or merge legacy duplicates automatically.
- Create both direct-chat memberships in the same SQL statement as the chat row.
- Make message history ordering deterministic with `(created_at, id)` and pass the message ID as a cursor tie-breaker when loading older messages.
- Add query indexes for message history, sender rate limits, chat lists/membership ordering, contacts, statuses, calls, reports, and replies.
- Add a structured `audit_events` table with JSONB metadata and an explicit optional retention timestamp for later admin/moderation logging.
- Correct the stale migration-plan test so it expects the canonical root migration files instead of incorrectly expecting the migration directory to contain no SQL files.
- Extend CI to run data-model tests and PostgreSQL integration probes for unique direct chats, atomic membership creation, stable cursor comparisons, and audit metadata.

## Safety choices

- The migration is additive and does not drop tables or delete messages.
- Existing direct chats with duplicate pairs are not automatically merged or removed; only the oldest eligible two-member chat is backfilled as canonical.
- Audit metadata must not contain passwords, OTPs, access tokens, or message bodies.
- This phase does not implement email verification, SMS.ir OTP, admin audit-writing endpoints, or the admin panel UI. Those remain in later phases.

## Validation

The Phase 2 CI run must pass clean dependency installation, migration/data-model tests, production build, Docker image build, PostgreSQL startup, application health, direct-pair uniqueness/atomic-membership tests, stable cursor test, audit schema test, and database/application restart checks. The report will be marked complete only after that run passes.
