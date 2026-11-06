import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const api = read("src/server/api.ts");
const ui = read("src/components/admin-screen.tsx");
const authRoute = read("src/routes/api/auth/$.ts");
const permissions = read("src/lib/auth/admin-permissions.ts");

const readStart = api.indexOf("export const adminGetSettings");
const writeStart = api.indexOf("export const adminSaveSettings");
const phase6Start = api.indexOf("// Phase 6: group lifecycle", writeStart);
const readApi = api.slice(readStart, writeStart);
const writeApi = api.slice(writeStart, phase6Start);

test("System settings APIs require the dedicated system.manage permission", () => {
  assert.match(readApi, /requireAdminPermission\(sql, context\.userId, "system\.manage"\)/);
  assert.match(writeApi, /requireAdminPermission\(sql, context\.userId, "system\.manage"\)/);
  assert.doesNotMatch(readApi + writeApi, /requireAdmin\(sql,/);
  assert.match(permissions, /owner:[\s\S]*"system\.manage"/);
  assert.match(permissions, /administrator:[\s\S]*"system\.manage"/);
  assert.doesNotMatch(permissions.slice(permissions.indexOf("moderator:"), permissions.indexOf("support:")), /system\.manage/);
  assert.doesNotMatch(permissions.slice(permissions.indexOf("auditor:"), permissions.length), /system\.manage/);
});

test("System settings input is strictly typed and bounded on the server", () => {
  for (const field of ["allowSignups", "allowEmailSignup", "allowPhoneSignup", "requireEmailVerification", "requirePhoneVerification"]) {
    assert.ok(writeApi.includes('boolean("' + field + '")'), "missing boolean validation for " + field);
  }
  assert.match(writeApi, /integer\("rateLimitLoginMax", 3, 30\)/);
  assert.match(writeApi, /integer\("rateLimitSignupMax", 2, 15\)/);
  assert.match(writeApi, /integer\("rateLimitOtpMax", 1, 8\)/);
  assert.match(writeApi, /integer\("rateLimitWindowSeconds", 30, 3600\)/);
  assert.match(writeApi, /integer\("maxUploadBytes", 100_000, 4_000_000\)/);
  assert.match(writeApi, /invalid_maintenance/);
  assert.match(writeApi, /Number\.isSafeInteger/);
});

test("Settings writes update timestamps and append complete before/after audit metadata", () => {
  assert.match(writeApi, /jsonb_each_text\(\$1::jsonb\)/);
  assert.match(writeApi, /updated_at = excluded\.updated_at/);
  assert.match(writeApi, /system\.settings_updated/);
  assert.match(writeApi, /before:\s*current,[\s\S]*after/);
  assert.match(readApi, /max\(updated_at\)/);
  assert.match(readApi, /updatedAt:/);
  assert.doesNotMatch(writeApi, /file_upload_(?:default_max|daily_quota|weekly_quota|monthly_quota)/);
});

test("Registration pause applies to email and new phone accounts but preserves existing phone sign-in", () => {
  assert.match(authRoute, /const maintenance = \(await setting\("maintenance_message", ""\)\)\.trim\(\)/);
  assert.match(authRoute, /path === "\/sign-up\/email"[\s\S]*?if \(maintenance\)/);
  assert.match(authRoute, /if \(!existing\.length && maintenance\)/);
  assert.match(authRoute, /if \(!existing\.length && \(!allSignups \|\| !phoneAllowed\)\)/);
  assert.match(authRoute, /Existing phone accounts can always request an OTP to sign in/);
});

test("System settings UI has loading/error recovery and high-impact confirmation", () => {
  assert.match(ui, /settings\.isLoading/);
  assert.match(ui, /settings\.isError/);
  assert.match(ui, /settings\.refetch\(\)/);
  assert.match(ui, /window\.confirm/);
  assert.match(ui, /unverified users on their next request/);
  assert.match(ui, /initial\.updatedAt/);
  assert.match(ui, /disabled=\{saving\}/);
  assert.match(ui, /Storage Management tab/);
  assert.match(ui, /Retry/);
});

test("Public configuration stays limited to non-secret registration messaging", () => {
  const start = api.indexOf("export const getPublicConfig");
  const end = api.indexOf("export const getMe", start);
  const publicConfig = api.slice(start, end);
  assert.ok(start >= 0 && end > start);
  for (const field of ["allowSignups", "allowEmailSignup", "allowPhoneSignup", "maintenance"]) {
    assert.ok(publicConfig.includes(field), "missing " + field);
  }
  assert.doesNotMatch(publicConfig, /password|token|secret|api.?key|rateLimit|database|storagePath/i);
});
