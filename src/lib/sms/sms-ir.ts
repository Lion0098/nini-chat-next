import { toSmsIrMobile } from "../phone";
import { getSql } from "../db";
import { decryptSmsSecret } from "./secrets.server";

export type SmsIrMode = "sandbox" | "production";
function env(name: string): string { return process.env[name]?.trim() ?? ""; }
export function smsIrMode(): SmsIrMode { return env("SMS_IR_MODE").toLowerCase() === "production" ? "production" : "sandbox"; }

async function getSmsConfig() {
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`select key, value from system_settings where key in ('sms_provider','sms_enabled','sms_api_key_encrypted','sms_ir_template_id','sms_ir_parameter_name','sms_ir_production_approved')`;
  const values = new Map(rows.map((r) => [r.key, r.value]));
  const mode = smsIrMode();
  const encrypted = values.get("sms_api_key_encrypted") ?? "";
  let apiKey = encrypted ? decryptSmsSecret(encrypted) : "";
  if (!apiKey) apiKey = env(mode === "production" ? "SMS_IR_API_KEY_PRODUCTION" : "SMS_IR_API_KEY_SANDBOX");
  const templateId = Number(values.get("sms_ir_template_id") || env("SMS_IR_TEMPLATE_ID"));
  const parameterName = values.get("sms_ir_parameter_name") || env("SMS_IR_TEMPLATE_PARAMETER_NAME") || "Code";
  const enabled = values.get("sms_enabled") === "true" || (!values.has("sms_enabled") && Boolean(apiKey));
  const approved = values.get("sms_ir_production_approved") === "true" || env("SMS_IR_PRODUCTION_APPROVED") === "true";
  if ((values.get("sms_provider") || "sms_ir") !== "sms_ir") throw new Error("sms_provider_not_supported");
  if (!enabled || !apiKey || !Number.isSafeInteger(templateId) || templateId <= 0) throw new Error("sms_ir_not_configured");
  if (mode === "production" && !approved) throw new Error("sms_ir_production_not_approved");
  return { apiKey, templateId, parameterName };
}
// Kept synchronous for the Better Auth callback; DB-backed configuration is checked before delivery.
export function assertSmsIrConfigured(): void {
  const mode = smsIrMode();
  const key = env(mode === "production" ? "SMS_IR_API_KEY_PRODUCTION" : "SMS_IR_API_KEY_SANDBOX");
  if (!key) return;
  const id = Number(env("SMS_IR_TEMPLATE_ID"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("sms_ir_not_configured");
  if (mode === "production" && env("SMS_IR_PRODUCTION_APPROVED") !== "true") throw new Error("sms_ir_production_not_approved");
}
/** Stable provider-neutral interface; provider-specific request details stay in this adapter. */
export async function sendSmsVerification(phoneNumber: string, code: string): Promise<void> {
  if (!/^\d{4,8}$/.test(code)) throw new Error("invalid_otp_format");
  const config = await getSmsConfig();
  const response = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": config.apiKey },
    body: JSON.stringify({ mobile: toSmsIrMobile(phoneNumber), templateId: config.templateId, parameters: [{ name: config.parameterName, value: code }] }),
    signal: AbortSignal.timeout(10_000),
  });
  let result: { status?: number } | null = null;
  try { result = (await response.json()) as { status?: number }; } catch { result = null; }
  if (!response.ok || result?.status !== 1) throw new Error(`sms_delivery_failed_${response.status}`);
}
export const sendSmsIrVerification = sendSmsVerification;