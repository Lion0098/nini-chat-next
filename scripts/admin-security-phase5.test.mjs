import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const migration = read("migrations/0006_admin_security.sql");
const api = read("src/server/api.ts");
const adminUi = read("src/components/admin-screen.tsx");

test("Phase 5 migration defines scoped admin roles and preserves existing admin accounts", () => {
  for (const role of ["owner", "administrator", "moderator", "support", "auditor"]) assert.match(migration, new RegExp(`'${role}'`));
  assert.match(migration, /REFERENCES "user"\(id\) ON DELETE CASCADE/);
  assert.match(migration, /WHERE p\.role = 'admin'/);
  assert.match(migration, /ON CONFLICT \(user_id\) DO NOTHING/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+profiles|DROP\s+TABLE\s+profiles/i);
});

test("audit log is append-only and does not store credentials by schema", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_audit_events/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON admin_audit_events/);
  assert.ok(api.includes("Object.fromEntries(Object.entries(details).filter"));
  assert.match(api, /password\|token\|secret\|otp\|api\.\?key\|credential/);  assert.match(api, /admin_audit_events \(actor_user_id, action, target_user_id, details\)/);
});

test("dashboard, audit reader and role assignment APIs require backend authorization", () => {
  assert.match(api, /export const adminGetDashboard[\s\S]*?requireAuditReader\(sql, context\.userId\)/);
  assert.match(api, /export const adminListAuditEvents[\s\S]*?requireAuditReader\(sql, context\.userId\)/);
  assert.match(api, /export const adminSetAdminRole[\s\S]*?requireAdmin\(sql, context\.userId\)[\s\S]*?actorRole !== "owner"/);
  assert.match(api, /assigned !== "owner" && assigned !== "administrator"/);
});

test("sensitive account changes emit audit events without logging password values", () => {
  for (const action of ["user.updated", "user.invitation_sent", "user.invitation_accepted", "user.deleted", "report.status_changed", "admin.role_changed"]) assert.ok(api.includes(action), `missing ${action}`);
  assert.ok(!api.includes("auditAdminEvent(sql, context.userId, \"user.created\", userId, { password"));
});

test("admin console exposes dashboard, audit history and owner-only role controls", () => {
  assert.match(adminUi, /adminGetDashboard/);
  assert.match(adminUi, /adminListAuditEvents/);
  assert.match(adminUi, /adminSetAdminRole/);
  assert.match(adminUi, /viewerRole === "owner"/);
  assert.match(adminUi, /tab === "audit"/);
});


test("role assignment synchronizes profile role and protects the owner", () => {
  assert.match(api, /admin\.role_revoked/);
  assert.match(api, /admin\.role_changed/);
  assert.match(api, /targetRole === "owner"\) return err\("owner_protected"\)/);
  assert.match(api, /update profiles set role = 'admin', updated_at = now\(\) where user_id = \$\{data\.userId\}/);
  assert.match(api, /update profiles set role = 'user', updated_at = now\(\) where user_id = \$\{data\.userId\}/);
  assert.doesNotMatch(adminUi, /data: \{ userId: u\.userId, role: u\.role === "admin"/);
});

test("reasoned restrictions support expiration and session revocation with audit events", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_user_restrictions/);
  assert.match(migration, /expires_at timestamptz/);
  assert.match(api, /export const adminSetUserRestriction/);
  assert.match(api, /reason_required/);
  assert.match(api, /duration_invalid/);
  assert.match(api, /user\.restriction_expired/);
  assert.match(api, /export const adminRevokeUserSessions/);
  assert.match(api, /user\.sessions_revoked/);
  assert.match(adminUi, /adminSetUserRestriction/);
  assert.match(adminUi, /adminRevokeUserSessions/);
});


test("admin-created accounts use hashed, expiring, single-use email invitations", () => {
  const invitationMigration = read("migrations/0007_admin_invitations.sql");
  const mail = read("src/lib/email/resend.ts");
  const login = read("src/routes/login.tsx");
  assert.match(invitationMigration, /token_hash text PRIMARY KEY/);
  assert.match(invitationMigration, /expires_at timestamptz NOT NULL/);
  assert.match(invitationMigration, /accepted_at timestamptz/);
  assert.match(api, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(api, /createHash\("sha256"\)/);
  assert.match(api, /48 \* 60 \* 60 \* 1000/);
  assert.match(api, /export const redeemAdminInvitation/);
  assert.match(api, /accepted_at is null and expires_at > now\(\) returning token_hash/);
  assert.match(mail, /sendAdminInvitationEmail/);
  assert.match(login, /redeemAdminInvitation/);
  assert.doesNotMatch(adminUi, /draft\.password/);
});

test("moderator and support endpoints enforce their own least-privilege roles", () => {
  assert.match(api, /export const moderatorListReports[\s\S]*?requireAssignedRole\(sql, context\.userId, \["owner", "administrator", "moderator"\]\)/);
  assert.match(api, /export const moderatorSetReportStatus[\s\S]*?requireAssignedRole\(sql, context\.userId, \["owner", "administrator", "moderator"\]\)/);
  assert.match(api, /export const supportFindUser[\s\S]*?requireAssignedRole\(sql, context\.userId, \["owner", "administrator", "support"\]\)/);
  assert.match(api, /export const supportRevokeUserSessions[\s\S]*?requireAssignedRole\(sql, context\.userId, \["owner", "administrator", "support"\]\)/);
  assert.match(api, /if \(row\.role !== "admin" \|\| !assigned \|\| !roles\.includes\(assigned\)\) throw new Error\("forbidden"\)/);
});





