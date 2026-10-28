import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { encryptSmsSecret } from "@/lib/sms/secrets.server";

async function adminSql(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ role: string | null }>`select role from profiles where user_id = ${userId} limit 1`;
  if (!rows[0] || !["admin", "owner", "administrator"].includes(rows[0].role ?? "")) throw new Error("forbidden");
  return sql;
}
async function setting(sql: Awaited<ReturnType<typeof getSql>>, key: string, fallback = "") {
  const rows = await sql<{ value: string }>`select value from system_settings where key = ${key} limit 1`;
  return rows[0]?.value ?? fallback;
}
export const adminGetSmsSettings = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await adminSql(context.userId);
  return {
    provider: await setting(sql, "sms_provider", "sms_ir"),
    enabled: (await setting(sql, "sms_enabled", "false")) === "true",
    apiKeyConfigured: Boolean(await setting(sql, "sms_api_key_encrypted")),
    templateId: await setting(sql, "sms_ir_template_id"),
    parameterName: await setting(sql, "sms_ir_parameter_name", "Code"),
    productionApproved: (await setting(sql, "sms_ir_production_approved", "false")) === "true",
  };
});
export const adminSaveSmsSettings = createServerFn({ method: "POST" }).validator((input: unknown) => {
  if (!input || typeof input !== "object") throw new Error("bad_input");
  const o = input as Record<string, unknown>;
  const provider = String(o.provider ?? "sms_ir");
  const templateId = String(o.templateId ?? "").trim();
  const parameterName = String(o.parameterName ?? "Code").trim();
  const apiKey = String(o.apiKey ?? "").trim();
  if (provider !== "sms_ir") throw new Error("unsupported_sms_provider");
  if (!/^\d{1,12}$/.test(templateId)) throw new Error("invalid_sms_template_id");
  if (!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(parameterName)) throw new Error("invalid_sms_parameter_name");
  if (apiKey.length > 500) throw new Error("invalid_sms_api_key");
  return { provider, templateId, parameterName, apiKey, enabled: o.enabled === true, productionApproved: o.productionApproved === true };
}).middleware([authMiddleware]).handler(async ({ context, data }) => {
  const sql = await adminSql(context.userId);
  const pairs: [string, string][] = [
    ["sms_provider", data.provider], ["sms_enabled", data.enabled ? "true" : "false"],
    ["sms_ir_template_id", data.templateId], ["sms_ir_parameter_name", data.parameterName],
    ["sms_ir_production_approved", data.productionApproved ? "true" : "false"],
  ];
  if (data.apiKey) pairs.push(["sms_api_key_encrypted", encryptSmsSecret(data.apiKey)]);
  for (const [key, value] of pairs) await sql`insert into system_settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = ${value}, updated_at = now()`;
  return { ok: true };
});