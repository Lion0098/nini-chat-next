import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error } = Route.useSearch();
  const navigate = useNavigate();
  const { locale } = usePrefs();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const fa = locale === "fa";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || error) { toast.error(fa ? "لینک بازیابی نامعتبر یا منقضی شده است." : "This password-reset link is invalid or expired."); return; }
    if (password.length < 8 || password.length > 128) { toast.error(fa ? "رمز باید بین ۸ تا ۱۲۸ نویسه باشد." : "Password must be 8–128 characters."); return; }
    if (password !== confirm) { toast.error(fa ? "تکرار رمز مطابقت ندارد." : "Passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) { toast.error(result.error.message || (fa ? "بازیابی رمز انجام نشد." : "Password reset failed.")); return; }
      toast.success(fa ? "رمز با موفقیت تغییر کرد؛ دوباره وارد شو." : "Password updated. Please sign in again.");
      await navigate({ to: "/login", replace: true });
    } catch { toast.error(fa ? "بازیابی رمز انجام نشد." : "Password reset failed."); }
    finally { setBusy(false); }
  }

  return <main dir={fa ? "rtl" : "ltr"} className="grid min-h-dvh place-items-center bg-shell p-4 text-ink">
    <form onSubmit={(event) => void submit(event)} className="w-full max-w-md space-y-4 rounded-2xl bg-panel p-6 shadow-lg">
      <h1 className="text-xl font-semibold">{fa ? "بازیابی رمز عبور" : "Reset password"}</h1>
      <p className="text-sm text-muted">{fa ? "یک رمز جدید انتخاب کن. پس از تغییر رمز، نشست‌های قبلی بسته می‌شوند." : "Choose a new password. Existing sessions will be revoked after the reset."}</p>
      {!token || error ? <p role="alert" className="rounded-lg bg-header p-3 text-sm text-danger">{fa ? "لینک بازیابی نامعتبر یا منقضی شده است. از مدیر بخواه لینک تازه‌ای ارسال کند." : "The reset link is invalid or expired. Ask an administrator to send a new one."}</p> : <>
        <label className="block space-y-1 text-sm"><span>{fa ? "رمز جدید" : "New password"}</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg bg-header px-3" /></label>
        <label className="block space-y-1 text-sm"><span>{fa ? "تکرار رمز جدید" : "Confirm new password"}</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="h-11 w-full rounded-lg bg-header px-3" /></label>
        <button disabled={busy} className="h-11 w-full rounded-full bg-green text-on disabled:opacity-60">{busy ? (fa ? "در حال ذخیره…" : "Saving…") : (fa ? "تغییر رمز" : "Update password")}</button>
      </>}
    </form>
  </main>;
}
