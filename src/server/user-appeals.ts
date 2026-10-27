import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export const listMyModerationAppeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      reason: string;
      status: string;
      reviewer_note: string | null;
      created_at: unknown;
      reviewed_at: unknown;
    }>`
      select id, reason, status, reviewer_note, created_at, reviewed_at
      from moderation_appeals
      where user_id = ${context.userId}
      order by created_at desc
      limit 50
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      reason: row.reason,
      status: row.status,
      reviewerNote: row.reviewer_note,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      reviewedAt: row.reviewed_at == null ? null : row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : String(row.reviewed_at),
    }));
  });

export const createMyModerationAppeal = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("bad_input");
    const data = input as Record<string, unknown>;
    const reason = clean(data.reason, 2000);
    const restrictionId = data.restrictionId == null || data.restrictionId === ""
      ? null
      : Number(data.restrictionId);
    if (reason.length < 10) throw new Error("reason_too_short");
    if (restrictionId !== null && (!Number.isSafeInteger(restrictionId) || restrictionId < 1)) throw new Error("bad_input");
    return { reason, restrictionId };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.restrictionId !== null) {
      const restriction = await sql<{ id: number }>`
        select id from admin_user_restrictions
        where id = ${data.restrictionId} and user_id = ${context.userId}
        limit 1
      `;
      if (!restriction.length) return { ok: false as const, error: "restriction_not_found" };
    }
    const open = await sql<{ id: number }>`
      select id from moderation_appeals
      where user_id = ${context.userId} and status in ('open','reviewing')
      limit 1
    `;
    if (open.length) return { ok: false as const, error: "appeal_already_open" };
    const rows = await sql<{ id: number }>`
      insert into moderation_appeals(user_id, restriction_id, reason)
      values (${context.userId}, ${data.restrictionId}, ${data.reason})
      returning id
    `;
    return { ok: true as const, data: { id: Number(rows[0]?.id) } };
  });
