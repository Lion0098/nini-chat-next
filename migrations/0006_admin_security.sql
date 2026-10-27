-- Phase 5: admin role assignments and append-only administrative audit events.
-- Existing admin accounts are retained; the earliest existing admin becomes the initial owner.

CREATE TABLE IF NOT EXISTS admin_role_assignments (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'administrator', 'moderator', 'support', 'auditor')),
  assigned_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deterministic bootstrap: one existing administrator receives owner; all other
-- existing admin profiles receive administrator. No ordinary user is promoted.
WITH ordered_admins AS (
  SELECT p.user_id, row_number() OVER (ORDER BY p.created_at NULLS LAST, p.user_id) AS rn
  FROM profiles p
  WHERE p.role = 'admin'
)
INSERT INTO admin_role_assignments (user_id, role)
SELECT user_id, CASE WHEN rn = 1 THEN 'owner' ELSE 'administrator' END
FROM ordered_admins
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS admin_role_assignments_role_idx ON admin_role_assignments(role);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id bigserial PRIMARY KEY,
  actor_user_id text NOT NULL,
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 120),
  target_user_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_events_created_idx ON admin_audit_events(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_audit_events_target_idx ON admin_audit_events(target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_admin_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS admin_audit_events_no_update ON admin_audit_events;
CREATE TRIGGER admin_audit_events_no_update BEFORE UPDATE OR DELETE ON admin_audit_events
FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
