-- Phase 6: distinct channels, safe group lifecycle, invitations, and membership history.
CREATE TABLE IF NOT EXISTS group_membership_history (
  id bigserial PRIMARY KEY,
  chat_id text NOT NULL,
  subject_user_id text NOT NULL,
  actor_user_id text,
  action text NOT NULL CHECK (action IN ('joined','left','added','removed','role_changed','ownership_transferred','archived','unarchived')),
  old_role text,
  new_role text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_membership_history_chat_idx
  ON group_membership_history(chat_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS group_membership_history_subject_idx
  ON group_membership_history(subject_user_id, created_at DESC);

ALTER TABLE chats ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS join_policy text NOT NULL DEFAULT 'invite'
  CHECK (join_policy IN ('invite','approval','open'));
ALTER TABLE chats ADD COLUMN IF NOT EXISTS invite_code_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS chats_invite_code_hash_unique
  ON chats(invite_code_hash) WHERE invite_code_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS group_invitations (
  id text PRIMARY KEY,
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  invited_user_id text NOT NULL,
  invited_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  UNIQUE(chat_id, invited_user_id, accepted_at)
);
CREATE INDEX IF NOT EXISTS group_invitations_pending_idx
  ON group_invitations(invited_user_id, expires_at) WHERE accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS channels (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  about text NOT NULL DEFAULT '',
  owner_id text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  join_policy text NOT NULL DEFAULT 'invite' CHECK (join_policy IN ('invite','approval','open')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id text NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'subscriber' CHECK (role IN ('owner','admin','editor','subscriber')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(channel_id,user_id)
);
CREATE INDEX IF NOT EXISTS channel_members_user_idx ON channel_members(user_id);
CREATE TABLE IF NOT EXISTS channel_posts (
  id text PRIMARY KEY,
  channel_id text NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_posts_feed_idx ON channel_posts(channel_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS channel_membership_history (
  id bigserial PRIMARY KEY,
  channel_id text NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  subject_user_id text NOT NULL,
  actor_user_id text,
  action text NOT NULL CHECK (action IN ('joined','left','invited','removed','role_changed','ownership_transferred','archived','unarchived')),
  old_role text,
  new_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_history_idx ON channel_membership_history(channel_id, created_at DESC, id DESC);

-- Correct uniqueness for pending invitations (NULL values are distinct in ordinary UNIQUE constraints).
CREATE UNIQUE INDEX IF NOT EXISTS group_invitations_one_pending_idx
  ON group_invitations(chat_id, invited_user_id) WHERE accepted_at IS NULL;
