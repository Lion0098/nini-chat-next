import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";

const USERNAME = /^[a-z0-9._]{3,24}$/i;

async function setting(key: string, fallback: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from system_settings where key = ${key}`;
  return rows[0]?.value ?? fallback;
}

async function handleAuth(request: Request): Promise<Response> {
  if (process.env.VITE_AUTH_ENABLED === "false") {
    return Response.json({ code: "AUTH_DISABLED", message: "Authentication is disabled for this deployment." }, { status: 503 });
  }
  if (request.method === "POST") {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
    if (["/sign-up/email", "/phone-number/send-otp", "/phone-number/verify"].includes(path)) {
      let body: Record<string, unknown>;
      try {
        body = (await request.clone().json()) as Record<string, unknown>;
      } catch {
        return Response.json({ code: "BAD_REQUEST", message: "Invalid request." }, { status: 400 });
      }
      const sql = await getSql();
      const rows = await sql<{ value: string }>`select value from system_settings where key = ${"allow_signups"}`;
      const allSignups = (rows[0]?.value ?? "true") !== "false";
      if (path === "/sign-up/email") {
        const emailAllowed = (await setting("allow_email_signup", "true")) !== "false";
        const maintenance = (await setting("maintenance_message", "")).trim();
        if (maintenance) {
          return Response.json({ code: "MAINTENANCE", message: maintenance }, { status: 503 });
        }
        const username = String(body.username ?? "").trim();
        if (!USERNAME.test(username)) {
          return Response.json({ code: "INVALID_USERNAME", message: "A valid unique username is required." }, { status: 400 });
        }
        if (!allSignups || !emailAllowed) {
          return Response.json({ code: "SIGNUP_DISABLED", message: "Registration is currently unavailable." }, { status: 403 });
        }
      } else {
        const phone = String(body.phoneNumber ?? "");
        const existing = phone ? await sql<{ id: string }>`select id from "user" where "phoneNumber" = ${phone} limit 1` : [];
        const phoneAllowed = (await setting("allow_phone_signup", "true")) !== "false";
        // Existing phone accounts can always request an OTP to sign in; these flags
        // only prevent creating a new account when registration is disabled.
        if (!existing.length && (!allSignups || !phoneAllowed)) {
          return Response.json({ code: "SIGNUP_DISABLED", message: "Registration is currently unavailable." }, { status: 403 });
        }
        if (path === "/phone-number/verify" && !existing.length && !USERNAME.test(String(body.username ?? "").trim())) {
          return Response.json({ code: "INVALID_USERNAME", message: "A valid unique username is required for a new account." }, { status: 400 });
        }
      }
    }
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
