import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts");
const ui = read("src/components/admin-screen.tsx");
const permissions = read("src/lib/auth/admin-permissions.ts");
const migration = read("migrations/0009_phase7_platform_ops.sql");

test("Android admin read/write APIs enforce separate RBAC permissions", () => {
  const readApi = api.slice(api.indexOf("export const adminGetAndroidControl"), api.indexOf("export const adminSaveAndroidControl"));
  const writeApi = api.slice(api.indexOf("export const adminSaveAndroidControl"), api.indexOf("// Phase 6:"));
  assert.match(readApi, /requireAdminPermission\(sql, context\.userId, "android\.control\.read"\)/);
  assert.match(writeApi, /requireAdminPermission\(sql, context\.userId, "android\.control\.manage"\)/);
  assert.match(writeApi, /android\.release_policy_updated/);
  assert.match(writeApi, /new URL\(updateUrl\)/);
  assert.match(writeApi, /compareAndroidVersions\(minimum, latest\) > 0/);
  assert.match(permissions, /owner:[\s\S]*android\.control\.manage/);
  assert.match(permissions, /administrator:[\s\S]*android\.control\.manage/);
  assert.match(permissions, /auditor:[\s\S]*android\.control\.read/);
  assert.doesNotMatch(permissions.slice(permissions.indexOf("moderator:"), permissions.indexOf("support:")), /android\.control/);
});

test("public Android config exposes only release policy fields and no admin-only operations", () => {
  const start = api.indexOf("export const getAndroidAppConfig");
  const end = api.indexOf("export const adminGetAndroidControl", start);
  const publicApi = api.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(publicApi, /middleware\(\[authMiddleware\]\)/);
  for (const field of ["latestVersion", "minimumVersion", "updateUrl", "forceUpdate", "updateMessage", "maintenanceMode", "maintenanceMessage"]) assert.ok(publicApi.includes(field), `missing ${field}`);
  assert.doesNotMatch(publicApi, /fcm|pushToken|deviceId|adminRole|secret/i);
});

test("Android control UI is role-aware, bilingual, and handles loading and retry", () => {
  assert.match(ui, /android: "android\.control\.read"/);
  assert.match(ui, /can\("android\.control\.manage"\)/);
  assert.match(ui, /adminGetAndroidControl/);
  assert.match(ui, /adminSaveAndroidControl/);
  assert.match(ui, /AndroidControlForm/);
  assert.match(ui, /androidControl\.isLoading/);
  assert.match(ui, /androidControl\.isError/);
  assert.match(ui, /تلاش مجدد/);
  assert.match(ui, /minimumVersion/);
  assert.match(ui, /maintenanceMode/);
  assert.match(ui, /Device inventory and push delivery are not simulated/);
});

test("Android controls reuse the existing system_settings table; no device inventory is fabricated", () => {
  assert.match(api, /insert into system_settings\(key, value, updated_at\)/);
  assert.match(api, /from system_settings where key like 'android_%'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS system_settings/);
  assert.doesNotMatch(api, /CREATE TABLE[\s\S]{0,80}android_devices/i);
});
