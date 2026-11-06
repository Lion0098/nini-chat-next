import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetAnalyticsOverview, adminGetUserAnalytics, adminListUsers, adminSendBulkDirectMessage, adminListBulkMessageJobs } from "@/server/api";

export function AdminInsights({ locale }: { locale: string }) {
  const fa = locale === "fa";
  const qc = useQueryClient();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [userId, setUserId] = useState("");
  const [target, setTarget] = useState("all");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const overview = useQuery({ queryKey: ["admin-insights-overview", days], queryFn: () => adminGetAnalyticsOverview({ data: { days } }) });
  const users = useQuery({ queryKey: ["admin-insights-users"], queryFn: () => adminListUsers({ data: { q: "" } }) });
  const detail = useQuery({ queryKey: ["admin-user-insights", userId], queryFn: () => adminGetUserAnalytics({ data: { userId } }), enabled: !!userId });
  const jobs = useQuery({ queryKey: ["admin-bulk-jobs"], queryFn: () => adminListBulkMessageJobs() });
  const o = overview.data as any;
  const number = (value: unknown) => value == null ? "—" : Number(value).toLocaleString(fa ? "fa-IR" : "en-US");
  const percent = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${number(value)}%`;
  const daily = o?.daily ?? [];
  const maxMessages = Math.max(1, ...daily.map((d: any) => Number(d.messages ?? 0)));
  const maxActive = Math.max(1, ...daily.map((d: any) => Number(d.activeUsers ?? 0)));
  const maxSignups = Math.max(1, ...daily.map((d: any) => Number(d.signups ?? 0)));
  const send = async () => {
    if (!confirmed || !body.trim()) return;
    const ids = target === "selected" && userId ? [userId] : [];
    if (target === "selected" && !ids.length) { toast.error(fa ? "یک کاربر انتخاب کن" : "Select a user"); return; }
    const result = await adminSendBulkDirectMessage({ data: { body, target, userIds: ids } });
    if (!result.ok) { toast.error(fa ? "ارسال ناموفق بود" : "Send failed"); return; }
    toast.success(fa ? `ارسال شد: ${result.data.sent}، ناموفق: ${result.data.failed}` : `Sent: ${result.data.sent}, failed: ${result.data.failed}`);
    setBody(""); setConfirmed(false); void qc.invalidateQueries({ queryKey: ["admin-bulk-jobs"] });
  };
  const cards = [
    [fa ? "ثبت‌نام جدید" : "New signups", o?.period_signups, o?.comparisons?.signups],
    [fa ? "کاربران تعامل‌دار" : "Engaged users", o?.engaged_users, o?.comparisons?.engagedUsers],
    [fa ? "پیام‌های ارسال‌شده" : "Messages sent", o?.period_messages, o?.comparisons?.messages],
    [fa ? "استوری‌های منتشرشده" : "Stories published", o?.period_stories, o?.comparisons?.stories],
  ];
  return <div className="space-y-5">
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">{fa ? "تحلیل عملکرد سامانه" : "Platform analytics"}</h2><p className="mt-1 text-xs text-muted">{fa ? "مقایسه با بازه زمانی قبلی هم‌اندازه؛ کاربران تعامل‌دار یعنی کاربران دارای پیام ارسالی." : "Compared with the immediately preceding period of equal length. Engaged users are users who sent at least one message."}</p></div>
        <label className="flex items-center gap-2 text-sm"><span>{fa ? "بازه زمانی" : "Date range"}</span><select value={days} onChange={e => setDays(Number(e.target.value) as 7 | 30 | 90)} className="h-10 rounded-lg bg-panel px-3"><option value={7}>{fa ? "۷ روز" : "7 days"}</option><option value={30}>{fa ? "۳۰ روز" : "30 days"}</option><option value={90}>{fa ? "۹۰ روز" : "90 days"}</option></select></label>
      </div>
      {overview.isError ? <p role="alert" className="rounded-lg bg-panel p-3 text-sm text-danger">{fa ? "دریافت آمار ناموفق بود. دوباره تلاش کنید." : "Analytics could not be loaded. Please retry."}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{cards.map(([label, value, change]: any) => <article key={label} className="rounded-xl bg-panel p-3"><p className="text-xs text-muted">{label}</p><strong className="mt-1 block text-xl">{overview.isLoading ? "…" : number(value)}</strong><p className="mt-1 text-xs text-muted">{fa ? "نسبت به دوره قبل: " : "vs previous period: "}{percent(change)}</p></article>)}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[[fa ? "کل کاربران" : "All users", o?.users], [fa ? "کل پیام‌ها" : "All-time messages", o?.messages], [fa ? "فعال در ۳۰ روز" : "Active · 30 days", o?.active_30d], [fa ? "غیرفعال در ۳۰ روز" : "Inactive · 30 days", o?.inactive_30d], [fa ? "کل استوری‌ها" : "All-time stories", o?.stories], [fa ? "میانگین پیام به‌ازای کاربر" : "Messages per user", o?.messages_per_user]].map(([label, value]: any) => <article key={label} className="rounded-xl bg-panel p-3"><p className="text-xs text-muted">{label}</p><strong className="text-lg">{overview.isLoading ? "…" : number(value)}</strong></article>)}</div>
      <article className="rounded-xl bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{fa ? `روند روزانه در ${days} روز اخیر` : `Daily trends · ${days} days`}</h3><span className="text-xs text-muted">{fa ? "پیام · کاربر تعامل‌دار · ثبت‌نام" : "Messages · engaged users · signups"}</span></div>
        {overview.isLoading ? <p className="py-8 text-center text-sm text-muted">{fa ? "در حال دریافت آمار…" : "Loading analytics…"}</p> : <div className="mt-4 overflow-x-auto pb-2"><div className="flex h-44 min-w-[620px] items-end gap-1" role="img" aria-label={fa ? "نمودار روند روزانه پیام‌ها، کاربران تعامل‌دار و ثبت‌نام‌ها" : "Daily messages, engaged users, and signups chart"}>{daily.map((d: any, index: number) => <div key={String(d.day)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className="flex h-[82%] w-full items-end justify-center gap-px"><div title={`${d.messages} ${fa ? "پیام" : "messages"}`} className="w-1/3 rounded-t bg-green" style={{ height: `${Math.max(2, Number(d.messages) / maxMessages * 100)}%` }} /><div title={`${d.activeUsers} ${fa ? "کاربر تعامل‌دار" : "engaged users"}`} className="w-1/3 rounded-t bg-blue" style={{ height: `${Math.max(2, Number(d.activeUsers) / maxActive * 100)}%` }} /><div title={`${d.signups} ${fa ? "ثبت‌نام" : "signups"}`} className="w-1/3 rounded-t bg-orange" style={{ height: `${Math.max(2, Number(d.signups) / maxSignups * 100)}%` }} /></div><span className="text-[9px] text-muted">{index % (days === 7 ? 1 : days === 30 ? 3 : 7) === 0 ? String(d.day).slice(8, 10) : ""}</span></div>)}</div></div>}
        <p className="mt-2 text-xs text-muted">{fa ? "ساعت اوج ارسال پیام: " : "Peak messaging hour: "}{o?.peakHour == null ? "—" : String(o.peakHour).padStart(2, "0") + ":00"}</p>
      </article>
      <article className="rounded-xl bg-panel p-4"><h3 className="font-medium">{fa ? "توزیع پیام بر اساس ساعت" : "Messages by hour"}</h3><div className="mt-3 grid grid-cols-12 gap-1 sm:grid-cols-24">{(o?.hourly ?? []).map((h: any) => { const max = Math.max(1, ...(o?.hourly ?? []).map((v: any) => Number(v.messages ?? 0))); return <div key={h.hour} className="flex flex-col items-center gap-1" title={`${h.hour}:00 · ${h.messages}`}><div className="flex h-16 w-full items-end rounded bg-header"><div className="w-full rounded-t bg-green" style={{ height: `${Math.max(2, Number(h.messages) / max * 100)}%` }} /></div><span className="text-[9px] text-muted">{h.hour}</span></div>; })}</div></article>
    </section>
    <section className="space-y-3 rounded-xl bg-panel p-4">
      <h2 className="font-semibold">{fa ? "تحلیل یک کاربر" : "User analytics"}</h2>
      <select value={userId} onChange={e => setUserId(e.target.value)} className="h-11 w-full rounded-lg bg-header px-3"><option value="">{fa ? "انتخاب کاربر" : "Choose user"}</option>{(users.data ?? []).map((u: any) => <option key={u.userId} value={u.userId}>{u.displayName || u.email} · {u.username || u.userId}</option>)}</select>
      {detail.isError ? <p role="alert" className="text-sm text-danger">{fa ? "دریافت جزئیات کاربر ناموفق بود." : "Could not load user analytics."}</p> : null}
      {detail.data?.ok ? <div className="space-y-2 text-sm"><p>{detail.data.data.profile.name} · {fa ? "عضویت" : "Joined"}: {detail.data.data.profile.joinedAt || "—"} · {fa ? "آخرین فعالیت" : "Last active"}: {detail.data.data.profile.lastSeenAt || "—"}</p><p>{fa ? "ارسالی" : "Sent"}: {detail.data.data.sent} · {fa ? "دریافتی" : "Received"}: {detail.data.data.received} · {fa ? "استوری" : "Stories"}: {detail.data.data.stories}</p><p className="font-medium">{fa ? "بیشترین تعامل" : "Top interactions"}</p>{detail.data.data.topPeers.map((p: any) => <p key={p.userId}>{p.name}: {p.interactions}</p>)}<p className="font-medium">{fa ? "گروه‌ها و گفتگوها" : "Chats and groups"}</p>{detail.data.data.chats.map((c: any) => <p key={c.id}>{c.title || c.kind} · {c.messages}</p>)}</div> : userId && detail.isLoading ? <p className="text-sm text-muted">{fa ? "در حال دریافت…" : "Loading…"}</p> : null}
    </section>
    <section className="space-y-3 rounded-xl bg-panel p-4">
      <h2 className="font-semibold">{fa ? "ارسال پیام خصوصی همگانی" : "Bulk direct message"}</h2>
      <p className="text-xs text-muted">{fa ? "هر گیرنده پیام را به شکل یک پیام خصوصی عادی از حساب مدیر دریافت می‌کند. حداکثر ۱۰۰ گیرنده در هر اجرا؛ کاربران مسدود/تعلیق‌شده مستثنا هستند." : "Each recipient gets a normal private chat message from the admin. Maximum 100 recipients per run; suspended users are excluded."}</p>
      <select value={target} onChange={e => { setTarget(e.target.value); setConfirmed(false); }} className="h-11 w-full rounded-lg bg-header px-3"><option value="all">{fa ? "همه کاربران" : "All users"}</option><option value="active">{fa ? "فعال در ۳۰ روز اخیر" : "Active in last 30 days"}</option><option value="inactive">{fa ? "غیرفعال" : "Inactive"}</option><option value="selected">{fa ? "کاربر انتخاب‌شده" : "Selected user"}</option></select>
      {target === "selected" ? <select value={userId} onChange={e => setUserId(e.target.value)} className="h-11 w-full rounded-lg bg-header px-3"><option value="">{fa ? "انتخاب کاربر" : "Choose user"}</option>{(users.data ?? []).map((u: any) => <option key={u.userId} value={u.userId}>{u.displayName || u.email}</option>)}</select> : null}
      <textarea value={body} maxLength={4000} onChange={e => { setBody(e.target.value); setConfirmed(false); }} placeholder={fa ? "متن پیام خصوصی…" : "Private message…"} className="min-h-28 w-full rounded-lg bg-header p-3" />
      <div className="rounded-lg border border-line p-3 text-sm"><strong>{fa ? "پیش‌نمایش پیام" : "Message preview"}</strong><p className="mt-2 whitespace-pre-wrap">{body || "—"}</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{fa ? "ارسال این پیام خصوصی را تأیید می‌کنم." : "I confirm sending this direct message."}</label>
      <button disabled={!confirmed || !body.trim() || (target === "selected" && !userId)} onClick={() => void send()} className="h-11 rounded-full bg-green px-5 text-on disabled:opacity-40">{fa ? "ارسال حداکثر به ۱۰۰ نفر" : "Send to up to 100 users"}</button>
      <div className="space-y-2"><strong className="text-sm">{fa ? "سوابق ارسال" : "Send history"}</strong>{(jobs.data ?? []).map((j: any) => <p key={j.id} className="rounded-lg bg-header p-2 text-xs">{j.target} · {j.sent}/{j.targetCount} · {fa ? "ناموفق" : "Failed"} {j.failed} · {j.createdAt}</p>)}</div>
    </section>
  </div>;
}
