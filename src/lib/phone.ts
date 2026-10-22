/** Normalize common Iranian mobile formats to E.164 for Better Auth. */
export function normalizeIranPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `+98${digits}`;
  if (/^989\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

/** SMS.ir expects the Iranian domestic mobile format (09xxxxxxxxx). */
export function toSmsIrMobile(e164: string): string {
  if (!/^\+989\d{9}$/.test(e164)) throw new Error("invalid_iranian_mobile");
  return `0${e164.slice(3)}`;
}
