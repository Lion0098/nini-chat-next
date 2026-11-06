import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts");
const ui = read("src/components/admin-screen.tsx");
const schema = read("migrations/0009_phase7_platform_ops.sql");

test("public announcement delivery remains active-only and separate from private messages", () => {
  const publicList = api.slice(api.indexOf("export const listActiveAnnouncements"), api.indexOf("export const adminListAnnouncements"));
  assert.match(publicList, /where active = true/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS system_announcements/);
  assert.match(ui, /public in-app announcements only/i);
  assert.match(ui, /Private user messages and bulk direct messages remain separate/i);
});

test("all announcement management APIs require announcements.manage and audit mutations", () => {
  const start = api.indexOf("export const adminListAnnouncements");
  const end = api.indexOf("export const addModerationReportNote", start);
  const section = api.slice(start, end);
  for (const name of ["adminListAnnouncements", "adminCreateAnnouncement", "adminSetAnnouncementActive", "adminUpdateAnnouncement", "adminDeleteAnnouncement"]) {
    const at = section.indexOf(`export const ${name}`);
    assert.notEqual(at, -1, `missing ${name}`);
    const next = section.indexOf("export const ", at + 15);
    const body = section.slice(at, next === -1 ? section.length : next);
    assert.match(body, /requireAdminPermission\(sql, context\.userId, "announcements\.manage"\)/, `${name} permission`);
  }
  for (const action of ["system.announcement_created", "system.announcement_status_changed", "system.announcement_updated", "system.announcement_deleted"]) assert.ok(section.includes(action), `missing audit action ${action}`);
  assert.match(section, /returning id/);
  assert.match(section, /return err\("not_found"\)/);
});

test("notification center supports search, status filters, edit, activate/deactivate, and confirmed delete", () => {
  assert.match(ui, /notifications: "announcements\.manage"/);
  assert.match(ui, /tab === "notifications"/);
  assert.match(ui, /announcementSearch/);
  assert.match(ui, /announcementStatus/);
  assert.match(ui, /adminUpdateAnnouncement/);
  assert.match(ui, /adminSetAnnouncementActive/);
  assert.match(ui, /adminDeleteAnnouncement/);
  assert.match(ui, /Permanently delete this announcement/);
});
