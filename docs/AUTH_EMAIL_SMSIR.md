# Nini Chat — Authentication Plan (Email + SMS.ir)

## User decision
The application will run on an Ubuntu VPS. Desired sign-in options are email and SMS verification through the user's SMS.ir account. SMS.ir provides Sandbox and Production API keys; development starts in Sandbox.

## Proposed account experience
- Email registration/sign-in with password, email verification, password reset, and secure sessions.
- Phone verification using a one-time code sent through SMS.ir.
- Link email and phone to one account only through an authenticated, verified flow. Never automatically merge accounts because an unverified email or phone matches.
- A verified phone can later be enabled as a sign-in option. Decide whether phone verification is mandatory at signup or can be completed later before implementing the final UX.
- Provide recovery options so losing a phone does not automatically lock a user out.

## SMS.ir integration
- Verification endpoint pattern: POST https://api.sms.ir/v1/send/verify, with X-API-KEY in the HTTP header and an approved verification template ID plus its parameter name/value.
- Sandbox and Production use the same base URL; use the Sandbox key for development. Confirm the current endpoint and schema against the user's SMS.ir developer panel before implementation.
- Test successful responses, malformed mobile numbers, invalid template IDs, provider errors, timeouts, and duplicate requests in Sandbox. Switch to Production only after tests pass and the user explicitly confirms.
- Never place an API key, OTP, or live credential in frontend code, Git commits, screenshots, logs, or chat. Store credentials only as server-side environment variables on the VPS, e.g. SMS_IR_API_KEY, SMS_IR_TEMPLATE_ID, SMS_IR_MODE=sandbox. Keep .env out of Git.
- Never log OTP values. Mask phone numbers in logs. Return generic client errors to reduce account/number enumeration.
- Generate codes server-side using a cryptographically secure generator. Store only a hash, use short expiry (e.g. 5 minutes), single use, and a strict attempt limit.
- Apply per-IP and per-phone rate limits, resend cooldown, daily send limits, and protection against repeated requests. SMS sending must remain server-side.
- A provider accepting a send request does not prove phone ownership; ownership is established only after the user submits the correct code.
- Email verification is a separate feature; SMS.ir does not verify email addresses.

## Production security checklist
- Secure, HttpOnly, SameSite browser session cookies; CSRF protection where applicable.
- Passwords hashed with a modern password-hashing algorithm, never plaintext.
- OTPs expire, are single-use, and are invalidated after success.
- Session rotation after login and sensitive account changes; logout/revocation support.
- HTTPS only, secrets outside the repository, restrictive CORS/trusted origins.
- Tests for expired/reused codes, incorrect attempts, rate limits, account linking, and unauthorized access.
- Do not claim production readiness until these tests and an end-to-end VPS test pass.

## Questions before production
1. Confirm the SMS.ir verification template ID and exact parameter name. Do not share the API key in chat.
2. Confirm whether phone verification is required at signup or can be completed later.
3. Confirm whether email + password and SMS OTP are two sign-in methods, or email verification followed by mandatory SMS verification.

## Deployment note
Previously inspected VPS context indicates Ubuntu 24.04.3 LTS with approximately 1 GB RAM and 24 GB disk. That is tight for a full web app plus PostgreSQL and supporting services. Check actual available memory before deployment; swap is only a safety buffer, not a substitute for RAM. Consider a larger VPS for production or keep the initial MVP lean.
