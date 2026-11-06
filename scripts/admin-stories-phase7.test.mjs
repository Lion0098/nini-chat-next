import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api = await readFile(new URL("../src/server/api.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../src/components/admin-screen.tsx", import.meta.url), "utf8");
const schema = await readFile(new URL("../migrations/0002_messenger.sql", import.meta.url), "utf8");
test("story moderation lists metadata and view counts without returning media payloads", () => {
  const section = api.slice(api.indexOf("export const adminListStories"), api.indexOf("export const adminDeleteStory"));
  assert.match(section, /from statuses s/);
  assert.match(section, /status_views/);
  assert.match(section, /count\(v\.viewer_id\)::int as views/);
  assert.doesNotMatch(section, /file_data/);
  assert.match(section, /s\.expires_at > now\(\)/);
  assert.match(section, /s\.expires_at <= now\(\)/);
  assert.match(schema, /create table if not exists statuses/);
});
test("story removal is admin-authorized and creates an audit event", () => {
  const section = api.slice(api.indexOf("export const adminDeleteStory"), api.indexOf("export const adminListReports"));
  assert.match(section, /requireAdmin/);
  assert.match(section, /delete from statuses where id/);
  assert.match(section, /story\.deleted/);
});
test("admin stories UI supports status filters, search, and confirmed removal", () => {
  assert.match(ui, /adminListStories/);
  assert.match(ui, /storyStatus/);
  assert.match(ui, /adminDeleteStory/);
  assert.match(ui, /Delete this story/);
  assert.match(ui, /مدیریت استوری‌ها/);
});
