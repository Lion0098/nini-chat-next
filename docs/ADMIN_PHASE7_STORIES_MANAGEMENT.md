# Admin Phase 7 — Stories Management

## Delivered
- Added a dedicated Stories tab to the admin console with search by author, username, caption, or story ID.
- Added status filters for all, active, and expired stories.
- Lists author identity, story type, caption, creation/expiry times, and view count.
- Media payloads are intentionally not returned to the admin listing endpoint; this keeps the screen metadata-focused.
- Story deletion requires an admin role, a reason of at least three characters, and explicit UI confirmation. The action is written to the append-only admin audit log with story ID, target author, and reason (not media content).
- Includes loading, error/retry, and empty states with Persian and English labels.

## Schema and deployment
- Reuses existing `statuses` and `status_views` tables from `migrations/0002_messenger.sql`; no new migration was added.
- Story removal deletes the selected status row and cascades its view records according to the existing foreign key. This is a permanent moderation action.
- No VPS or production database migration was executed.

## Tests
- `scripts/admin-stories-phase7.test.mjs` covers metadata-only listing, active/expired filtering, admin authorization, reason-required deletion, and audit logging.
