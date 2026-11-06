import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api = await readFile(new URL("../src/server/api.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/components/admin-screen.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../migrations/0008_phase6_groups_channels.sql", import.meta.url), "utf8");
test("group administration exposes visibility, join policy and archive state", () => {
  assert.match(api, /export const adminListGroups = createServerFn/);
  assert.match(api, /c\.archived_at, c\.visibility, c\.join_policy/);
  assert.match(api, /export const adminSetGroupArchived = createServerFn/);
  assert.match(api, /group\.archived/);
  assert.match(api, /group\.unarchived/);
  assert.match(api, /group\.updated/);
  assert.match(migration, /ALTER TABLE chats ADD COLUMN IF NOT EXISTS archived_at/);
  assert.match(migration, /join_policy/);
});
test("group admin UI provides settings edit, archive, and confirmed delete", () => {
  assert.match(ui, /adminSetGroupArchived/);
  assert.match(ui, /Edit settings|ویرایش تنظیمات/);
  assert.match(ui, /Unarchive|خروج از بایگانی/);
  assert.match(ui, /Permanently delete this group/);
});

test("group member moderation is audited and protects the owner role", () => {
  assert.match(api, /export const adminListGroupMembers = createServerFn/);
  assert.match(api, /export const adminRemoveGroupMember = createServerFn/);
  assert.match(api, /group_owner_transfer_required/);
  assert.match(api, /group\.member_removed/);
  assert.match(ui, /مدیریت اعضا/);
});
