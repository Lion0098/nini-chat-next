import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetAnalyticsOverview, adminGetUserAnalytics, adminListUsers, adminSendBulkDirectMessage, adminListBulkMessageJobs } from "@/server/api";

export function AdminInsights({locale}:{locale:string}) {
  const fa=locale==="fa", qc=useQueryClient();
  const [userId,setUserId]=useState("");
  const [target,setTarget]=useState("all");
  const [body,setBody]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const overview=useQuery({queryKey:["admin-insights-overview"],queryFn:()=>adminGetAnalyticsOverview()});
  const users=useQuery({queryKey:["admin-insights-users"],queryFn:()=>adminListUsers({data:{q:""}})});
  const detail=useQuery({queryKey:["admin-user-insights",userId],queryFn:()=>adminGetUserAnalytics({data:{userId}}),enabled:!!userId});
  const jobs=useQuery({queryKey:["admin-bulk-jobs"],queryFn:()=>adminListBulkMessageJobs()});
  const o=overview.data as any;
  const send=async()=>{
    if(!confirmed||!body.trim())return;
    const ids=target==="selected"&&userId?[userId]:[];
    if(target==="selected"&&!ids.length){toast.error(fa?"یک کاربر انتخاب کن":"Select a user");return;}
    const result=await adminSendBulkDirectMessage({data:{body,target,userIds:ids}});
    if(!result.ok){toast.error(fa?"ارسال ناموفق بود":"Send failed");return;}
    toast.success(fa?`ارسال شد: ${result.data.sent}، ناموفق: ${result.data.failed}`:`Sent: ${result.data.sent}, failed: ${result.data.failed}`);
    setBody("");setConfirmed(false);void qc.invalidateQueries({queryKey:["admin-bulk-jobs"]});
  };
  return <div className="space-y-5">
    <section className="space-y-3">
      <h2 className="font-semibold">{fa?"نمای کلی ۳۰ روز اخیر":"30-day overview"}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[[fa?"کاربران":"Users",o?.users],[fa?"پیام‌ها":"Messages",o?.messages],[fa?"استوری‌ها":"Stories",o?.stories],[fa?"فعال در ۳۰ روز":"Active (30d)",o?.active_30d],[fa?"غیرفعال":"Inactive",o?.inactive_30d],[fa?"میانگین پیام/کاربر":"Messages/user",o?.messages_per_user]].map(([k,v])=><article key={String(k)} className="rounded-xl bg-panel p-3"><p className="text-xs text-muted">{k}</p><strong className="text-xl">{v??"…"}</strong></article>)}
      </div>
      <p className="text-sm text-muted">{fa?"ساعت اوج فعالیت: ":"Peak hour: "}{o?.peakHour==null?"—":String(o.peakHour).padStart(2,"0")+":00"}</p>
      <div className="max-h-48 overflow-auto rounded-xl bg-panel p-3 text-xs">{(o?.daily??[]).map((d:any)=><p key={d.day} className="flex justify-between border-b border-line py-1"><span>{String(d.day).slice(0,10)}</span><span>{fa?"پیام":"Msg"} {d.messages} · {fa?"استوری":"Stories"} {d.stories} · {fa?"ثبت‌نام":"Signups"} {d.signups}</span></p>)}</div>
    </section>
    <section className="space-y-3 rounded-xl bg-panel p-4">
      <h2 className="font-semibold">{fa?"تحلیل یک کاربر":"User analytics"}</h2>
      <select value={userId} onChange={e=>setUserId(e.target.value)} className="h-11 w-full rounded-lg bg-header px-3"><option value="">{fa?"انتخاب کاربر":"Choose user"}</option>{(users.data??[]).map((u:any)=><option key={u.userId} value={u.userId}>{u.displayName||u.email} · {u.username||u.userId}</option>)}</select>
      {detail.data?.ok?<div className="space-y-2 text-sm"><p>{detail.data.data.profile.name} · {fa?"عضویت":"Joined"}: {detail.data.data.profile.joinedAt||"—"} · {fa?"آخرین فعالیت":"Last active"}: {detail.data.data.profile.lastSeenAt||"—"}</p><p>{fa?"ارسالی":"Sent"}: {detail.data.data.sent} · {fa?"دریافتی":"Received"}: {detail.data.data.received} · {fa?"استوری":"Stories"}: {detail.data.data.stories}</p><p className="font-medium">{fa?"بیشترین تعامل":"Top interactions"}</p>{detail.data.data.topPeers.map((p:any)=><p key={p.userId}>{p.name}: {p.interactions}</p>)}<p className="font-medium">{fa?"گروه‌ها و گفتگوها":"Chats and groups"}</p>{detail.data.data.chats.map((c:any)=><p key={c.id}>{c.title||c.kind} · {c.messages}</p>)}</div>:userId?<p className="text-sm text-muted">{fa?"در حال دریافت…":"Loading…"}</p>:null}
    </section>
    <section className="space-y-3 rounded-xl bg-panel p-4">
      <h2 className="font-semibold">{fa?"ارسال پیام خصوصی همگانی":"Bulk direct message"}</h2>
      <p className="text-xs text-muted">{fa?"هر گیرنده پیام را به شکل یک پیام خصوصی عادی از حساب مدیر دریافت می‌کند. حداکثر ۱۰۰ گیرنده در هر اجرا؛ کاربران مسدود/تعلیق‌شده مستثنا هستند.":"Each recipient gets a normal private chat message from the admin. Maximum 100 recipients per run; suspended users are excluded."}</p>
      <select value={target} onChange={e=>{setTarget(e.target.value);setConfirmed(false)}} className="h-11 w-full rounded-lg bg-header px-3"><option value="all">{fa?"همه کاربران":"All users"}</option><option value="active">{fa?"فعال در ۳۰ روز اخیر":"Active in last 30 days"}</option><option value="inactive">{fa?"غیرفعال":"Inactive"}</option><option value="selected">{fa?"کاربر انتخاب‌شده":"Selected user"}</option></select>
      {target==="selected"?<select value={userId} onChange={e=>setUserId(e.target.value)} className="h-11 w-full rounded-lg bg-header px-3"><option value="">{fa?"انتخاب کاربر":"Choose user"}</option>{(users.data??[]).map((u:any)=><option key={u.userId} value={u.userId}>{u.displayName||u.email}</option>)}</select>:null}
      <textarea value={body} maxLength={4000} onChange={e=>{setBody(e.target.value);setConfirmed(false)}} placeholder={fa?"متن پیام خصوصی…":"Private message…"} className="min-h-28 w-full rounded-lg bg-header p-3"/>
      <div className="rounded-lg border border-line p-3 text-sm"><strong>{fa?"پیش‌نمایش پیام":"Message preview"}</strong><p className="mt-2 whitespace-pre-wrap">{body||"—"}</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{fa?"ارسال این پیام خصوصی را تأیید می‌کنم.":"I confirm sending this direct message."}</label>
      <button disabled={!confirmed||!body.trim()||(target==="selected"&&!userId)} onClick={()=>void send()} className="h-11 rounded-full bg-green px-5 text-on disabled:opacity-40">{fa?"ارسال حداکثر به ۱۰۰ نفر":"Send to up to 100 users"}</button>
      <div className="space-y-2"><strong className="text-sm">{fa?"سوابق ارسال":"Send history"}</strong>{(jobs.data??[]).map((j:any)=><p key={j.id} className="rounded-lg bg-header p-2 text-xs">{j.target} · {j.sent}/{j.targetCount} · {fa?"ناموفق":"Failed"} {j.failed} · {j.createdAt}</p>)}</div>
    </section>
  </div>;
}
