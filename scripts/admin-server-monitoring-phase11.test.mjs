import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const api = read("src/server/api.ts"),
  permissions = read("src/lib/auth/admin-permissions.ts"),
  ui = read("src/components/admin-server-monitoring.tsx"),
  storage = read("src/lib/file-storage.ts");
test("server monitoring is protected by a dedicated read permission", () => {
  const block = api.slice(
    api.indexOf("export const adminGetServerMonitoring"),
    api.indexOf("// Phase 12:"),
  );
  assert.match(block, /requireAdminPermission\(sql, context\.userId, "server\.monitor\.read"\)/);
  assert.match(permissions, /owner:[\s\S]*server\.monitor\.read/);
  assert.match(permissions, /administrator:[\s\S]*server\.monitor\.read/);
  assert.match(permissions, /auditor:[\s\S]*server\.monitor\.read/);
  const nonAdmin = permissions.match(/moderator:[\s\S]*?auditor:/)?.[0] ?? "";
  assert.doesNotMatch(nonAdmin, /server\.monitor\.read/);
});
test("monitoring uses measured runtime, database and storage sources", () => {
  const block = api.slice(
    api.indexOf("export const adminGetServerMonitoring"),
    api.indexOf("// Phase 12:"),
  );
  for (const x of [
    "process.memoryUsage()",
    "loadavg()",
    "pg_database_size(current_database())",
    "pg_stat_activity",
    "getStorageFilesystemStats",
    "application_runtime_host",
  ])
    assert.ok(block.includes(x), `missing ${x}`);
  assert.match(api, /async function runtimeMemoryStats/);
  assert.match(api, /totalmem\(\)/);
  assert.match(api, /freemem\(\)/);
  assert.match(api, /cgroup_v2/);
  assert.match(api, /available:true/);
  assert.match(storage, /getStorageFilesystemStats/);
  assert.match(ui, /Without a host agent/);
  assert.match(ui, /Unavailable/);
});
test("monitoring UI refreshes and labels runtime scope", () => {
  assert.match(ui, /refetchInterval:\s*30_000/);
  assert.match(ui, /Runtime platform/);
  assert.match(ui, /Database connections/);
});
