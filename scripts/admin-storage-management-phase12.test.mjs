import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts"),
  permissions = read("src/lib/auth/admin-permissions.ts"),
  ui = read("src/components/admin-storage-management.tsx"),
  m10 = read("migrations/0010_vps_file_storage.sql"),
  m11 = read("migrations/0011_file_quota_and_backup.sql");
test("storage APIs enforce least-privilege RBAC", () => {
  for (const [name, perm] of [
    ["adminGetStorageManagement", "storage.read"],
    ["adminSaveStorageSettings", "storage.manage"],
    ["adminSaveFileTypePolicy", "storage.manage"],
    ["adminSaveUserStorageQuota", "storage.manage"],
    ["adminSetStoredFileStatus", "storage.manage"],
  ]) {
    const start = api.indexOf(`export const ${name}`),
      next = api.indexOf("export const ", start + 15),
      block = api.slice(start, next < 0 ? undefined : next);
    assert.ok(start >= 0, `missing ${name}`);
    assert.match(
      block,
      new RegExp(
        `requireAdminPermission\\(sql,\\s*context\\.userId,\\s*"${perm.replaceAll(".", "\\.")}"\\)`,
      ),
    );
  }
  assert.match(permissions, /owner:[\s\S]*storage\.manage/);
  assert.match(permissions, /administrator:[\s\S]*storage\.manage/);
  assert.match(permissions, /auditor:[\s\S]*storage\.read/);
  const nonAdmin = permissions.match(/moderator:[\s\S]*?auditor:/)?.[0] ?? "";
  assert.doesNotMatch(nonAdmin, /storage\./);
});
test("storage controls validate quotas and reuse migrations 0010/0011", () => {
  assert.match(api, /5\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024/);
  for (const x of [
    "file_type_policies",
    "file_user_quota_overrides",
    "storage.settings_updated",
    "storage.file_type_policy_updated",
    "storage.user_quota_updated",
  ])
    assert.ok(api.includes(x));
  assert.match(m10, /CREATE TABLE IF NOT EXISTS stored_files/);
  assert.match(m10, /CREATE TABLE IF NOT EXISTS file_type_policies/);
  assert.match(m11, /CREATE TABLE IF NOT EXISTS file_user_quota_overrides/);
  assert.match(m11, /CREATE TABLE IF NOT EXISTS file_upload_usage/);
});
test("file lifecycle quarantines before deletion and checks file existence before restore", () => {
  const start = api.indexOf("export const adminSetStoredFileStatus"),
    end = api.indexOf("// Phase 10:", start),
    block = api.slice(start, end);
  assert.ok(
    block.indexOf("status='quarantined'") <
      block.indexOf("deleteStoredFile(data.id,file.category)"),
  );
  assert.match(block, /getStoredFilePath\(data\.id,?\s*file\.category\)/);
  assert.match(block, /status='deleted',deleted_at=now\(\)/);
  assert.match(block, /storage\.file_status_changed/);
});
test("storage UI does not claim automated backup success or expose physical paths", () => {
  assert.match(ui, /Automated backups are not connected to a scheduler yet/);
  assert.match(ui, /physical paths, storage keys and hashes are never shown/);
  assert.match(ui, /Quarantine/);
  assert.match(ui, /Permanently delete this file from disk/);
  assert.match(ui, /Per-user quota override/);
  assert.match(ui, /Usage by category/);
  assert.match(ui, /Saved user quota overrides/);
  assert.match(ui, /Hourly quota/);
});
