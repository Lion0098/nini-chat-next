import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { adminGetSmsSettings, adminSaveSmsSettings } from "@/server/sms-settings";

export const Route = createFileRoute("/sms-settings")({ component: SmsSettingsPage });
type Settings = { provider: string; enabled: boolean; apiKeyConfigured: boolean; templateId: string; parameterName: string; productionApproved: boolean };
function SmsSettingsPage() {
  const { user, isPending } = useCurrentUserState();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void adminGetSmsSettings().then(setSettings).catch(() => setError("دریافت تنظیمات ممکن نشد؛ دسترسی مدیر و مهاجرت فاز ۷ را بررسی کنید.")); }, []);
  if (isPending) return <main className="grid min-h-dvh place-items-center">در حال بارگذاری…</main>;
  if (!user) return <RedirectToSignIn />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!settings) return; setBusy(true); setError("");
    try {
      const result = await adminSaveSmsSettings({ data: { provider: settings.provider, enabled: settings.enabled, apiKey, templateId: settings.templateId, parameterName: settings.parameterName, productionApproved: settings.productionApproved } });
      if (!result.ok) throw new Error("تنظیمات ذخیره نشد.");
      setApiKey(""); setSettings({ ...settings, apiKeyConfigured: settings.apiKeyConfigured || Boolean(apiKey) });
      toast.success("تنظیمات ارسال پیامک ذخیره شد.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در ذخیره تنظیمات"); } finally { setBusy(false); }
  };
  return <main dir="rtl" className="min-h-dvh bg-shell px-4 py-6 text-ink"><section className="mx-auto max-w-xl rounded-2xl bg-panel p-5 shadow-sm">
    <div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">تنظیمات سرویس پیامک</h1><p className="mt-1 text-sm text-muted">کلید API رمزگذاری‌شده ذخیره می‌شود و هرگز به مرورگر بازگردانده نمی‌شود.</p></div><Link to="/admin" className="rounded-full bg-header px-3 py-2 text-sm">بازگشت به مدیریت</Link></div>
    {!settings ? <p>در حال دریافت تنظیمات…</p> : <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm">سرویس‌دهنده<select value={settings.provider} onChange={e=>setSettings({...settings,provider:e.target.value})} className="mt-1 h-11 w-full rounded-lg bg-header px-3"><option value="sms_ir">SMS.ir</option></select></label>
      <label className="flex items-center justify-between gap-3 text-sm"><span>فعال بودن ارسال پیامک</span><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})} className="size-5" /></label>
      <label className="block text-sm">کلید API {settings.apiKeyConfigured ? <span className="text-green-2">(تنظیم شده؛ برای حفظ مقدار فعلی خالی بگذارید)</span> : ""}<input type="password" autoComplete="new-password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="کلید API از پنل SMS.ir" className="mt-1 h-11 w-full rounded-lg bg-header px-3" /></label>
      <label className="block text-sm">شناسه قالب Verify<input required inputMode="numeric" pattern="[0-9]+" value={settings.templateId} onChange={e=>setSettings({...settings,templateId:e.target.value})} className="mt-1 h-11 w-full rounded-lg bg-header px-3" /></label>
      <label className="block text-sm">نام پارامتر کد در قالب<input required value={settings.parameterName} onChange={e=>setSettings({...settings,parameterName:e.target.value})} placeholder="Code" className="mt-1 h-11 w-full rounded-lg bg-header px-3" /></label>
      <label className="flex items-center justify-between gap-3 text-sm"><span>تأیید فعال‌سازی محیط عملیاتی SMS.ir</span><input type="checkbox" checked={settings.productionApproved} onChange={e=>setSettings({...settings,productionApproved:e.target.checked})} className="size-5" /></label>
      <p className="text-xs text-muted">حالت محیط از SMS_IR_MODE خوانده می‌شود. برای ارسال واقعی، حساب و قالب Verify باید در SMS.ir فعال باشند.</p>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}<button disabled={busy} className="h-11 rounded-full bg-green px-5 text-on disabled:opacity-50">{busy ? "در حال ذخیره…" : "ذخیره تنظیمات"}</button>
    </form>}
  </section></main>;
}