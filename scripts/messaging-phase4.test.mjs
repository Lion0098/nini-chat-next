import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(new URL("../src/server/api.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/lib/chat-types.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../migrations/0005_message_receipts.sql", import.meta.url), "utf8");

test("message receipts are persisted per recipient", () => {
  assert.ok(migration.includes("primary key (message_id, recipient_id)"));
  assert.ok(api.includes("insert into message_receipts (message_id, recipient_id)"));
  assert.ok(api.includes("set delivered_at = coalesce(mr.delivered_at, now())"));
});

test("read receipts respect the user's read-receipt preference", () => {
  assert.ok(api.includes("if (bool(me.read_receipts))"));
  assert.ok(api.includes("read_at = coalesce(mr.read_at, now())"));
});

test("message response types expose sender receipt state", () => {
  assert.ok(types.includes('receiptStatus: "sent" | "delivered" | "read" | null'));
  assert.ok(api.includes("receiptStatus: row.sender_id === me"));
});

test("edit and delete require current chat membership and message authorship", () => {
  assert.ok((api.match(/join chat_members cm on cm.chat_id = m.chat_id and cm.user_id = \${context.userId}/g) || []).length >= 2);
  assert.ok(api.includes("row.sender_id !== context.userId"));
});
