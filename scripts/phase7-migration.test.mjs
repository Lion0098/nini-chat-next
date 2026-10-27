import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/0009_phase7_platform_ops.sql", import.meta.url), "utf8");
const authRoute = await readFile(new URL("../src/routes/api/auth/$.ts", import.meta.url), "utf8");

test("Phase 7 migration creates required operational and moderation tables", () => {
  for (const table of [
    "system_settings",
    "system_announcements",
    "moderation_report_notes",
    "moderation_appeals",
    "ops_check_events",
    "auth_rate_limit_buckets",
  ]) {
    assert.match(migration, new RegExp("CREATE TABLE IF NOT EXISTS " + table + "\\b", "i"), `missing table: ${table}`);
  }
});

test("Phase 7 migration seeds bounded authentication policy defaults", () => {
  for (const key of [
    "rate_limit_login_max",
    "rate_limit_signup_max",
    "rate_limit_otp_max",
    "rate_limit_window_seconds",
    "require_email_verification",
    "require_phone_verification",
  ]) {
    assert.ok(migration.includes("'" + key + "'"), `missing setting: ${key}`);
  }
});

test("auth route rate-limits sensitive entry points without a shared unknown-IP bucket", () => {
  for (const route of ["/sign-up/email", "/sign-in/email", "/phone-number/send-otp", "/phone-number/verify"]) {
    assert.ok(authRoute.includes('"' + route + '"'), `missing rate-limit route: ${route}`);
  }
  assert.match(authRoute, /fallbackFingerprint/);
  assert.doesNotMatch(authRoute, /\|\|\s*"unknown"/);
  assert.match(authRoute, /Retry-After/);
});


test("public announcements and operational status are resilient to unavailable storage", async () => {
  const api = await readFile(new URL("../src/server/api.ts", import.meta.url), "utf8");
  assert.match(api, /export const listActiveAnnouncements = createServerFn/);
  assert.match(api, /where active = true order by created_at desc limit 10/);
  assert.match(api, /Announcement storage is unavailable/);
  assert.match(api, /Could not persist the operational check history/);
});

test("admin report notes are available in the report moderation UI", async () => {
  const admin = await readFile(new URL("../src/components/admin-screen.tsx", import.meta.url), "utf8");
  const notesComponent = await readFile(new URL("../src/components/admin-report-notes.tsx", import.meta.url), "utf8");
  assert.match(admin, /<AdminReportNotes reportId={r.id} \/>/);
  assert.match(notesComponent, /addModerationReportNote/);
  assert.match(notesComponent, /listModerationReportNotes/);
});
