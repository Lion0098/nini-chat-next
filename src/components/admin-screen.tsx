import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { formatChatTime } from "@/lib/format";
import { AdminReportNotes } from "@/components/admin-report-notes";
import { AdminInsights } from "@/components/admin-insights";
import { AdminDashboard } from "@/components/admin-dashboard";
import { adminGetUserDetails, adminSetUserActive, adminRequestUserPasswordReset } from "@/server/admin-user-details";
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
  adminSetGroupArchived,
  adminListGroupMembers,
  adminRemoveGroupMember,
  adminListStories,
  adminDeleteStory,
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

type Tab = "dashboard" | "users" | "groups" | "stories" | "reports" | "appeals" | "audit" | "system" | "ops" | "insights";
type AuditPage = Awaited<ReturnType<typeof adminListAuditEvents>>;

export function AdminScreen() {
  const { t, err, locale } = usePrefs();
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [q, setQ] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "restricted" | "deactivated">("all");
  const [reportStatus, setReportStatus] = useState("");
  const [storyStatus, setStoryStatus] = useState<"all" | "active" | "expired">("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminGetDashboard(),
    enabled: meQ.data?.role === "admin",
  });
  const [auditAction, setAuditAction] = useState("");
  const [auditFromDate, setAuditFromDate] = useState("");
  const [auditToDate, setAuditToDate] = useState("");
  const audit = useInfiniteQuery<AuditPage, Error>({
    queryKey: ["admin-audit", q, auditAction, auditFromDate, auditToDate],
    initialPageParam: "",
    queryFn: ({ pageParam }) => adminListAuditEvents({ data: { q, action: auditAction, fromDate: auditFromDate, toDate: auditToDate, limit: 50, cursor: pageParam as string } }),
    getNextPageParam: (lastPage) => lastPage.ok ? (lastPage.data.nextCursor ?? undefined) : undefined,
    enabled: meQ.data?.role === "admin" && tab === "audit",
  });
  const users = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminListUsers({ data: { q } }),
    enabled: meQ.data?.role === "admin" && tab === "users",
  });
  const userDetails = useQuery({
    queryKey: ["admin-user-details", selectedUserId],
    queryFn: () => adminGetUserDetails({ data: { userId: selectedUserId! } }),
    enabled: meQ.data?.role === "admin" && tab === "users" && Boolean(selectedUserId),
  });
  const groups = useQuery({
    queryKey: ["admin-groups", q],
    queryFn: () => adminListGroups({ data: { q } }),
    enabled: meQ.data?.role === "admin" && tab === "groups",
  });
  const groupMembers = useQuery({
    queryKey: ["admin-group-members", selectedGroupId],
    queryFn: () => adminListGroupMembers({ data: { id: selectedGroupId! } }),
    enabled: meQ.data?.role === "admin" && tab === "groups" && Boolean(selectedGroupId),
  });
  const stories = useQuery({
    queryKey: ["admin-stories", q, storyStatus],
    queryFn: () => adminListStories({ data: { q, status: storyStatus } }),
    enabled: meQ.data?.role === "admin" && tab === "stories",
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
  const visibleUsers = (users.data ?? []).filter((user) =>
    userStatusFilter === "all" ||
    (userStatusFilter === "restricted" ? user.suspended : userStatusFilter === "deactivated" ? !user.isActive : user.isActive && !user.suspended),
  );

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

  const tabs: Tab[] = ["dashboard", "users", "groups", "stories", "reports", "appeals", "audit", "insights", "system", "ops"];
  const label: Record<Tab, string> = {
    dashboard: locale === "fa" ? "داشبورد" : "Dashboard",
    users: t("users"), groups: t("groups"), stories: locale === "fa" ? "مدیریت استوری‌ها" : "Stories", reports: t("reports"),
    audit: locale === "fa" ? "گزارش رویدادها" : "Audit log", system: t("system"),
    appeals: locale === "fa" ? "اعتراض‌های کاربران" : "Appeals",
    insights: locale === "fa" ? "تحلیل و پیام همگانی" : "Analytics & bulk messages",
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
        {["users", "groups", "stories", "audit"].includes(tab) ? (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchUsersPh")} className="mb-4 h-11 w-full rounded-lg bg-panel px-3 outline-none" />
        ) : null}
        {tab === "dashboard" ? (
          <AdminDashboard locale={locale} stats={dashboard.data} loading={dashboard.isLoading} statsError={dashboard.isError} onNavigate={(nextTab) => setTab(nextTab)} />
        ) : null}
        {tab === "insights" ? <AdminInsights locale={locale} /> : null}
        {tab === "audit" ? (
          <section className="space-y-3">
            <p className="text-xs text-muted">{locale === "fa" ? "گزارش‌ها فقط خواندنی‌اند؛ اطلاعات محرمانه در جزئیات پوشانده می‌شوند." : "Read-only history. Sensitive metadata is redacted before display."}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input aria-label={locale === "fa" ? "نوع رویداد" : "Event action"} value={auditAction} onChange={(event) => setAuditAction(event.target.value)} placeholder={locale === "fa" ? "نوع رویداد؛ مثال user.updated" : "Action, e.g. user.updated"} className="h-10 min-w-0 rounded-lg bg-panel px-3 text-sm outline-none" />
              <label className="grid gap-1 text-xs text-muted">{locale === "fa" ? "از تاریخ" : "From date"}<input type="date" value={auditFromDate} max={auditToDate || undefined} onChange={(event) => setAuditFromDate(event.target.value)} className="h-10 rounded-lg bg-panel px-3 text-sm text-ink" /></label>
              <label className="grid gap-1 text-xs text-muted">{locale === "fa" ? "تا تاریخ" : "To date"}<input type="date" value={auditToDate} min={auditFromDate || undefined} onChange={(event) => setAuditToDate(event.target.value)} className="h-10 rounded-lg bg-panel px-3 text-sm text-ink" /></label>
            </div>
            {audit.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "در حال بارگذاری گزارش‌ها…" : "Loading audit events…"}</p> : null}
            {audit.isError ? <div className="rounded-xl bg-panel p-4 text-sm" role="alert">{locale === "fa" ? "بارگذاری گزارش‌ها ناموفق بود." : "Could not load audit events."}<button type="button" onClick={() => audit.refetch()} className="ms-3 underline">{locale === "fa" ? "تلاش مجدد" : "Retry"}</button></div> : null}
            {(() => {
              const events = audit.data?.pages.flatMap((page) => page.ok ? page.data.events : []) ?? [];
              return <>
                {events.length === 0 && !audit.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "رویدادی پیدا نشد." : "No events found."}</p> : null}
                {events.map((event) => (
                  <article key={event.id} className="rounded-xl bg-panel p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2"><strong>{event.action}</strong><time className="text-muted">{formatChatTime(event.createdAt, locale, t)}</time></div>
                    <p className="mt-1 break-words text-muted">{locale === "fa" ? "عامل:" : "Actor:"} {event.actorName} · {locale === "fa" ? "هدف:" : "Target:"} {event.targetName || event.targetUserId || "—"}</p>
                    {event.details ? <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted">{JSON.stringify(event.details, null, 2)}</pre> : null}
                  </article>
                ))}
                {audit.hasNextPage ? <button type="button" disabled={audit.isFetchingNextPage} onClick={() => audit.fetchNextPage()} className="h-10 w-full rounded-lg bg-panel text-sm disabled:opacity-50">{audit.isFetchingNextPage ? (locale === "fa" ? "در حال دریافت…" : "Loading…") : (locale === "fa" ? "نمایش رویدادهای بیشتر" : "Load more events")}</button> : null}
              </>;
            })()}
          </section>
        ) : null}
        {tab === "users" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setDraft({ email: "", displayName: "", username: "" })} className="h-10 rounded-full bg-green px-4 text-sm text-on">
                {t("createUser")}
              </button>
              <select aria-label={locale === "fa" ? "فیلتر وضعیت کاربران" : "Filter users by status"} value={userStatusFilter} onChange={(event) => setUserStatusFilter(event.target.value as typeof userStatusFilter)} className="h-10 rounded-lg bg-panel px-3 text-sm">
                <option value="all">{locale === "fa" ? "همه کاربران" : "All users"}</option>
                <option value="active">{locale === "fa" ? "فعال و بدون محدودیت" : "Active"}</option>
                <option value="restricted">{locale === "fa" ? "مسدود یا محدودشده" : "Restricted"}</option>
                <option value="deactivated">{locale === "fa" ? "حساب‌های غیرفعال" : "Deactivated"}</option>
              </select>
            </div>
            {selectedUserId ? (
              <section className="space-y-3 rounded-xl border border-line bg-panel p-4" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-semibold">{userDetails.data?.profile.displayName ?? (locale === "fa" ? "جزئیات حساب کاربر" : "User account details")}</h3><p className="text-xs text-muted">{userDetails.data?.profile.email ?? selectedUserId}</p></div>
                  <div className="flex flex-wrap gap-2">
                    {userDetails.data ? <button type="button" className="rounded-full bg-header px-3 py-2 text-sm" onClick={() => {
                      const isActive = !userDetails.data!.profile.isActive;
                      const reason = window.prompt(locale === "fa" ? (isActive ? "دلیل فعال‌سازی مجدد حساب" : "دلیل غیرفعال‌سازی حساب") : (isActive ? "Reason for reactivating this account" : "Reason for deactivating this account"), "");
                      if (reason === null || reason.trim().length < 3) return;
                      void adminSetUserActive({ data: { userId: selectedUserId!, isActive, reason } }).then((res) => {
                        if (!res.ok) { toast.error(err(res.error)); return; }
                        toast.success(locale === "fa" ? (isActive ? "حساب فعال شد." : `حساب غیرفعال شد؛ ${res.data.revokedSessions} نشست لغو شد.`) : (isActive ? "Account reactivated." : `Account deactivated; ${res.data.revokedSessions} sessions revoked.`));
                        void qc.invalidateQueries({ queryKey: ["admin-user-details", selectedUserId] });
                        void qc.invalidateQueries({ queryKey: ["admin-users"] });
                        void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
                      });
                    }}>{userDetails.data.profile.isActive ? (locale === "fa" ? "غیرفعال‌سازی حساب" : "Deactivate account") : (locale === "fa" ? "فعال‌سازی مجدد" : "Reactivate account")}</button> : null}
                    <button type="button" disabled={!userDetails.data?.profile.emailVerified} title={!userDetails.data?.profile.emailVerified ? (locale === "fa" ? "ابتدا باید ایمیل کاربر تأیید شود." : "The user's email must be verified first.") : undefined} className="rounded-full bg-header px-3 py-2 text-sm disabled:opacity-40" onClick={() => {
                      if (!window.confirm(locale === "fa" ? "لینک بازیابی رمز به ایمیل تأییدشده کاربر ارسال شود؟" : "Send a password-reset link to the user's verified email?")) return;
                      void adminRequestUserPasswordReset({ data: { userId: selectedUserId! } }).then((res) => {
                        if (!res.ok) toast.error(err(res.error));
                        else toast.success(locale === "fa" ? "درخواست ارسال لینک بازیابی ثبت شد." : "Password-reset email request queued.");
                      });
                    }}>{locale === "fa" ? "ارسال لینک بازیابی رمز" : "Send password reset"}</button>
                    <button type="button" onClick={() => setSelectedUserId(null)} className="rounded-full bg-header px-3 py-2 text-sm">{locale === "fa" ? "بستن" : "Close"}</button>
                  </div>
                </div>
                {userDetails.isLoading ? <p className="text-sm text-muted">{locale === "fa" ? "در حال دریافت اطلاعات حساب…" : "Loading account details…"}</p> : null}
                {userDetails.isError ? <p role="alert" className="text-sm text-danger">{locale === "fa" ? "دریافت جزئیات حساب ناموفق بود." : "Could not load account details."}</p> : null}
                {userDetails.data ? <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-muted">{locale === "fa" ? "شناسه ثابت کاربر" : "Immutable user ID"}</dt><dd className="break-all">{userDetails.data.profile.userId}</dd></div>
                    <div><dt className="text-muted">{t("username")}</dt><dd dir="ltr">@{userDetails.data.profile.username ?? "—"}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "وضعیت حساب" : "Account status"}</dt><dd>{!userDetails.data.profile.isActive ? (locale === "fa" ? "غیرفعال" : "Deactivated") : userDetails.data.profile.suspended ? t("ban") : (locale === "fa" ? "فعال" : "Active")}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "تأیید ایمیل" : "Email verification"}</dt><dd>{userDetails.data.profile.emailVerified ? (locale === "fa" ? "تأییدشده" : "Verified") : (locale === "fa" ? "تأییدنشده" : "Not verified")}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "تأیید شماره تلفن" : "Phone verification"}</dt><dd>{userDetails.data.profile.phoneVerified ? (locale === "fa" ? "تأییدشده" : "Verified") : (locale === "fa" ? "تأییدنشده" : "Not verified")}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "روش ثبت‌نام" : "Registration method"}</dt><dd>{userDetails.data.profile.registrationMethods.join(", ") || "—"}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "تاریخ عضویت" : "Joined"}</dt><dd>{formatChatTime(userDetails.data.profile.createdAt, locale, t)}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "آخرین فعالیت" : "Last activity"}</dt><dd>{formatChatTime(userDetails.data.profile.lastSeenAt, locale, t)}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "نشست‌های فعال" : "Active sessions"}</dt><dd>{userDetails.data.activeSessions}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "عضویت در گروه‌ها" : "Group memberships"}</dt><dd>{userDetails.data.profile.groupCount}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "شماره تماس" : "Phone"}</dt><dd dir="ltr">{userDetails.data.profile.phoneNumber ?? userDetails.data.profile.phone ?? "—"}</dd></div>
                    <div><dt className="text-muted">{locale === "fa" ? "درباره کاربر" : "About"}</dt><dd>{userDetails.data.profile.about || "—"}</dd></div>
                  </dl>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg bg-header p-3"><h4 className="mb-2 text-sm font-semibold">{locale === "fa" ? "دستگاه‌ها و نشست‌های فعال" : "Active devices and sessions"}</h4>{userDetails.data.sessions.length ? userDetails.data.sessions.map((session, index) => <div key={`${session.createdAt}-${index}`} className="border-t border-line py-2 text-xs"><p className="break-words">{session.userAgent}</p><p className="mt-1 text-muted">{locale === "fa" ? "شروع:" : "Started:"} {formatChatTime(session.createdAt, locale, t)} · {locale === "fa" ? "انقضا:" : "Expires:"} {formatChatTime(session.expiresAt, locale, t)}</p></div>) : <p className="text-xs text-muted">{locale === "fa" ? "نشست فعالی وجود ندارد." : "No active sessions."}</p>}</div>
                    <div className="rounded-lg bg-header p-3"><h4 className="mb-2 text-sm font-semibold">{locale === "fa" ? "سوابق محدودیت حساب" : "Restriction history"}</h4>{userDetails.data.restrictions.length ? userDetails.data.restrictions.map((item, index) => <div key={`${item.createdAt}-${index}`} className="border-t border-line py-2 text-xs"><p>{item.reason}</p><p className="mt-1 text-muted">{item.actorName} · {formatChatTime(item.createdAt, locale, t)} · {item.revokedAt ? (locale === "fa" ? "رفع‌شده" : "Revoked") : item.expiresAt ? formatChatTime(item.expiresAt, locale, t) : (locale === "fa" ? "بدون انقضا" : "No expiry")}</p></div>) : <p className="text-xs text-muted">{locale === "fa" ? "سابقه‌ای ثبت نشده است." : "No restriction history."}</p>}</div>
                  </div>
                  <div className="rounded-lg bg-header p-3"><h4 className="mb-2 text-sm font-semibold">{locale === "fa" ? "تاریخچه عضویت در گروه‌ها" : "Group membership history"}</h4>{userDetails.data.memberships.length ? userDetails.data.memberships.map((item, index) => <div key={`${item.action}-${item.createdAt}-${index}`} className="flex flex-wrap justify-between gap-2 border-t border-line py-2 text-xs"><span>{item.groupTitle} · {item.action}{item.newRole ? ` · ${item.newRole}` : ""}</span><span className="text-muted">{item.actorName} · {formatChatTime(item.createdAt, locale, t)}</span></div>) : <p className="text-xs text-muted">{locale === "fa" ? "سابقه عضویت گروهی ثبت نشده است." : "No group membership history."}</p>}</div>
                  <div className="rounded-lg bg-header p-3"><h4 className="mb-2 text-sm font-semibold">{locale === "fa" ? "آخرین اقدامات مدیریتی روی حساب" : "Recent administrative account events"}</h4>{userDetails.data.events.length ? userDetails.data.events.map((item, index) => <div key={`${item.action}-${item.createdAt}-${index}`} className="flex flex-wrap justify-between gap-2 border-t border-line py-2 text-xs"><span>{item.action} · {item.actorName}</span><time className="text-muted">{formatChatTime(item.createdAt, locale, t)}</time></div>) : <p className="text-xs text-muted">{locale === "fa" ? "رویدادی ثبت نشده است." : "No account events recorded."}</p>}</div>
                </> : null}
              </section>
            ) : null}
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
                  {visibleUsers.map((u) => (
                    <tr key={u.userId} className="border-b border-line">
                      <td className="px-3 py-2">{u.displayName}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">{!u.isActive ? (locale === "fa" ? "غیرفعال" : "Deactivated") : u.suspended ? t("ban") : u.role === "admin" ? t("adminRole") : t("userRole")}</td>
                      <td className="px-3 py-2">{formatChatTime(u.lastSeenAt, locale, t)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="text-green-2" onClick={() => setSelectedUserId(u.userId)}>
                            {locale === "fa" ? "جزئیات" : "Details"}
                          </button>
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
                                else { toast.success(locale === "fa" ? "وضعیت دسترسی ذخیره شد" : "Access restriction saved"); void qc.invalidateQueries({ queryKey: ["admin-users"] }); void qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); void qc.invalidateQueries({ queryKey: ["admin-user-details", u.userId] }); }
                              });
                            }}
                          >
                            {u.suspended ? t("unban") : t("ban")}
                          </button>
                          <button type="button" onClick={() => {
                            if (!window.confirm(locale === "fa" ? "تمام نشست‌های فعال این کاربر لغو شود؟" : "Revoke all active sessions for this user?")) return;
                            void adminRevokeUserSessions({ data: { userId: u.userId } }).then((res) => {
                              if (!res.ok) toast.error(err(res.error));
                              else { toast.success(locale === "fa" ? `تعداد نشست لغوشده: ${res.data.revokedCount}` : `Sessions revoked: ${res.data.revokedCount}`); void qc.invalidateQueries({ queryKey: ["admin-user-details", u.userId] }); }
                            });
                          }}>{locale === "fa" ? "لغو نشست‌ها" : "Revoke sessions"}</button>
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
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{locale === "fa" ? `تعداد گروه‌ها: ${(groups.data ?? []).length}` : `Groups: ${(groups.data ?? []).length}`}</span><button type="button" onClick={() => void groups.refetch()} className="underline">{locale === "fa" ? "بروزرسانی" : "Refresh"}</button></div>
            {groups.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "در حال بارگذاری گروه‌ها…" : "Loading groups…"}</p> : null}
            {groups.isError ? <p role="alert" className="rounded-xl bg-panel p-4 text-sm">{locale === "fa" ? "خطا در دریافت گروه‌ها" : "Could not load groups"}</p> : null}
            {(groups.data ?? []).length === 0 && !groups.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "گروهی پیدا نشد." : "No groups found."}</p> : null}
            {(groups.data ?? []).map((g) => (
              <article key={g.id} className="space-y-2 rounded-xl bg-panel p-3">
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><strong className="break-words">{g.title}</strong><p className="mt-1 text-xs text-muted">{g.members} {t("members")} · {g.visibility === "public" ? (locale === "fa" ? "عمومی" : "Public") : (locale === "fa" ? "خصوصی" : "Private")} · {g.joinPolicy}</p><p className="break-all text-[11px] text-muted">{g.id}</p></div><span className="rounded-full bg-shell px-2 py-1 text-xs">{g.archivedAt ? (locale === "fa" ? "بایگانی‌شده" : "Archived") : (locale === "fa" ? "فعال" : "Active")}</span></div>
                {g.about ? <p className="text-sm text-muted">{g.about}</p> : null}
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}>{selectedGroupId === g.id ? (locale === "fa" ? "بستن اعضا" : "Hide members") : (locale === "fa" ? "مدیریت اعضا" : "Manage members")}</button>
                  <button type="button" className="text-green-2" onClick={() => { const title = window.prompt(t("groupTitle"), g.title); if (!title?.trim()) return; const about = window.prompt(locale === "fa" ? "توضیحات گروه" : "Group description", g.about); const visibility = window.confirm(locale === "fa" ? "گروه عمومی باشد؟ (لغو = خصوصی)" : "Make this group public? (Cancel = private)") ? "public" : "private"; const joinPolicy = window.prompt(locale === "fa" ? "سیاست عضویت: invite / approval / open" : "Join policy: invite / approval / open", g.joinPolicy); void adminUpdateGroup({ data: { id: g.id, title, about: about ?? g.about, visibility, joinPolicy: joinPolicy || g.joinPolicy } }).then((res) => { if (!res.ok) toast.error(err(res.error)); else { toast.success(locale === "fa" ? "گروه بروزرسانی شد" : "Group updated"); void qc.invalidateQueries({ queryKey: ["admin-groups"] }); } }); }}>{locale === "fa" ? "ویرایش تنظیمات" : "Edit settings"}</button>
                  <button type="button" onClick={() => { const archived = !g.archivedAt; if (!window.confirm(locale === "fa" ? (archived ? "گروه بایگانی شود؟" : "گروه از بایگانی خارج شود؟") : (archived ? "Archive this group?" : "Unarchive this group?"))) return; void adminSetGroupArchived({ data: { id: g.id, archived } }).then((res) => { if (!res.ok) toast.error(err(res.error)); else void qc.invalidateQueries({ queryKey: ["admin-groups"] }); }); }}>{g.archivedAt ? (locale === "fa" ? "خروج از بایگانی" : "Unarchive") : (locale === "fa" ? "بایگانی" : "Archive")}</button>
                  <button type="button" className="text-danger" onClick={() => { if (!window.confirm(locale === "fa" ? "حذف گروه و پیام‌های وابسته؟ این کار قابل بازگشت نیست." : "Permanently delete this group and its messages? This cannot be undone.")) return; void adminDeleteGroup({ data: { id: g.id } }).then((res) => { if (!res.ok) toast.error(err(res.error)); else { toast.success(locale === "fa" ? "گروه حذف شد" : "Group deleted"); void qc.invalidateQueries({ queryKey: ["admin-groups"] }); } }); }}>{t("deleteGroup")}</button>
                </div>
                {selectedGroupId === g.id ? <div className="space-y-2 rounded-lg border border-line p-2"><div className="text-xs text-muted">{locale === "fa" ? "اعضای گروه" : "Group members"}</div>{groupMembers.isLoading ? <p className="text-xs text-muted">{locale === "fa" ? "در حال دریافت…" : "Loading…"}</p> : null}{(groupMembers.data ?? []).map((member) => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{member.displayName} · {member.role}</span>{member.role !== "owner" ? <button type="button" className="text-danger" onClick={() => { const reason = window.prompt(locale === "fa" ? "دلیل حذف عضو (حداقل ۳ حرف)" : "Reason for removing member (min 3 chars)"); if (!reason || reason.trim().length < 3) return; void adminRemoveGroupMember({ data: { id: g.id, userId: member.userId, reason } }).then((res) => { if (!res.ok) toast.error(err(res.error)); else { toast.success(locale === "fa" ? "عضو حذف شد" : "Member removed"); void qc.invalidateQueries({ queryKey: ["admin-group-members", g.id] }); void qc.invalidateQueries({ queryKey: ["admin-groups"] }); } }); }}>{locale === "fa" ? "حذف عضو" : "Remove member"}</button> : <span className="text-muted">{locale === "fa" ? "مالک" : "Owner"}</span>}</div>)}</div> : null}
              </article>
            ))}
          </section>
        ) : null}
        {tab === "stories" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">{(["all", "active", "expired"] as const).map((status) => <button key={status} type="button" onClick={() => setStoryStatus(status)} className={`h-9 rounded-full px-3 text-sm ${storyStatus === status ? "bg-green text-on" : "bg-panel"}`}>{status === "all" ? (locale === "fa" ? "همه" : "All") : status === "active" ? (locale === "fa" ? "فعال" : "Active") : (locale === "fa" ? "منقضی" : "Expired")}</button>)}</div>
            {stories.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "در حال بارگذاری استوری‌ها…" : "Loading stories…"}</p> : null}
            {stories.isError ? <p role="alert" className="rounded-xl bg-panel p-4 text-sm">{locale === "fa" ? "خطا در دریافت استوری‌ها" : "Could not load stories"}<button type="button" onClick={() => void stories.refetch()} className="ms-2 underline">{locale === "fa" ? "تلاش مجدد" : "Retry"}</button></p> : null}
            {(stories.data ?? []).length === 0 && !stories.isLoading ? <p className="rounded-xl bg-panel p-4 text-sm text-muted">{locale === "fa" ? "استوری‌ای پیدا نشد." : "No stories found."}</p> : null}
            {(stories.data ?? []).map((story) => <article key={story.id} className="space-y-2 rounded-xl bg-panel p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{story.displayName}</strong><span className="text-xs text-muted">{story.expired ? (locale === "fa" ? "منقضی" : "Expired") : (locale === "fa" ? "فعال" : "Active")}</span></div><p className="text-muted">{story.kind} · {story.views} {locale === "fa" ? "بازدید" : "views"}</p>{story.caption ? <p className="break-words">{story.caption}</p> : null}<p className="text-xs text-muted">{formatChatTime(story.createdAt, locale, t)} · {locale === "fa" ? "انقضا:" : "Expires:"} {formatChatTime(story.expiresAt, locale, t)}</p><div className="break-all text-[11px] text-muted">{story.id} · {story.userId}</div><button type="button" className="text-danger" onClick={() => { const reason = window.prompt(locale === "fa" ? "دلیل حذف استوری (حداقل ۳ حرف)" : "Reason for deleting story (min 3 chars)"); if (!reason || reason.trim().length < 3) return; if (!window.confirm(locale === "fa" ? "این استوری حذف شود؟" : "Delete this story?")) return; void adminDeleteStory({ data: { id: story.id, reason } }).then((res) => { if (!res.ok) toast.error(err(res.error)); else { toast.success(locale === "fa" ? "استوری حذف شد" : "Story deleted"); void qc.invalidateQueries({ queryKey: ["admin-stories"] }); } }); }}>{locale === "fa" ? "حذف استوری" : "Delete story"}</button></article>)}
          </section>
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
  initial: { allowSignups: boolean; allowEmailSignup: boolean; allowPhoneSignup: boolean; maxUploadBytes: number; rateLimitLoginMax: number; rateLimitSignupMax: number; rateLimitOtpMax: number; rateLimitWindowSeconds: number; requireEmailVerification: boolean; requirePhoneVerification: boolean; maintenance: string; fileStorageEnabled: boolean; fileUploadDefaultMaxBytes: number; fileUploadDailyQuotaBytes: number; fileUploadWeeklyQuotaBytes: number; fileUploadMonthlyQuotaBytes: number; fileUploadQuotaEnabled: boolean };
  onSave: (v: { allowSignups: boolean; allowEmailSignup: boolean; allowPhoneSignup: boolean; maxUploadBytes: number; rateLimitLoginMax: number; rateLimitSignupMax: number; rateLimitOtpMax: number; rateLimitWindowSeconds: number; requireEmailVerification: boolean; requirePhoneVerification: boolean; maintenance: string; fileUploadDefaultMaxBytes: number; fileUploadDailyQuotaBytes: number; fileUploadWeeklyQuotaBytes: number; fileUploadMonthlyQuotaBytes: number; fileUploadQuotaEnabled: boolean }) => Promise<void>;
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
  const [fileUploadDefaultMaxBytes, setFileMax] = useState(String(initial.fileUploadDefaultMaxBytes));
  const [fileUploadDailyQuotaBytes, setDailyQuota] = useState(String(initial.fileUploadDailyQuotaBytes));
  const [fileUploadWeeklyQuotaBytes, setWeeklyQuota] = useState(String(initial.fileUploadWeeklyQuotaBytes));
  const [fileUploadMonthlyQuotaBytes, setMonthlyQuota] = useState(String(initial.fileUploadMonthlyQuotaBytes));
  const [fileUploadQuotaEnabled, setQuotaEnabled] = useState(initial.fileUploadQuotaEnabled);
  return (
    <form
      className="max-w-lg space-y-3 rounded-xl bg-panel p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ allowSignups, allowEmailSignup, allowPhoneSignup, maxUploadBytes: Number(maxUploadBytes), rateLimitLoginMax: Number(rateLimitLoginMax), rateLimitSignupMax: Number(rateLimitSignupMax), rateLimitOtpMax: Number(rateLimitOtpMax), rateLimitWindowSeconds: Number(rateLimitWindowSeconds), requireEmailVerification, requirePhoneVerification, maintenance, fileUploadDefaultMaxBytes: Number(fileUploadDefaultMaxBytes), fileUploadDailyQuotaBytes: Number(fileUploadDailyQuotaBytes), fileUploadWeeklyQuotaBytes: Number(fileUploadWeeklyQuotaBytes), fileUploadMonthlyQuotaBytes: Number(fileUploadMonthlyQuotaBytes), fileUploadQuotaEnabled });
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
      <section className="space-y-3 rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-3"><strong>{locale === "fa" ? "ذخیره‌سازی فایل روی VPS" : "VPS file storage"}</strong><span className="rounded-full bg-header px-3 py-1 text-xs">{initial.fileStorageEnabled ? (locale === "fa" ? "فعال" : "Enabled") : (locale === "fa" ? "غیرفعال" : "Disabled")}</span></div>
        <p className="text-xs leading-relaxed text-muted">{locale === "fa" ? "ذخیره‌سازی روی دیسک فعلاً از این صفحه فعال نمی‌شود؛ ابتدا باید مسیر امن خارج از public، دسترسی نوشتن و پشتیبان‌گیری روی سرور بررسی شود. این بخش فقط سقف‌ها را تنظیم می‌کند." : "Disk storage cannot be enabled here. First verify a private path outside the web root, write permissions and backups on the server. This section only configures limits."}</p>
        <label className="flex items-center justify-between gap-3 text-sm"><span>{locale === "fa" ? "اعمال سهمیه کاربران" : "Enforce user quotas"}</span><input type="checkbox" checked={fileUploadQuotaEnabled} onChange={(e) => setQuotaEnabled(e.target.checked)} className="size-5" /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "حداکثر حجم هر فایل (بایت)" : "Max file size (bytes)"}</span><input type="number" min={100000} max={524288000} value={fileUploadDefaultMaxBytes} onChange={(e) => setFileMax(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
          <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "سهمیه روزانه (بایت)" : "Daily quota (bytes)"}</span><input type="number" min={0} value={fileUploadDailyQuotaBytes} onChange={(e) => setDailyQuota(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
          <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "سهمیه هفتگی (بایت)" : "Weekly quota (bytes)"}</span><input type="number" min={0} value={fileUploadWeeklyQuotaBytes} onChange={(e) => setWeeklyQuota(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
          <label className="block text-sm"><span className="text-muted">{locale === "fa" ? "سهمیه ماهانه (بایت)" : "Monthly quota (bytes)"}</span><input type="number" min={0} value={fileUploadMonthlyQuotaBytes} onChange={(e) => setMonthlyQuota(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-header px-3" /></label>
        </div>
        <p className="text-xs text-muted">{locale === "fa" ? "مقدار صفر به معنی بدون محدودیت است. واحد تمام فیلدها بایت است." : "Zero means unlimited. All values are in bytes."}</p>
      </section>
      <label className="block text-sm">
        <span className="text-muted">{t("maintenance")}</span>
        <textarea value={maintenance} onChange={(e) => setNote(e.target.value)} className="mt-1 h-24 w-full rounded-lg bg-header p-3" />
      </label>
      <button className="h-11 rounded-full bg-green px-5 text-on">{t("saveSettings")}</button>
    </form>
  );
}
