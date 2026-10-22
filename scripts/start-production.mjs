#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

process.env.NODE_ENV = "production";

const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`[startup] Missing required production environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

if (!/^(postgres|postgresql):\/\//i.test(process.env.DATABASE_URL)) {
  console.error("[startup] DATABASE_URL must use the postgres:// or postgresql:// scheme.");
  process.exit(1);
}

if ((process.env.BETTER_AUTH_SECRET ?? "").length < 32) {
  console.error("[startup] BETTER_AUTH_SECRET must contain at least 32 characters.");
  process.exit(1);
}

let authUrl;
try {
  authUrl = new URL(process.env.BETTER_AUTH_URL);
} catch {
  console.error("[startup] BETTER_AUTH_URL must be an absolute HTTPS URL.");
  process.exit(1);
}
if (authUrl.protocol !== "https:") {
  console.error("[startup] BETTER_AUTH_URL must use HTTPS in production.");
  process.exit(1);
}

const serverEntry = resolve(process.cwd(), ".output/server/index.mjs");
if (!existsSync(serverEntry)) {
  console.error("[startup] Production server bundle not found. Run npm run build first.");
  process.exit(1);
}

await import(pathToFileURL(serverEntry).href);
