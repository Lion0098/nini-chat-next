import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts");
const ui = read("src/components/admin-screen.tsx");
const notes = read("src/components/admin-report-notes.tsx");
const perms = read("src/lib/auth/admin-permissions.ts");

test("moderation report reads and status changes enforce separate least-privilege permissions", () => {
  const list = api.slice(api.indexOf("export const adminListReports"), api.indexOf("export const adminSetReport"));
  const update = api.slice(api.indexOf("export const adminSetReport"), api.indexOf("export const adminGetSettings"));
  assert.match(list, /requireAdminPermission\(sql, context\.userId, "moderation\.read"\)/);
  assert.match(update, /requireAdminPermission\(sql, context\.userId, "moderation\.manage"\)/);
  assert.match(update, /returning id/);
  assert.match(update, /if \(!changed\.length\) return err\("not_found"\)/);
  assert.match(update, /report\.status_changed/);
  assert.doesNotMatch(list + update, /requireAdmin\(sql, context\.userId\)/);
});

test("moderation notes and appeals keep independent read/write permissions", () => {
  assert.match(api, /addModerationReportNote[\s\S]*?moderation\.notes\.write/);
  assert.match(api, /listModerationReportNotes[\s\S]*?moderation\.notes\.read/);
  assert.match(api, /adminListModerationAppeals[\s\S]*?moderation\.appeals\.read/);
  assert.match(api, /adminReviewModerationAppeal[\s\S]*?moderation\.appeals\.manage/);
  assert.match(notes, /canWrite: boolean/);
  assert.match(notes, /canWrite \? <>/);
  assert.match(notes, /notes\.isError/);
});

test("admin UI loads effective permissions and hides tabs/actions the role cannot use", () => {
  assert.match(api, /adminGetMyAdminAccess[\s\S]*?permissionsForRole\(role\)/);
  assert.match(ui, /ADMIN_TABS\.filter/);
  assert.match(ui, /TAB_PERMISSION/);
  assert.match(ui, /can\("moderation\.manage"\)/);
  assert.match(ui, /can\("moderation\.appeals\.manage"\)/);
  assert.match(ui, /Moderation center/);
  assert.match(ui, /reports\.isError/);
});
