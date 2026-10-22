#!/usr/bin/env node
/** One-time, explicit bootstrap of the first admin after a trusted user registers. */
import { Client } from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:bootstrap -- admin@example.com");
  process.exit(2);
}
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_URL is required. This script never uses the PGlite preview database.");
  process.exit(2);
}

const client = new Client({ connectionString });
try {
  await client.connect();
  await client.query("BEGIN");
  const admins = await client.query("SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1");
  if (admins.rowCount) throw new Error("An admin already exists; refusing to change roles.");
  const users = await client.query(
    'SELECT id, name, username FROM "user" WHERE lower(email) = $1 LIMIT 2',
    [email],
  );
  if (users.rowCount !== 1) throw new Error("The email must match exactly one existing account.");
  const user = users.rows[0];
  await client.query(
    `INSERT INTO profiles (user_id, username, display_name, role, last_seen_at)
     VALUES ($1, $2, $3, 'admin', NULL)
     ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = now()`,
    [user.id, user.username ?? null, user.name || user.username || "Admin"],
  );
  await client.query("COMMIT");
  console.log("Initial admin role granted to the existing account.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
