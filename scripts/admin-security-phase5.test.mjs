import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const migration = read("migrations/0006_admin_security.sql");
const api = read("src/server/api.ts");

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
  for (const action of ["user.updated", "user.created", "user.deleted", "report.status_changed", "admin.role_changed"]) assert.ok(api.includes(action), `missing ${action}`);
  assert.ok(!api.includes("auditAdminEvent(sql, context.userId, \"user.created\", userId, { password"));
});
