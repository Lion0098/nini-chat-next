-- Phase 2 data integrity and query-performance foundation.
-- Additive only: existing messages, memberships, and chats are preserved.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS direct_user_a text;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS direct_user_b text;

-- Backfill one canonical row per existing direct-chat pair. Older duplicate
-- direct chats (if any) are left untouched for a later reviewed cleanup rather
-- than deleting or merging user data during a schema migration.
WITH eligible_chats AS (
  SELECT chat_id
  FROM chat_members
  GROUP BY chat_id
  HAVING count(*) = 2
), ranked_pairs AS (
  SELECT
    c.id,
    LEAST(a.user_id, b.user_id) AS user_a,
    GREATEST(a.user_id, b.user_id) AS user_b,
    row_number() OVER (
      PARTITION BY LEAST(a.user_id, b.user_id), GREATEST(a.user_id, b.user_id)
      ORDER BY c.created_at ASC, c.id ASC
    ) AS pair_rank
  FROM chats c
  JOIN eligible_chats ec ON ec.chat_id = c.id
  JOIN chat_members a ON a.chat_id = c.id
  JOIN chat_members b ON b.chat_id = c.id AND a.user_id < b.user_id
  WHERE c.kind = 'direct'
    AND c.direct_user_a IS NULL
    AND c.direct_user_b IS NULL
)
UPDATE chats c
SET direct_user_a = rp.user_a,
    direct_user_b = rp.user_b
FROM ranked_pairs rp
WHERE c.id = rp.id AND rp.pair_rank = 1;

-- A partial unique index makes a canonical direct chat per unordered user pair
-- a database invariant, including when two requests race concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS chats_direct_pair_unique
  ON chats (direct_user_a, direct_user_b)
  WHERE kind = 'direct'
    AND direct_user_a IS NOT NULL
    AND direct_user_b IS NOT NULL;

-- Query indexes: chat list, stable history pagination, per-sender rate limits,
-- group membership ordering, contacts, statuses, calls, reports, and replies.
CREATE INDEX IF NOT EXISTS messages_chat_created_id_idx
  ON messages (chat_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS messages_sender_created_idx
  ON messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_reply_to_idx
  ON messages (reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_members_user_archived_pinned_idx
  ON chat_members (user_id, archived, pinned DESC, chat_id);
CREATE INDEX IF NOT EXISTS chat_members_chat_joined_idx
  ON chat_members (chat_id, joined_at ASC, user_id);
CREATE INDEX IF NOT EXISTS contacts_contact_owner_idx
  ON contacts (contact_id, owner_id);
CREATE INDEX IF NOT EXISTS statuses_user_created_idx
  ON statuses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS status_views_viewer_viewed_idx
  ON status_views (viewer_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS calls_chat_status_created_idx
  ON calls (chat_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_created_idx
  ON reports (reporter_id, created_at DESC);

-- Append-only-by-application audit trail for future moderation/admin actions.
-- Do not put passwords, OTPs, access tokens, or message bodies in metadata.
-- retention_until allows a later scheduled retention job without rewriting
-- event timestamps; no automatic deletion policy is enabled by this migration.
CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor_id text,
  action text NOT NULL CHECK (length(trim(action)) > 0),
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz
);

CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
  ON audit_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_target_created_idx
  ON audit_events (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_action_created_idx
  ON audit_events (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_retention_idx
  ON audit_events (retention_until) WHERE retention_until IS NOT NULL;
