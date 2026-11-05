import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const matrix = read("src/lib/auth/admin-permissions.ts");
const api = read("src/server/api.ts");
test("all five roles have explicit least-privilege permission sets", () => {
  for (const role of ["owner", "administrator", "moderator", "support", "auditor"]) assert.ok(matrix.includes(`  ${role}: [`), `missing ${role}`);
  const administrator = matrix.slice(matrix.indexOf("  administrator:"), matrix.indexOf("  moderator:"));
  const support = matrix.slice(matrix.indexOf("  support:"), matrix.indexOf("  auditor:"));
  assert.ok(matrix.includes('"admins.roles.manage"'));
  assert.ok(!administrator.includes('"admins.roles.manage"'));
  assert.ok(!support.includes('"admin.full_access"') && !support.includes('"system.manage"'));
  assert.ok(matrix.includes('"moderation.manage"') && matrix.includes('"users.sessions.revoke"') && matrix.includes('"audit.read"'));
});
test("server guards require a DB role assignment and explicit permission", () => {
  assert.ok(api.includes("async function requireAdminPermission"));
  assert.ok(api.includes("!hasAdminPermission(assigned, permission)"));
  assert.ok(api.includes('requireAdminPermission(sql, userId, "admin.full_access")'));
  assert.ok(api.includes('requireAdminPermission(sql, context.userId, "admins.roles.manage")'));
  assert.ok(api.includes('requireAdminPermission(sql, context.userId, "moderation.manage")'));
  assert.ok(api.includes('requireAdminPermission(sql, context.userId, "users.support.read")'));
});
test("dashboard publishes effective permissions and audit reads remain gated", () => {
  assert.ok(api.includes("viewerPermissions: permissionsForRole(role)"));
  assert.ok(api.includes("requireAuditReader(sql, context.userId)"));
});
