import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

function cleanUserId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function iso(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const adminGetUserDetails = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const userId = cleanUserId((input as { userId?: unknown } | null)?.userId);
    if (!userId) throw new Error("bad_input");
    return { userId };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const actor = await sql<{ profile_role: string | null; assigned_role: string | null }>`
      select p.role as profile_role, a.role as assigned_role
      from profiles p
      left join admin_role_assignments a on a.user_id = p.user_id
      where p.user_id = ${context.userId}
      limit 1
    `;
    const role = actor[0]?.assigned_role;
    if (actor[0]?.profile_role !== "admin" || (role !== "owner" && role !== "administrator")) {
      throw new Error("forbidden");
    }

    const rows = await sql<any>`
      select u.id, u.email, u.name, u.image, u."emailVerified" as email_verified,
        u."phoneNumber" as phone_number, u."phoneNumberVerified" as phone_number_verified,
        u."createdAt" as auth_created_at, u."updatedAt" as auth_updated_at,
        p.username, p.display_name, p.phone, p.about, p.role, p.suspended,
        coalesce(p.created_at, u."createdAt") as created_at, p.last_seen_at
      from "user" u left join profiles p on p.user_id = u.id
      where u.id = ${data.userId} limit 1
    `;
    const user = rows[0];
    if (!user) throw new Error("not_found");

    const [providers, sessions, sessionCount, restrictions, events, groups] = await Promise.all([
      sql<any>`select distinct "providerId" as provider from account where "userId" = ${data.userId} order by provider`,
      sql<any>`select "userAgent" as user_agent, "createdAt" as created_at, "expiresAt" as expires_at
        from "session" where "userId" = ${data.userId} and "expiresAt" > now()
        order by "createdAt" desc limit 10`,
      sql<any>`select count(*)::int as count from "session" where "userId" = ${data.userId} and "expiresAt" > now()`,
      sql<any>`select r.reason, r.created_at, r.expires_at, r.revoked_at,
          coalesce(ap.display_name, au.name, r.actor_user_id) as actor_name
        from admin_user_restrictions r
        left join profiles ap on ap.user_id = r.actor_user_id
        left join "user" au on au.id = r.actor_user_id
        where r.user_id = ${data.userId}
        order by r.created_at desc limit 10`,
      sql<any>`select e.action, e.created_at,
          coalesce(ap.display_name, au.name, e.actor_user_id) as actor_name
        from admin_audit_events e
        left join profiles ap on ap.user_id = e.actor_user_id
        left join "user" au on au.id = e.actor_user_id
        where e.target_user_id = ${data.userId}
        order by e.created_at desc, e.id desc limit 15`,
      sql<any>`select count(*)::int as count from chat_members cm
        join chats c on c.id = cm.chat_id where cm.user_id = ${data.userId} and c.kind = 'group'`,
    ]);

    return {
      profile: {
        userId: String(user.id), email: String(user.email ?? ""),
        displayName: String(user.display_name ?? user.name ?? ""),
        username: user.username == null ? null : String(user.username),
        image: user.image == null ? null : String(user.image),
        phone: user.phone == null ? null : String(user.phone),
        phoneNumber: user.phone_number == null ? null : String(user.phone_number),
        about: String(user.about ?? ""), role: String(user.role ?? "user"),
        suspended: Boolean(user.suspended),
        emailVerified: Boolean(user.email_verified),
        phoneVerified: Boolean(user.phone_number_verified),
        createdAt: iso(user.created_at), updatedAt: iso(user.auth_updated_at),
        lastSeenAt: iso(user.last_seen_at),
        registrationMethods: providers.map((row: any) => String(row.provider)),
        groupCount: Number(groups[0]?.count ?? 0),
      },
      activeSessions: Number(sessionCount[0]?.count ?? 0),
      sessions: sessions.map((row: any) => ({
        userAgent: String(row.user_agent ?? "Unknown device").slice(0, 240),
        createdAt: iso(row.created_at), expiresAt: iso(row.expires_at),
      })),
      restrictions: restrictions.map((row: any) => ({
        reason: String(row.reason), actorName: String(row.actor_name),
        createdAt: iso(row.created_at), expiresAt: iso(row.expires_at), revokedAt: iso(row.revoked_at),
      })),
      events: events.map((row: any) => ({
        action: String(row.action), actorName: String(row.actor_name), createdAt: iso(row.created_at),
      })),
    };
  });
