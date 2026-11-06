import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts");
const ui = read("src/components/admin-insights.tsx");
const endpoint = api.slice(api.indexOf("export const adminGetAnalyticsOverview"), api.indexOf("export const adminGetUserAnalytics"));
test("analytics date range is validated and server access remains permission-gated", () => {
  assert.match(endpoint, /\.validator\(\(input: unknown\)[\s\S]*?\[7, 30, 90\]\.includes\(value\)/);
  assert.ok(endpoint.includes("requireAuditReader(sql, context.userId)"));
  assert.ok(endpoint.includes("rangeDays: days"));
});
test("overview returns daily engagement, period totals, and previous-period comparisons", () => {
  for (const field of ["period_messages", "previous_messages", "period_stories", "previous_stories", "period_signups", "previous_signups", "engaged_users", "previous_engaged_users"]) assert.ok(endpoint.includes(field), `missing ${field}`);
  assert.ok(endpoint.includes("count(distinct sender_id)::int as active_users"));
  assert.ok(endpoint.includes("comparisons:"));
  assert.ok(endpoint.includes("engagedUsers: change(summary.engaged_users, summary.previous_engaged_users)"));
  assert.ok(endpoint.includes("Array.from({ length: 24 }"));
  assert.ok(endpoint.includes("peakHour: peak ? num(peak.hour) : null"));
});
test("insights UI exposes 7, 30, and 90 day filters with comparisons and accessible charts", () => {
  for (const days of [7, 30, 90]) assert.ok(ui.includes(`value={${days}}`), `missing ${days}-day option`);
  assert.ok(ui.includes("adminGetAnalyticsOverview({ data: { days } })"));
  assert.ok(ui.includes("vs previous period"));
  assert.ok(ui.includes('role="img"'));
  assert.ok(ui.includes("Messages by hour"));
});
