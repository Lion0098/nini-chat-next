import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { formatChatTime } from "@/lib/format";
import { AdminReportNotes } from "@/components/admin-report-notes";
import {
  adminCreateUser,
  adminCreateAnnouncement,
  adminGetOperationalStatus,
  adminListAnnouncements,
  adminListModerationAppeals,
  adminReviewModerationAppeal,
  adminGetDashboard,
  adminListAuditEvents,
  adminSetAdminRole,
  adminSetUserRestriction,
  adminRevokeUserSessions,
  adminDeleteGroup,
  adminDeleteUser,
  adminGetSettings,
  adminListGroups,
  adminListReports,
  adminListUsers,
  adminSaveSettings,
  adminSaveUser,
  adminSetReport,
  adminUpdateGroup,
  getMe,
} from "@/server/api";

type Tab = "dashboard" | "users" | "groups" | "reports" | "appeals" | "audit" | "system" | "ops";

export function AdminScreen() {
  const { t, err, locale } = usePrefs();
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [tab, setTab] = useState<Tab>("users");
  const [q, setQ] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminGetDashboard(),
    enabled: meQ.data?.role === "admin",
  });
  const audit = useQuery({
    queryKey: ["admin-audit", q],
    queryFn: () => adminListAuditEvents({ data: { q, limit: 100 } }),
    enabled: meQ.data?.role === "admin" && tab === "audit",
  });
  const users = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminListUsers({ data: { q } }),
    enabled: meQ.data?.role === "admin" && tab === "users",
  });
  const groups = useQuery({
    queryKey: ["admin-groups", q],
    queryFn: () => adminListGroups({ data: { q } }),
    enabled: meQ.data?.role === "admin" && tab === "groups",
  });
  const reports = useQuery({
    queryKey: ["admin-reports", reportStatus],
    queryFn: () => adminListReports({ data: { status: reportStatus } }),
    enabled: meQ.data?.role === "admin" && tab === "reports",
  });
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminGetSettings(),
    enabled: meQ.data?.role === "admin" && tab === "system",
  });
  const announcements = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => adminListAnnouncements(),
    enabled: meQ.data?.role === "admin" && tab === "ops",
  });
  const operationalStatus = useQuery({
    queryKey: ["admin-operational-status"],
    queryFn: () => adminGetOperationalStatus(),
    enabled: meQ.data?.role === "admin" && tab === "ops",
  });
  const appeals = useQuery({
    queryKey: ["admin-moderation-appeals"],
    queryFn: () => adminListModerationAppeals({ data: { status: "" } }),
    enabled: meQ.data?.role === "admin" && tab === "appeals",
  });
  const [draft, setDraft] = useState<{ email: string; displayName: string; username: string } | null>(null);

  if (meQ.isLoading) return <div className="grid h-dvh place-items-center bg-shell">{t("appName")}</div>;
  if (!meQ.data || meQ.data.role !== "admin") {
    return (
      <div className="grid h-dvh place-items-center bg-shell p-6 text-center">
        <div>
          <p>{t("notAdmin")}</p>
          <Link to="/" className="mt-3 inline-block text-green-2">{t("back")}</Link>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = ["dashboard", "users", "groups", "reports", "appeals", "audit", "system", "ops"];
  const label: Record<Tab, string> = {
    dashboard: locale === "fa" ? "داشبورد" : "Dashboard",
    users: t("users"), groups: t("groups"), reports: t("reports"),
    audit: locale === "fa" ? "گزارش رویدادها" : "Audit log", system: t("system"),
    appeals: locale === "fa" ? "اعتراض‌های کاربران" : "Appeals",
    ops: locale === "fa" ? "عملیات و اطلاعیه‌ها" : "Operations",
  };

  return (
    <div className="min-h-dvh bg-shell text-ink">
      <header className="flex h-14 items-center gap-2 bg-green px-3 text-on">
        <Link to="/" aria-label={t("back")} className="grid size-11 place-items-center">
          <ArrowRight className="size-5 rtl:rotate-180" />
        </Link>
        <h1 className="font-semibold">{t("adminTitle")}</h1>
      </header>
      <div className="mx-auto max-w-5xl p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {tabs.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`h-10 shrink-0 rounded-full px-4 text-sm ${tab === item ? "bg-green text-on" : "bg-panel"}`}>
              {label[item]}
            </button>
          ))}
        </div>
        {["users", "groups", "audit"].includes(tab) ? (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchUsersPh")} className="mb-4 h-11 w-full rounded-lg bg-panel px-3 outline-none" />
        ) : null}
        {tab === "dashboard" ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [locale === "fa" ? "کل کاربران" : "Total users", dashboard.data?.users],
              [locale === "fa" ? "حساب‌های فعال" : "Active accounts", dashboard.data?.active],
              [locale === "fa" ? "مسدودشده‌ها" : "Suspended accounts", dashboard.data?.suspended],
              [locale === "fa" ? "مدیران دارای نقش" : "Privileged accounts", dashboard.data?.admins],
              [locale === "fa" ? "گروه‌ها" : "Groups", dashboard.data?.groups],
              [locale === "fa" ? "گزارش‌های باز" : "Open reports", dashboard.data?.reports],
            ].map(([title, value]) => (
              <article key={String(title)} className="rounded-xl bg-panel p-4">
                <p className="text-sm text-muted">{title}</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.isLoading ? "…" : Number(value ?? 0).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}</p>
              </article>
            ))}
            <p className="text-xs text-muted sm:col-span-2 lg:col-span-3">{locale === "fa" ? `نقش دسترسی شما: ${dashboard.data?.viewerRole ?? "—"}` : `Your access role: ${dashboard.data?.viewerRole ?? "—"}`}</p>
          </section>
        ) : null}
        {tab === "audit" ? (
          <section className="space-y-2">
            <p className="text-xs text-muted">{locale === "fa" ? "این رویدادها فقط خواندنی هستند؛ اطلاعات محرمانه در جزئیات ثبت نمی‌شوند." : "Read-only events. Secret values are not included in event metadata."}</p>
            {(audit.data?.ok ? audit.data.data.events : []).length === 0 ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "رویدادی پیدا نشد." : "No events found."}</p> : null}
            {(audit.data?.ok ? audit.data.data.events : []).map((event) => (
              <article key={event.id} className="rounded-xl bg-panel p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><strong>{event.action}</strong><time className="text-muted">{formatChatTime(event.createdAt, locale, t)}</time></div>
                <p className="mt-1 text-muted">{locale === "fa" ? "عامل:" : "Actor:"} {event.actorName} · {locale === "fa" ? "هدف:" : "Target:"} {event.targetName || event.targetUserId || "—"}</p>
                {event.details ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(event.details, null, 2)}</pre> : null}
              </article>
            ))}
          </section>
        ) : null}
        {tab === "users" ? (
          <div className="space-y-3">
            <button type="button" onClick={() => setDraft({ email: "", displayName: "", username: "" })} className="h-10 rounded-full bg-green px-4 text-sm text-on">
              {t("createUser")}
            </button>
            {draft ? (
              <form
                className="grid gap-2 rounded-xl bg-panel p-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void adminCreateUser({ data: draft }).then((res) => {
                    if (!res.ok) toast.error(err(res.error));
                    else {
                      toast.success(locale === "fa" ? "دعوت‌نامه ایمیلی ارسال شد." : "Invitation email sent.");
                      setDraft(null);
                      void qc.invalidateQueries({ queryKey: ["admin-users"] });
                    }
                  });
                }}
              >
                <input required placeholder={t("name")} value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} className="h-11 rounded-lg bg-header px-3" />
                <input required placeholder={t("username")} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className="h-11 rounded-lg bg-header px-3" />
                <input required type="email" placeholder={t("email")} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="h-11 rounded-lg bg-header px-3" />
                <p className="text-xs text-muted sm:col-span-2">{locale === "fa" ? "لینک امن ۴۸ ساعته برای تعیین رمز به ایمیل کاربر ارسال می‌شود؛ مدیر رمز عبور را تعیین یا مشاهده نمی‌کند." : "A secure 48-hour link will be emailed so the user can set their own password. Admins never choose or see it."}</p>
                <div className="flex gap-2 sm:col-span-2">
                  <button className="h-10 rounded-full bg-green px-4 text-on">{t("create")}</button>
                  <button type="button" onClick={() => setDraft(null)} className="h-10 rounded-full bg-header px-4">{t("cancel")}</button>
                </div>
              </form>
            ) : null}
            <div className="overflow-x-auto rounded-xl bg-panel">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-muted">
                  <tr className="border-b border-line text-start">
                    <th className="px-3 py-2 font-medium">{t("name")}</th>
                    <th className="px-3 py-2 font-medium">{t("emailCol")}</th>
                    <th className="px-3 py-2 font-medium">{t("username")}</th>
                    <th className="px-3 py-2 font-medium">{t("role")}</th>
                    <th className="px-3 py-2 font-medium">{t("time")}</th>
                    <th className="px-3 py-2 font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.data ?? []).map((u) => (
                    <tr key={u.userId} className="border-b border-line">
                      <td className="px-3 py-2">{u.displayName}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">{u.suspended ? t("ban") : u.role === "admin" ? t("adminRole") : t("userRole")}</td>
                      <td className="px-3 py-2">{formatChatTime(u.lastSeenAt, locale, t)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-green-2"
                            onClick={() => {
                              const displayName = window.prompt(t("name"), u.displayName) ?? u.displayName;
                              const username = window.prompt(t("username"), u.username ?? "") ?? u.username;
                              void adminSaveUser({ data: { userId: u.userId, displayName, username } }).then((res) => {
                                if (!res.ok) toast.error(err(res.error));
                                else void qc.invalidateQueries({ queryKey: ["admin-users"] });
                              });
                            }}
                          >
                            {t("edit")}
                          </button>
                          {dashboard.data?.viewerRole === "owner" ? (
                            <button type="button" className="text-green-2" onClick={() => {
                              const chosen = window.prompt(locale === "fa" ? "نقش: administrator, moderator, support, auditor یا user برای لغو دسترسی" : "Role: administrator, moderator, support, auditor, or user to revoke", "auditor");
                              if (!chosen) return;
                              void adminSetAdminRole({ data: { userId: u.userId, role: chosen } }).then((res) => {
                                if (!res.ok) toast.error(err(res.error));
                                else { toast.success(locale === "fa" ? "نقش ثبت شد" : "Role saved"); void qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); }
                              });
                            }}>{locale === "fa" ? "تعیین دسترسی" : "Set access"}</button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              const suspended = !u.suspended;
                              const reason = window.prompt(locale === "fa" ? (suspended ? "دلیل مسدودسازی (حداقل ۳ نویسه)" : "یادداشت رفع مسدودی (اختیاری)") : (suspended ? "Restriction reason (at least 3 characters)" : "Unrestriction note (optional)"), "");
                              if (reason === null) return;
                              const durationText = suspended ? window.prompt(locale === "fa" ? "مدت به ساعت؛ خالی یعنی بدون انقضا" : "Duration in hours; blank means indefinite", "24") : null;
                              if (suspended && durationText === null) return;
                              const durationHours = durationText?.trim() ? Number(durationText) : null;
                              void adminSetUserRestriction({ data: { userId: u.userId, suspended, reason, durationHours } }).then((res) => {
                                if (!res.ok) toast.error(err(res.error));
                                else { toast.success(locale === "fa" ? "وضعیت دسترسی ذخیره شد" : "Access restriction saved"); void qc.invalidateQueries({ queryKey: ["admin-users"] }); void qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); }
                              });
                            }}
                          >
                            {u.suspended ? t("unban") : t("ban")}
                          </button>
                          <button type="button" onClick={() => {
                            if (!window.confirm(locale === "fa" ? "تمام نشست‌های فعال این کاربر لغو شود؟" : "Revoke all active sessions for this user?")) return;
                            void adminRevokeUserSessions({ data: { userId: u.userId } }).then((res) => {
                              if (!res.ok) toast.error(err(res.error));
                              else toast.success(locale === "fa" ? `تعداد نشست لغوشده: ${res.data.revokedCount}` : `Sessions revoked: ${res.data.revokedCount}`);
                            });
                          }}>{locale === "fa" ? "لغو نشست‌ها" : "Revoke sessions"}</button>
                          <button
                            type="button"
                            className="text-danger"
                            onClick={() => {
                              if (!window.confirm(t("confirmDelete"))) return;
                              void adminDeleteUser({ data: { userId: u.userId } }).then((res) => {
                                if (!res.ok) toast.error(err(res.error));
                                else void qc.invalidateQueries({ queryKey: ["admin-users"] });
                              });
                            }}
                          >
                            {t("deleteUser")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {tab === "groups" ? (
          <div className="space-y-2">
            {(groups.data ?? []).map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-panel px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-muted">{g.members} {t("members")}</div>
                </div>
                <button
                  type="button"
                  className="text-sm text-green-2"
                  onClick={() => {
                    const title = window.prompt(t("groupTitle"), g.title);
                    if (!title) return;
                    void adminUpdateGroup({ data: { id: g.id, title, about: g.about } }).then(() => qc.invalidateQueries({ queryKey: ["admin-groups"] }));
                  }}
                >
                  {t("editGroup")}
                </button>
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => {
                    if (!window.confirm(t("confirmDelete"))) return;
                    void adminDeleteGroup({ data: { id: g.id } }).then(() => qc.invalidateQueries({ queryKey: ["admin-groups"] }));
                  }}
                >
                  {t("deleteGroup")}
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {tab === "reports" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {["", "open", "reviewed", "dismissed"].map((s) => (
                <button key={s || "all"} type="button" onClick={() => setReportStatus(s)} className={`h-9 rounded-full px-3 text-sm ${reportStatus === s ? "bg-green text-on" : "bg-panel"}`}>
                  {s === "" ? t("all") : s === "open" ? t("open") : s === "reviewed" ? t("reviewed") : t("dismissed")}
                </button>
              ))}
            </div>
            {(reports.data ?? []).length === 0 ? <p className="text-sm text-muted">{t("noReports")}</p> : null}
            {(reports.data ?? []).map((r) => (
              <article key={r.id} className="rounded-xl bg-panel p-3 text-sm">
                <div className="font-medium">{r.reporterName} → {r.targetName || r.targetUserId || t("message")}</div>
                <div className="text-muted">{r.reason} · {r.status} · {formatChatTime(r.createdAt, locale, t)}</div>
                {r.details ? <p className="mt-1">{r.details}</p> : null}
                <AdminReportNotes reportId={r.id} />
                <div className="mt-2 flex gap-3">
                  <button type="button" className="text-green-2" onClick={() => void adminSetReport({ data: { id: r.id, status: "reviewed" } }).then(() => qc.invalidateQueries({ queryKey: ["admin-reports"] }))}>{t("markReviewed")}</button>
                  <button type="button" onClick={() => void adminSetReport({ data: { id: r.id, status: "dismissed" } }).then(() => qc.invalidateQueries({ queryKey: ["admin-reports"] }))}>{t("dismiss")}</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {tab === "appeals" ? (
          <div className="space-y-3">
            {(appeals.data ?? []).length === 0 ? <p className="text-sm text-muted">{locale === "fa" ? "اعتراضی ثبت نشده است." : "No appeals found."}</p> : null}
            {(appeals.data ?? []).map((a) => (
              <article key={a.id} className="space-y-2 rounded-xl bg-panel p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><strong>#{a.id} · {a.userId}</strong><span>{a.status} · {formatChatTime(a.createdAt, locale, t)}</span></div>
                <p>{a.reason}</p>
                {a.reviewerNote ? <p className="text-muted">{a.reviewerNote}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="text-green-2" onClick={() => {
                    const note = window.prompt(locale === "fa" ? "یادداشت بررسی (حداقل ۳ حرف)" : "Review note (at least 3 characters)");
                    if (!note || note.trim().length < 3) return;
                    void adminReviewModerationAppeal({ data: { id: a.id, status: "accepted", note } }).then(() => qc.invalidateQueries({ queryKey: ["admin-moderation-appeals"] }));
                  }}>{locale === "fa" ? "پذیرش اعتراض" : "Accept appeal"}</button>
                  <button type="button" className="text-danger" onClick={() => {
                    const note = window.prompt(locale === "fa" ? "دلیل رد اعتراض" : "Reason for rejection");
                    if (!note || note.trim().length < 3) return;
                    void adminReviewModerationAppeal({ data: { id: a.id, status: "rejected", note } }).then(() => qc.invalidateQueries({ queryKey: ["admin-moderation-appeals"] }));
                  }}>{locale === "fa" ? "رد اعتراض" : "Reject appeal"}</button>
                  <button type="button" onClick={() => void adminReviewModerationAppeal({ data: { id: a.id, status: "reviewing", note: "" } }).then(() => qc.invalidateQueries({ queryKey: ["admin-moderation-appeals"] }))}>{locale === "fa" ? "در حال بررسی" : "Mark reviewing"}</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {tab === "ops" ? (
          <div className="space-y-4">
            <section className="rounded-xl bg-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{locale === "fa" ? "وضعیت عملیاتی" : "Operational status"}</h2>
                <button type="button" className="text-sm text-green-2" onClick={() => void operationalStatus.refetch()}>{locale === "fa" ? "بررسی مجدد" : "Refresh"}</button>
              </div>
              <p className="mb-3 text-xs text-muted">{operationalStatus.data?.checkedAt ?? ""}</p>
              {(operationalStatus.data?.checks ?? []).map((c) => <div key={c.name} className="flex flex-wrap justify-between gap-2 border-b border-line py-2 text-sm"><strong>{c.name}</strong><span>{c.status}: {c.detail}</span></div>)}
              <p className="mt-3 text-xs text-muted">{locale === "fa" ? "این بررسی، سلامت پیامک/ایمیل یا موفقیت بکاپ را تضمین نمی‌کند." : "This does not verify SMS/email delivery or backup success."}</p>
            </section>
            <section className="space-y-3 rounded-xl bg-panel p-4">
              <h2 className="font-semibold">{locale === "fa" ? "ایجاد اطلاعیه سراسری" : "Create announcement"}</h2>
              <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} maxLength={160} placeholder={locale === "fa" ? "عنوان" : "Title"} className="h-11 w-full rounded-lg bg-header px-3" />
              <textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} maxLength={4000} placeholder={locale === "fa" ? "متن اطلاعیه" : "Announcement text"} className="min-h-24 w-full rounded-lg bg-header p-3" />
              <button type="button" className="h-10 rounded-full bg-green px-4 text-on" onClick={() => {
                if (!announcementTitle.trim() || !announcementBody.trim()) return;
                void adminCreateAnnouncement({ data: { title: announcementTitle, body: announcementBody, active: true } }).then((res) => {
                  if (!res.ok) { toast.error(err(res.error)); return; }
                  setAnnouncementTitle(""); setAnnouncementBody("");
                  toast.success(locale === "fa" ? "اطلاعیه ثبت شد" : "Announcement created");
                  void qc.invalidateQueries({ queryKey: ["admin-announcements"] });
                  void qc.invalidateQueries({ queryKey: ["admin-audit"] });
                });
              }}>{locale === "fa" ? "ثبت اطلاعیه" : "Publish announcement"}</button>
              <div className="space-y-2">
                {(announcements.data ?? []).map((a) => <article key={a.id} className="rounded-lg bg-header p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><strong>{a.title}</strong><span>{a.active ? (locale === "fa" ? "فعال" : "Active") : (locale === "fa" ? "غیرفعال" : "Inactive")}</span></div>
                  <p className="my-2 whitespace-pre-wrap">{a.body}</p>
                  <button type="button" className="text-green-2" onClick={() => void import("@/server/api").then(({ adminSetAnnouncementActive }) => adminSetAnnouncementActive({ data: { id: a.id, active: !a.active } })).then(() => qc.invalidateQueries({ queryKey: ["admin-announcements"] }))}>{a.active ? (locale === "fa" ? "غیرفعال کردن" : "Deactivate") : (locale === "fa" ? "فعال کردن" : "Activate")}</button>
                </article>)}
              </div>
            </section>
          </div>
        ) : null}
        {tab === "system" && settings.data ? (
          <SettingsForm
            initial={settings.data}
            onSave={async (value) => {
              const res = await adminSaveSettings({ data: value });
              if (!res.ok) toast.error(err(res.error));
              else {
                toast.success(t("saved"));
                void qc.invalidateQueries({ queryKey: ["admin-settings"] });
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SettingsForm({
  initial,
  onSave,
}: {
  initial: { allowSignups: boolean; allowEmailSignup: boolean; allowPhoneSignup: boolean; maxUploadBytes: number; rateLimitLoginMax: number; rateLimitSignupMax: number; rateLimitOtpMax: number; rateLimitWindowSeconds: number; requireEmailVerification: boolean; requirePhoneVerification: boolean; maintenance: string };
  onSave: (v: { allowSignups: boolean; allowEmailSignup: boolean; allowPhoneSignup: boolean; maxUploadBytes: number; rateLimitLoginMax: number; rateLimitSignupMax: number; rateLimitOtpMax: number; rateLimitWindowSeconds: number; requireEmailVerification: boolean; requirePhoneVerification: boolean; maintenance: string }) => Promise<void>;
}) {
  const { t, locale } = usePrefs();
  const [allowSignups, setAllow] = useState(initial.allowSignups);
  const [allowEmailSignup, setAllowEmail] = useState(initial.allowEmailSignup);
  const [allowPhoneSignup, setAllowPhone] = useState(initial.allowPhoneSignup);
  const [maxUploadBytes, setMax] = useState(String(initial.maxUploadBytes));
  const [rateLimitLoginMax, setRateLogin] = useState(String(initial.rateLimitLoginMax));
  const [rateLimitSignupMax, setRateSignup] = useState(String(initial.rateLimitSignupMax));
  const [rateLimitOtpMax, setRateOtp] = useState(String(initial.rateLimitOtpMax));
  const [rateLimitWindowSeconds, setRateWindow] = useState(String(initial.rateLimitWindowSeconds));
  const [requireEmailVerification, setRequireEmail] = useState(initial.requireEmailVerification);
  const [requirePhoneVerification, setRequirePhone] = useState(initial.requirePhoneVerification);
  const [maintenance, setNote] = useState(initial.maintenance);
  return (
    <form
      className="max-w-lg space-y-3 rounded-xl bg-panel p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ allowSignups, allowEmailSignup, allowPhoneSignup, maxUploadBytes: Number(maxUploadBytes), rateLimitLoginMax: Number(rateLimitLoginMax), rateLimitSignupMax: Number(rateLimitSignupMax), rateLimitOtpMax: Number(rateLimitOtpMax), rateLimitWindowSeconds: Number(rateLimitWindowSeconds), requireEmailVerification, requirePhoneVerification, maintenance });
      }}
    >
      <label className="flex items-center justify-between">
        <span>{t("allowSignups")}</span>
        <input type="checkbox" checked={allowSignups} onChange={(e) => setAllow(e.target.checked)} className="size-5" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>{locale === "fa" ? "ثبت‌نام با ایمیل و رمز عبور" : "Email/password registration"}</span>
        <input type="checkbox" checked={allowEmailSignup} onChange={(e) => setAllowEmail(e.target.checked)} className="size-5" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>{locale === "fa" ? "ثبت‌نام با شماره موبایل و پیامک" : "Phone/SMS registration"}</span>
        <input type="checkbox" checked={allowPhoneSignup} onChange={(e) => setAllowPhone(e.target.checked)} className="size-5" />
      </label>
      <p className="text-xs leading-relaxed text-muted">{locale === "fa" ? "این گزینه‌ها ثبت‌نام جدید هر روش را کنترل می‌کنند؛ ورود کاربران موجود همچنان مجاز است." : "These switches control new registrations. Existing users can still sign in."}</p>
      <label className="flex items-center justify-between gap-3">
        <span>{locale === "fa" ? "الزام تأیید ایمیل" : "Require email verification"}</span>
        <input type="checkbox" checked={requireEmailVerification} onChange={(e) => setRequireEmail(e.target.checked)} className="size-5" />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>{locale === "fa" ? "الزام تأیید شماره تلفن" : "Require phone verification"}</span>
        <input type="checkbox" checked={requirePhoneVerification} onChange={(e) => setRequirePhone(e.target.checked)} className="size-5" />
      </label>
      <p className="text-xs text-muted">{locale === "fa" ? "سیاست‌های تأیید در دیتابیس ذخیره می‌شوند؛ اعمال کامل روی تمام روش‌های ورود و نشست‌ها هنوز نیازمند تکمیل و آزمون جداگانه است." : "Verification policies are stored; full enforcement across all identity providers and sessions still requires additional implementation and tests."}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "حد ورود در پنجره" : "Login attempts/window"}</span><input type="number" min={3} max={30} value={rateLimitLoginMax} onChange={(e) => setRateLogin(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
        <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "حد ثبت‌نام" : "Signup attempts/window"}</span><input type="number" min={2} max={15} value={rateLimitSignupMax} onChange={(e) => setRateSignup(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
        <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "حد درخواست OTP" : "OTP attempts/window"}</span><input type="number" min={1} max={8} value={rateLimitOtpMax} onChange={(e) => setRateOtp(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
        <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "پنجره (ثانیه)" : "Window (seconds)"}</span><input type="number" min={30} max={3600} value={rateLimitWindowSeconds} onChange={(e) => setRateWindow(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
      </div>
      <label className="block text-sm">
        <span className="text-muted">{t("maxUpload")}</span>
        <input value={maxUploadBytes} onChange={(e) => setMax(e.target.value)} className="mt-1 h-11 w-full rounded-lg bg-header px-3" />
      </label>
      <label className="block text-sm">
        <span className="text-muted">{t("maintenance")}</span>
        <textarea value={maintenance} onChange={(e) => setNote(e.target.value)} className="mt-1 h-24 w-full rounded-lg bg-header p-3" />
      </label>
      <button className="h-11 rounded-full bg-green px-5 text-on">{t("saveSettings")}</button>
    </form>
  );
}
