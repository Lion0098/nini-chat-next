-- Phase 7: announcements, moderation notes/appeals, operational check history and policy settings.
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_announcements (
  id bigserial PRIMARY KEY,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_announcements_active_created_idx
  ON system_announcements(active, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_report_notes (
  id bigserial PRIMARY KEY,
  report_id text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_user_id text NOT NULL,
  note text NOT NULL CHECK (length(note) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_report_notes_report_created_idx
  ON moderation_report_notes(report_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS moderation_appeals (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  restriction_id bigint REFERENCES admin_user_restrictions(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','accepted','rejected')),
  reviewer_user_id text,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS moderation_appeals_status_created_idx
  ON moderation_appeals(status, created_at ASC);
CREATE INDEX IF NOT EXISTS moderation_appeals_user_created_idx
  ON moderation_appeals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_check_events (
  id bigserial PRIMARY KEY,
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','warning','error')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_check_events_checked_idx ON ops_check_events(checked_at DESC);

-- Database-backed coarse rate limiting for authentication entry points.
CREATE TABLE IF NOT EXISTS auth_rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_rate_limit_buckets_updated_idx ON auth_rate_limit_buckets(updated_at);
INSERT INTO system_settings(key,value) VALUES
  ('rate_limit_login_max','10'),
  ('rate_limit_signup_max','5'),
  ('rate_limit_otp_max','3'),
  ('rate_limit_window_seconds','60'),
  ('require_email_verification','false'),
  ('require_phone_verification','false')
ON CONFLICT (key) DO NOTHING;
