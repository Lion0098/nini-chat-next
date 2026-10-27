-- Phase 5 follow-up: one-time administrator-created invitations.
CREATE TABLE IF NOT EXISTS admin_invitations (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  email text NOT NULL,
  display_name text NOT NULL,
  username text NOT NULL,
  invited_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_user_id text REFERENCES "user"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(lower(email));
CREATE INDEX IF NOT EXISTS admin_invitations_expiry_idx ON admin_invitations(expires_at) WHERE accepted_at IS NULL;
