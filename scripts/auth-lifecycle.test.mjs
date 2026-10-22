import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const migration = read("migrations/0004_auth_lifecycle.sql");
const authServer = read("src/lib/auth/server.ts");
const authClient = read("src/lib/auth/client.ts");
const login = read("src/routes/login.tsx");
const authRoute = read("src/routes/api/auth/$.ts");
const api = read("src/server/api.ts");
const admin = read("src/components/admin-screen.tsx");
const bootstrap = read("scripts/bootstrap-admin.mjs");
const sms = read("src/lib/sms/sms-ir.ts");
const email = read("src/lib/email/resend.ts");
const messenger = read("src/components/messenger.tsx");
const otp = read("src/lib/auth/phone-otp.server.ts");

test("auth migration adds unique username and phone fields without deleting accounts", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "username" text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "phoneNumber" text/i);
  assert.match(migration, /phoneNumberVerified/i);
  assert.match(migration, /user_username_lower_unique[\s\S]*lower\("username"\)/i);
  assert.match(migration, /user_phone_number_unique/i);
  assert.match(migration, /allow_email_signup/);
  assert.match(migration, /allow_phone_signup/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS phone_otp_challenges/);
  assert.match(migration, /code_hash text NOT NULL/);
  assert.match(migration, /expires_at timestamptz NOT NULL/);
  assert.match(migration, /consumed_at timestamptz/);
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b|\bDELETE\s+FROM\s+"user"/i);
});

test("email verification is optional and email/password does not depend on Grok OAuth credentials", () => {
  assert.match(authServer, /emailVerification:[\s\S]*sendOnSignUp: false/);
  assert.match(authServer, /requireEmailVerification: false/);
  assert.match(authServer, /accountLinking: \{ enabled: false \}/);
  assert.match(authServer, /emailAndPasswordEnabled \|\| Boolean\(grokClientId && grokClientSecret\)/);
  assert.match(login, /username: username\.trim\(\)\.toLowerCase\(\)/);
  assert.match(messenger, /authClient\.sendVerificationEmail/);
});

test("phone registration uses Better Auth OTP with the SMS.ir adapter and username", () => {
  assert.match(authServer, /phoneNumber\(/);
  assert.match(authServer, /sendPhoneOtp/);
  assert.match(authClient, /phoneNumberClient\(\)/);
  assert.match(login, /phoneNumber\.sendOtp/);
  assert.match(login, /phoneNumber\.verify/);
  assert.match(authRoute, /allow_phone_signup/);
  assert.match(authRoute, /INVALID_USERNAME/);
  assert.match(authRoute, /AUTH_DISABLED/);
  assert.match(sms, /https:\/\/api\.sms\.ir\/v1\/send\/verify/);
  assert.match(sms, /SMS_IR_PRODUCTION_APPROVED/);
  assert.match(otp, /createHmac\("sha256"/);
  assert.match(otp, /timingSafeEqual/);
  assert.match(otp, /OTP_MAX_ATTEMPTS = 3/);
  assert.match(otp, /OTP_RESEND_COOLDOWN_SECONDS = 60/);
  assert.match(otp, /consumed_at is null/);
});

test("registration method toggles are enforced server-side and available to admins", () => {
  assert.match(authRoute, /allow_email_signup/);
  assert.match(authRoute, /allow_phone_signup/);
  assert.match(api, /allowEmailSignup/);
  assert.match(api, /allowPhoneSignup/);
  assert.match(admin, /Email\/password registration|ثبت‌نام با ایمیل/);
  assert.match(admin, /Phone\/SMS registration|ثبت‌نام با شماره موبایل/);
});

test("ordinary registration never grants admin automatically; bootstrap is explicit and refuses an existing admin", () => {
  assert.doesNotMatch(api, /update profiles set role = 'admin'\s+where user_id = \${userId}\s+and role <> 'admin'\s+and not exists/i);
  assert.match(bootstrap, /Usage: npm run admin:bootstrap/);
  assert.match(bootstrap, /An admin already exists/);
  assert.match(bootstrap, /DATABASE_URL is required/);
});

test("email delivery uses server-only credentials and does not send verification automatically", () => {
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /RESEND_FROM_EMAIL/);
  assert.match(authServer, /sendOnSignUp: false/);
  assert.doesNotMatch(sms, /YOUR_API_KEY|sk-[A-Za-z0-9]{12,}/);
});
