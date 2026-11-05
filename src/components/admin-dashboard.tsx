import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGetAnalyticsOverview, adminGetOperationalStatus, adminListAuditEvents } from "@/server/api";

type DashboardStats = { users?: number; active?: number; suspended?: number; admins?: number; groups?: number; reports?: number; viewerRole?: string };
type DashboardTab = "users" | "groups" | "reports" | "audit" | "insights" | "ops";

export function AdminDashboard({ locale, stats, loading, onNavigate }: { locale: string; stats?: DashboardStats; loading: boolean; onNavigate: (tab: DashboardTab) => void }) {
  const fa = locale === "fa";
  const queryClient = useQueryClient();
  const analytics = useQuery({ queryKey: ["admin-insights-overview"], queryFn: () => adminGetAnalyticsOverview(), staleTime: 60_000 });
  const audit = useQuery({ queryKey: ["admin-dashboard-recent-events"], queryFn: () => adminListAuditEvents({ data: { q: "", limit: 8 } }), staleTime: 30_000 });
  const canViewOps = ["owner", "administrator", "auditor"].includes(stats?.viewerRole ?? "");
  const operations = useQuery({ queryKey: ["admin-operational-status"], queryFn: () => adminGetOperationalStatus(), enabled: canViewOps, staleTime: 120_000, retry: false });
  const number = (value: unknown) => Number(value ?? 0).toLocaleString(fa ? "fa-IR" : "en-US");
  const overview = analytics.data;
  const days = (overview?.daily ?? []).slice(-14);
  const maxMessages = Math.max(1, ...days.map((day: { messages?: number }) => Number(day.messages ?? 0)));
  const events = audit.data?.ok ? audit.data.data.events.slice(0, 8) : [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-insights-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-recent-events"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-operational-status"] });
  };
  const newUsers30d = (overview?.daily ?? []).reduce((total: number, day: { signups?: number }) => total + Number(day.signups ?? 0), 0);
  const cards = [
    { label: fa ? "کل کاربران" : "Total users", value: stats?.users },
    { label: fa ? "فعال در ۳۰ روز" : "Active · 30 days", value: overview?.active_30d },
    { label: fa ? "کل پیام‌ها" : "Total messages", value: overview?.messages },
    { label: fa ? "استوری‌ها" : "Stories", value: overview?.stories },
    { label: fa ? "ثبت‌نام در ۳۰ روز" : "Signups · 30 days", value: newUsers30d },
    { label: fa ? "گروه‌ها" : "Groups", value: stats?.groups },
    { label: fa ? "گزارش‌های باز" : "Open reports", value: stats?.reports },
    { label: fa ? "حساب‌های تعلیق‌شده" : "Suspended accounts", value: stats?.suspended },
    { label: fa ? "میانگین پیام به‌ازای کاربر" : "Messages per user", value: overview?.messages_per_user },
  ];
  const statusLabel = (status: string) => status === "ok" ? (fa ? "سالم" : "Healthy") : status === "warning" ? (fa ? "هشدار" : "Warning") : (fa ? "خطا" : "Error");

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">{fa ? "نمای کلی سامانه" : "System overview"}</h2><p className="mt-1 text-xs text-muted">{fa ? "آمار و وضعیت قابل مشاهده برای نقش مدیریتی شما" : "Metrics and system status available to your admin role"}</p></div>
        <button type="button" onClick={refresh} className="h-10 rounded-full bg-panel px-4 text-sm" disabled={analytics.isFetching || audit.isFetching}>{fa ? "به‌روزرسانی اطلاعات" : "Refresh dashboard"}</button>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => <article key={card.label} className="rounded-xl bg-panel p-4"><p className="text-xs text-muted">{card.label}</p><p className="mt-2 text-2xl font-semibold">{loading || analytics.isLoading ? "…" : number(card.value)}</p></article>)}
      </section>
      {analytics.isError ? <p role="alert" className="rounded-lg bg-panel p-3 text-sm text-danger">{fa ? "دریافت آمار تحلیلی ناموفق بود؛ بخش‌های دیگر داشبورد همچنان در دسترس‌اند." : "Analytics could not be loaded. Other dashboard sections remain available."}</p> : null}
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-xl bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{fa ? "روند پیام‌ها در ۱۴ روز اخیر" : "Messages · last 14 days"}</h3><span className="text-xs text-muted">{fa ? "تعداد روزانه" : "Daily volume"}</span></div>
          <div className="mt-5 flex h-36 items-end gap-1.5" role="img" aria-label={fa ? "نمودار تعداد پیام‌های روزانه در ۱۴ روز اخیر" : "Daily message volume over the last 14 days"}>
            {days.map((day: { day: string; messages?: number }) => { const value = Number(day.messages ?? 0); const height = Math.max(4, Math.round((value / maxMessages) * 100)); return <div key={String(day.day)} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] text-muted">{number(value)}</span><div className="w-full rounded-t bg-green" style={{ height: height + "%", minHeight: 3 }} /><span className="text-[9px] text-muted">{String(day.day).slice(8, 10)}</span></div>; })}
          </div>
          <p className="mt-3 text-xs text-muted">{fa ? "ساعت اوج ارسال پیام در ۳۰ روز اخیر: " : "Peak messaging hour · last 30 days: "}{overview?.peakHour == null ? "—" : String(overview.peakHour).padStart(2, "0") + ":00"}</p>
        </article>
        <article className="rounded-xl bg-panel p-4">
          <h3 className="font-semibold">{fa ? "وضعیت عملیاتی" : "Operational health"}</h3>
          {!canViewOps ? <p className="mt-3 text-sm text-muted">{fa ? "این بررسی برای نقش فعلی شما مجاز نیست." : "Operational checks are not available for your role."}</p> : null}
          {canViewOps && operations.isLoading ? <p className="mt-3 text-sm text-muted">{fa ? "در حال بررسی…" : "Checking…"}</p> : null}
          {canViewOps && operations.isError ? <p role="alert" className="mt-3 text-sm text-danger">{fa ? "بررسی وضعیت عملیاتی انجام نشد." : "Operational checks failed."}</p> : null}
          {canViewOps && operations.data ? <div className="mt-3 space-y-2">{operations.data.checks.map((check: { name: string; status: string; detail: string }) => <div key={check.name} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-sm"><div className="min-w-0"><p className="font-medium">{check.name}</p><p className="mt-0.5 text-xs text-muted">{check.detail}</p></div><span className="shrink-0 rounded-full bg-header px-2 py-1 text-xs">{statusLabel(check.status)}</span></div>)}<p className="text-[11px] text-muted">{fa ? "این بررسی، آمادگی پیکربندی را می‌سنجد و جایگزین مانیتورینگ لحظه‌ای منابع سرور نیست." : "These checks verify configuration readiness; they are not live CPU, RAM, or disk monitoring."}</p></div> : null}
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl bg-panel p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{fa ? "آخرین رویدادهای مدیریتی" : "Recent admin events"}</h3><button type="button" onClick={() => onNavigate("audit")} className="text-xs text-green-2">{fa ? "مشاهده همه" : "View all"}</button></div>
          {audit.isLoading ? <p className="mt-3 text-sm text-muted">{fa ? "در حال دریافت…" : "Loading…"}</p> : null}
          {events.length === 0 && !audit.isLoading ? <p className="mt-3 text-sm text-muted">{fa ? "رویداد مدیریتی ثبت‌شده‌ای وجود ندارد." : "No admin events recorded."}</p> : null}
          <div className="mt-3 space-y-2">{events.map((event: { id: string; action: string; actorName: string; targetName?: string | null; createdAt: string }) => <div key={event.id} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-sm"><div className="min-w-0"><p className="font-medium">{event.action}</p><p className="text-xs text-muted">{event.actorName}{event.targetName ? " · " + event.targetName : ""}</p></div><time className="shrink-0 text-[11px] text-muted">{String(event.createdAt).replace("T", " ").slice(0, 16)}</time></div>)}</div>
        </article>
        <article className="rounded-xl bg-panel p-4">
          <h3 className="font-semibold">{fa ? "دسترسی سریع" : "Quick access"}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">{([
            ["users", fa ? "مدیریت کاربران" : "Users"], ["groups", fa ? "مدیریت گروه‌ها" : "Groups"],
            ["reports", fa ? "گزارش تخلفات" : "Reports"], ["insights", fa ? "تحلیل و آمار" : "Analytics"],
            ["ops", fa ? "عملیات و اطلاعیه‌ها" : "Operations"], ["audit", fa ? "گزارش رویدادها" : "Audit log"],
          ] as [DashboardTab, string][]).map(([tab, label]) => <button key={tab} type="button" onClick={() => onNavigate(tab)} className="min-h-11 rounded-lg bg-header px-3 text-start text-sm">{label} <span aria-hidden="true">↗</span></button>)}</div>
          <p className="mt-4 text-xs text-muted">{fa ? "نقش دسترسی فعلی: " : "Current access role: "}{stats?.viewerRole ?? "—"}</p>
        </article>
      </section>
    </div>
  );
}
