ALTER TABLE messages ADD COLUMN IF NOT EXISTS stored_file_id text REFERENCES stored_files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_stored_file_idx ON messages(stored_file_id) WHERE stored_file_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS file_user_quota_overrides (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 daily_bytes bigint CHECK (daily_bytes IS NULL OR daily_bytes >= 0),
 weekly_bytes bigint CHECK (weekly_bytes IS NULL OR weekly_bytes >= 0),
 monthly_bytes bigint CHECK (monthly_bytes IS NULL OR monthly_bytes >= 0),
 max_file_bytes bigint CHECK (max_file_bytes IS NULL OR max_file_bytes >= 0),
 max_files_per_message integer CHECK (max_files_per_message IS NULL OR max_files_per_message >= 0),
 disabled boolean NOT NULL DEFAULT false, note text, updated_by text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS file_upload_usage (
 id bigserial PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 file_id text REFERENCES stored_files(id) ON DELETE SET NULL,
 size_bytes bigint NOT NULL CHECK (size_bytes > 0),
 state text NOT NULL CHECK (state IN ('reserved','committed','released')),
 reserved_at timestamptz NOT NULL DEFAULT now(), committed_at timestamptz, released_at timestamptz
);
CREATE INDEX IF NOT EXISTS file_upload_usage_user_time_idx ON file_upload_usage(user_id, reserved_at DESC);
CREATE INDEX IF NOT EXISTS file_upload_usage_state_time_idx ON file_upload_usage(state, reserved_at);
INSERT INTO system_settings(key,value) VALUES
('file_upload_hourly_quota_bytes','268435456'),
('file_upload_retention_days','0'),
('file_backup_enabled','false'),
('file_backup_directory','/var/backups/nini-chat'),
('file_backup_retention_days','14')
ON CONFLICT (key) DO NOTHING;