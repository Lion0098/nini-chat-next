import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const api = read("src/server/admin-user-details.ts");
const legacyApi = read("src/server/api.ts");
const middleware = read("src/lib/auth/middleware.ts");
const migration = read("migrations/0013_admin_user_lifecycle.sql");
const types = read("src/lib/chat-types.ts");
const ui = read("src/components/admin-screen.tsx");

test("user details endpoint enforces owner or administrator authorization on the server", () => {
  assert.match(api, /\.middleware\(\[authMiddleware\]\)/);
  assert.match(api, /assigned_role/);
  assert.match(api, /role !== "owner" && role !== "administrator"/);
  assert.match(api, /throw new Error\("forbidden"\)/);
});

test("user detail response exposes verification and registration metadata without credentials", () => {
  for (const field of ["emailVerified", "phoneVerified", "registrationMethods", "createdAt", "lastSeenAt", "groupCount"]) assert.ok(api.includes(field));
  assert.match(api, /from account where "userId"/);
  assert.match(api, /"emailVerified"/);
  assert.match(api, /"phoneNumberVerified"/);
  assert.doesNotMatch(api, /select[^;]*"token"|accessToken|refreshToken|password/i);
});

test("session detail is limited to safe device metadata and active sessions", () => {
  assert.ok(api.includes('"expiresAt" > now()'));
  assert.ok(api.includes('"userAgent" as user_agent'));
  assert.ok(api.includes('count(*)::int as count from "session"'));
  assert.doesNotMatch(api, /"token"|ipAddress|accessToken|refreshToken/);
});

test("restriction history and administrative account events are read-only", () => {
  assert.match(api, /admin_user_restrictions/);
  assert.match(api, /admin_audit_events/);
  assert.match(api, /order by e\.created_at desc, e\.id desc limit 15/);
});

test("admin user console supports details, verification visibility and status filtering", () => {
  assert.match(ui, /adminGetUserDetails/);
  assert.ok(ui.includes('import { adminGetUserDetails, adminSetUserActive } from "@/server/admin-user-details";'));
  assert.match(ui, /userStatusFilter/);
  assert.match(ui, /userDetails\.data\.profile\.emailVerified/);
  assert.match(ui, /userDetails\.data\.profile\.phoneVerified/);
  assert.match(ui, /Active devices and sessions|دستگاه‌ها و نشست‌های فعال/);
  assert.match(ui, /Restriction history|سوابق محدودیت حساب/);
});

test("irreversible hard-delete action is not exposed in the user management UI", () => {
  assert.doesNotMatch(ui, /adminDeleteUser/);
});


test("deactivation is distinct from suspension and is enforced by authenticated server middleware", () => {
  assert.match(migration, /is_active boolean NOT NULL DEFAULT true/);
  assert.match(api, /export const adminSetUserActive/);
  assert.match(api, /user\.deactivated/);
  assert.match(api, /user\.reactivated/);
  assert.match(api, /delete from "session"/);
  assert.match(middleware, /coalesce\(p\.is_active, true\) as is_active/);
  assert.match(middleware, /account_deactivated/);
});

test("legacy hard-delete server function is disabled pending retention-aware deletion", () => {
  const start = legacyApi.indexOf("export const adminDeleteUser");
  const end = legacyApi.indexOf("export const adminListGroups", start);
  const handler = legacyApi.slice(start, end);
  assert.match(handler, /hard_delete_disabled/);
  assert.doesNotMatch(handler, /delete from messages where sender_id/);
});


test("user list distinguishes active, suspended and deactivated account states", () => {
  assert.match(types, /isActive: boolean/);
  assert.match(legacyApi, /coalesce\(p\.is_active, true\) as is_active/);
  assert.match(legacyApi, /isActive: bool\(r\.is_active\)/);
  assert.match(ui, /userStatusFilter === "deactivated"/);
  assert.match(ui, /<option value="deactivated">/);
});
