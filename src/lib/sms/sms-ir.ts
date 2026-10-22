import { toSmsIrMobile } from "../phone";

export type SmsIrMode = "sandbox" | "production";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function smsIrMode(): SmsIrMode {
  return env("SMS_IR_MODE").toLowerCase() === "production" ? "production" : "sandbox";
}

export function assertSmsIrConfigured(): void {
  const mode = smsIrMode();
  const key = env(mode === "production" ? "SMS_IR_API_KEY_PRODUCTION" : "SMS_IR_API_KEY_SANDBOX");
  const templateId = Number(env("SMS_IR_TEMPLATE_ID"));
  if (mode === "production" && env("SMS_IR_PRODUCTION_APPROVED") !== "true") {
    throw new Error("sms_ir_production_not_approved");
  }
  if (!key || !Number.isSafeInteger(templateId) || templateId <= 0) {
    throw new Error("sms_ir_not_configured");
  }
}

/** Send a verification code using SMS.ir's Verify endpoint. API keys stay server-side. */
export async function sendSmsIrVerification(phoneNumber: string, code: string): Promise<void> {
  assertSmsIrConfigured();
  const mode = smsIrMode();
  const apiKey = env(mode === "production" ? "SMS_IR_API_KEY_PRODUCTION" : "SMS_IR_API_KEY_SANDBOX");
  const templateId = Number(env("SMS_IR_TEMPLATE_ID"));
  const parameterName = env("SMS_IR_TEMPLATE_PARAMETER_NAME") || "Code";
  if (!/^\d{4,8}$/.test(code)) throw new Error("invalid_otp_format");
  const response = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      mobile: toSmsIrMobile(phoneNumber),
      templateId,
      parameters: [{ name: parameterName, value: code }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  let result: { status?: number; message?: string } | null = null;
  try {
    result = (await response.json()) as { status?: number; message?: string };
  } catch {
    result = null;
  }
  if (!response.ok || result?.status !== 1) {
    // Never log API keys, recipient numbers, or OTPs. Callers receive only a generic failure.
    throw new Error(`sms_ir_delivery_failed_${response.status}`);
  }
}
