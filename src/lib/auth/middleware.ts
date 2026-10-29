import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the caller's
 * verified user id. When deployed the session cookie is same-origin and rides
 * along automatically. In the live preview the client also forwards the bearer
 * token (partitioned cookies) via the `.client` hook below — call sites do not
 * thread it themselves.
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getSql } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listTodos = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const sql = await getSql();
 *       return sql`select * from todos where user_id = ${context.userId}`;
 *     });
 *
 * Signed out with auth on (live preview included) -> throws `UnauthorizedError`
 * (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
 * shipped default) it resolves the shared dev user — but throws instead when a
 * `DATABASE_URL` is also set, so an app without sign-in must not use this at
 * all. On the auth-on path, use it on every server function that touches
 * per-user data and scope every query by `context.userId`.
 */
export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    // Live preview (partitioned iframe): the session rides a bearer token, not a
    // cookie, so forward it to the server. Null when deployed (cookie auth), so
    // this is a no-op there.
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    // ONLY import `*.server` modules here. This file is dual client/server
    // (bearer hook on the client). A plain `./isolation` path was renamed to
    // `isolation.server.ts` — keep this import in sync so image `tsc` resolves
    // it, and so Vite does not ship `@tanstack/react-start/server` to the browser.
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireUserId } = await import("./verify.server");
    // Reject scripted cross-site/sibling requests before touching per-user data.
    assertSameSiteRequest();
    const userId = await requireUserId(context.bearerToken);

    // Phase 7 verification policies are DB-backed and checked on every
    // authenticated server-function request (not just displayed in Settings).
    // Keep a privileged recovery path so an unverified admin can turn a bad
    // policy off instead of locking the installation permanently.
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ email: string; email_verified: boolean; phone_verified: boolean; role: string | null }>`
        select u.email, u."emailVerified" as email_verified,
               coalesce(u."phoneNumberVerified", false) as phone_verified,
               p.role
        from "user" u left join profiles p on p.user_id = u.id
        where u.id = ${userId} limit 1`;
      const current = rows[0];
      if (current && !["admin", "owner", "administrator"].includes(current.role ?? "")) {
        const settings = await sql<{ key: string; value: string }>`
          select key, value from system_settings
          where key in ('require_email_verification', 'require_phone_verification')`;
        const policy = new Map(settings.map((row) => [row.key, row.value]));
        const isPhoneOnlyAccount = current.email.endsWith("@phone.nini.invalid");
        if (policy.get("require_email_verification") === "true" && !current.email_verified && !isPhoneOnlyAccount) {
          throw new Error("email_verification_required");
        }
        if (policy.get("require_phone_verification") === "true" && !current.phone_verified) {
          throw new Error("phone_verification_required");
        }
      }
    } catch (error) {
      if (error instanceof Error && /^(email|phone)_verification_required$/.test(error.message)) throw error;
      // Older installations without Phase 7 migrations retain the default-off policy.
    }
    return next({ context: { userId } });
  });
