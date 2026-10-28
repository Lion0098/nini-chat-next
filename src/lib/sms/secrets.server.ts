import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() || process.env.OTP_HASH_SECRET?.trim() || "";
  if (secret.length < 32) throw new Error("sms_settings_encryption_secret_not_configured");
  return createHash("sha256").update(secret).digest();
}
export function encryptSmsSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}
export function decryptSmsSecret(value: string): string {
  const [prefix, version, ivText, tagText, encryptedText] = value.split(":");
  if (prefix !== "enc" || version !== "v1" || !ivText || !tagText || !encryptedText) throw new Error("sms_secret_format_invalid");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}