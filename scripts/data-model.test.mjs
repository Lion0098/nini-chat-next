import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(root, "migrations/0003_data_integrity.sql"), "utf8");
const api = readFileSync(resolve(root, "src/server/api.ts"), "utf8");
const messenger = readFileSync(resolve(root, "src/components/messenger.tsx"), "utf8");

test("direct chat pairs have a canonical partial unique index", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS direct_user_a text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS direct_user_b text/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS chats_direct_pair_unique/i);
  assert.match(migration, /WHERE kind = 'direct'[\s\S]*direct_user_a IS NOT NULL[\s\S]*direct_user_b IS NOT NULL/i);
  assert.match(migration, /HAVING count\(\*\) = 2/i);
  assert.match(api, /direct_chat_creation_conflict/);
  assert.match(api, /new_members as \(/i);
});

test("message history uses a stable timestamp-and-ID cursor and supporting index", () => {
  assert.match(migration, /messages_chat_created_id_idx[\s\S]*chat_id, created_at DESC, id DESC/i);
  assert.match(api, /data\.beforeId/);
  assert.match(api, /\(m\.created_at, m\.id\) < \(/);
  assert.match(api, /order by m\.created_at desc, m\.id desc/i);
  assert.match(messenger, /beforeId: messages\[0\]\.id/);
});

test("audit events support structured metadata and explicit retention", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS audit_events/i);
  assert.match(migration, /metadata jsonb NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(migration, /retention_until timestamptz/i);
  assert.match(migration, /audit_events_actor_created_idx/i);
  assert.match(migration, /audit_events_retention_idx/i);
  assert.match(migration, /Do not put passwords, OTPs, access tokens, or message bodies/i);
});

test("migration is additive and does not drop tables or delete message history", () => {
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\s+messages\b/i);
  assert.match(migration, /UPDATE chats[\s\S]*ranked_pairs/i);
});
