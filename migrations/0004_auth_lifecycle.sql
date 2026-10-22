-- Phase 3 authentication lifecycle: Better Auth custom username + phone-number plugin fields.
-- Additive migration; no existing users or sessions are removed.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phoneNumber" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phoneNumberVerified" boolean NOT NULL DEFAULT false;

-- Preserve usernames already assigned in the messenger profile table.
UPDATE "user" u
SET "username" = p.username
FROM profiles p
WHERE p.user_id = u.id
  AND p.username IS NOT NULL
  AND trim(p.username) <> ''
  AND u."username" IS NULL;

-- Case-insensitive uniqueness is enforced in the database, including concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS user_username_lower_unique
  ON "user" (lower("username"))
  WHERE "username" IS NOT NULL AND "username" <> '';

CREATE UNIQUE INDEX IF NOT EXISTS user_phone_number_unique
  ON "user" ("phoneNumber")
  WHERE "phoneNumber" IS NOT NULL AND "phoneNumber" <> '';

CREATE TABLE IF NOT EXISTS phone_otp_challenges (
  phone_number text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 3),
  sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS phone_otp_expiry_idx ON phone_otp_challenges (expires_at);

INSERT INTO system_settings (key, value) VALUES
  ('allow_email_signup', 'true'),
  ('allow_phone_signup', 'true')
ON CONFLICT (key) DO NOTHING;
