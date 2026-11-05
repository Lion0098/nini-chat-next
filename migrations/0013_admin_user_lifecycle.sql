-- Admin user lifecycle: a reversible deactivation state distinct from moderation bans.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS profiles_inactive_idx ON profiles(user_id) WHERE is_active = false;
