import { createHmac, timingSafeEqual } from "node:crypto";
import { getSql } from "../db";
import { assertSmsIrConfigured, sendSmsIrVerification } from "../sms/sms-ir";

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 3;

function otpSecret(): string {
  const secret = process.env.OTP_HASH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || "";
  if (secret.length < 32) throw new Error("otp_hash_secret_not_configured");
  return secret;
}

export function assertPhoneOtpConfigured(): void {
  void otpSecret();
}

function hashOtp(phoneNumber: string, code: string): Buffer {
  return createHmac("sha256", otpSecret()).update(`${phoneNumber}:${code}`).digest();
}

/** Persist only an HMAC of the OTP, then deliver it via the SMS.ir Verify template. */
export async function sendPhoneOtp(phoneNumber: string, code: string): Promise<void> {
  assertSmsIrConfigured();
  const sql = await getSql();
  await sql`delete from phone_otp_challenges where expires_at < now() - interval '1 day'`;
  const hash = hashOtp(phoneNumber, code).toString("hex");
  const rows = await sql<{ phone_number: string }>`
    insert into phone_otp_challenges (phone_number, code_hash, expires_at, attempts, sent_at, consumed_at)
    values (${phoneNumber}, ${hash}, now() + (${OTP_TTL_SECONDS} * interval '1 second'), 0, now(), null)
    on conflict (phone_number) do update set
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      sent_at = now(),
      consumed_at = null
    where phone_otp_challenges.sent_at <= now() - (${OTP_RESEND_COOLDOWN_SECONDS} * interval '1 second')
    returning phone_number
  `;
  if (!rows.length) throw new Error("otp_resend_cooldown");
  await sendSmsIrVerification(phoneNumber, code);
}

/** Verify atomically: expiry, max attempts, constant-time HMAC compare, one-time consume. */
export async function verifyPhoneOtp(phoneNumber: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) {
    const sql = await getSql();
    await sql`
      update phone_otp_challenges set attempts = attempts + 1
      where phone_number = ${phoneNumber} and consumed_at is null
        and expires_at > now() and attempts < ${OTP_MAX_ATTEMPTS}
    `;
    return false;
  }
  let expected: Buffer;
  try {
    expected = hashOtp(phoneNumber, code);
  } catch {
    return false;
  }
  const sql = await getSql();
  const rows = await sql<{ code_hash: string; attempts: number; usable: boolean }>`
    select code_hash, attempts,
           (expires_at > now() and consumed_at is null and attempts < ${OTP_MAX_ATTEMPTS}) as usable
    from phone_otp_challenges where phone_number = ${phoneNumber}
  `;
  const row = rows[0];
  if (!row || row.usable !== true || !/^[a-f0-9]{64}$/i.test(row.code_hash)) return false;
  const stored = Buffer.from(row.code_hash, "hex");
  if (stored.length !== expected.length || !timingSafeEqual(stored, expected)) {
    await sql`
      update phone_otp_challenges set attempts = attempts + 1
      where phone_number = ${phoneNumber} and consumed_at is null
        and expires_at > now() and attempts < ${OTP_MAX_ATTEMPTS}
    `;
    return false;
  }
  const consumed = await sql<{ phone_number: string }>`
    update phone_otp_challenges set consumed_at = now()
    where phone_number = ${phoneNumber} and code_hash = ${row.code_hash}
      and expires_at > now() and consumed_at is null and attempts < ${OTP_MAX_ATTEMPTS}
    returning phone_number
  `;
  return consumed.length === 1;
}
