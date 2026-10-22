import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { usePrefs } from "@/lib/prefs";
import { getPublicConfig } from "@/server/api";
import { normalizeIranPhone } from "@/lib/phone";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const { t, locale, setLocale } = usePrefs();
  const cfg = useQuery({ queryKey: ["public-config"], queryFn: () => getPublicConfig() });
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <div className="grid h-dvh place-items-center bg-shell text-sm text-muted">{t("appName")}</div>;
  }
  if (user) return <Navigate to="/" />;
  if (!authEnabled) return <RedirectToSignIn to="/" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (method === "phone") {
        const normalizedPhone = normalizeIranPhone(phone);
        if (!normalizedPhone) {
          toast.error(locale === "fa" ? "شماره موبایل معتبر ایران وارد کن." : "Enter a valid Iranian mobile number.");
          return;
        }
        if (!/^[a-zA-Z0-9._]{3,24}$/.test(username.trim())) {
          toast.error(t("errUsernameBad"));
          return;
        }
        if (!otpSent) {
          const res = await authClient.phoneNumber.sendOtp({ phoneNumber: normalizedPhone });
          if (res.error) {
            toast.error(res.error.message || (locale === "fa" ? "ارسال کد ممکن نشد؛ تنظیمات پیامک را بررسی کن." : "Could not send the code. Check SMS configuration."));
            return;
          }
          setOtpSent(true);
          toast.success(locale === "fa" ? "اگر ارسال پیامک موفق باشد، کد برایت ارسال می‌شود." : "If SMS delivery succeeds, the code will arrive shortly.");
          return;
        }
        if (!/^\d{6}$/.test(otp.trim())) {
          toast.error(locale === "fa" ? "کد ۶ رقمی را وارد کن." : "Enter the 6-digit code.");
          return;
        }
        const phoneVerifyBody = {
          phoneNumber: normalizedPhone,
          code: otp.trim(),
          username: username.trim().toLowerCase(),
        };
        const res = await authClient.phoneNumber.verify(phoneVerifyBody as never);
        if (res.error) {
          toast.error(res.error.message || t("authFailed"));
          return;
        }
        await navigate({ to: "/" });
        return;
      }

      if (mode === "signup") {
        if (cfg.data && (!cfg.data.allowSignups || cfg.data.allowEmailSignup === false)) {
          toast.error(t("signupsClosed"));
          return;
        }
        if (password.length < 8) {
          toast.error(t("passwordShort"));
          return;
        }
        if (password !== confirm) {
          toast.error(t("passwordMismatch"));
          return;
        }
        if (!/^[a-zA-Z0-9._]{3,24}$/.test(username.trim())) {
          toast.error(t("errUsernameBad"));
          return;
        }
      }
      if (mode === "signup") {
        const emailSignupBody = {
          email: email.trim().toLowerCase(),
          password,
          name: name || username,
          username: username.trim().toLowerCase(),
        };
        const res = await authClient.signUp.email(emailSignupBody as never);
        if (res.error) {
          toast.error(res.error.message || t("authFailed"));
          return;
        }
        const { saveProfile } = await import("@/server/api");
        const profile = await saveProfile({ data: { username: username.trim().toLowerCase(), displayName: name || username, locale } });
        if (!profile.ok) {
          toast.error(t("authFailed"));
          return;
        }
      } else {
        const res = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
        if (res.error) {
          toast.error(res.error.message || t("authFailed"));
          return;
        }
      }
      await navigate({ to: "/" });
    } catch {
      toast.error(t("authFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-shell lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-green p-10 text-on lg:flex">
        <div className="text-2xl font-bold">{t("appName")}</div>
        <div>
          <div className="grid size-20 place-items-center rounded-full bg-on/15 text-4xl font-bold">ن</div>
          <h1 className="mt-6 text-4xl font-semibold">{t("appName")}</h1>
          <p className="mt-3 max-w-sm text-on/85">{t("tagline")}</p>
        </div>
        <p className="text-sm text-on/75">{t("storageNote")}</p>
      </section>
      <section className="grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-panel p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold lg:hidden">{t("appName")}</h2>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => setLocale("fa")} className={locale === "fa" ? "font-semibold text-green-2" : "text-muted"}>
                {t("langFa")}
              </button>
              <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "font-semibold text-green-2" : "text-muted"}>
                {t("langEn")}
              </button>
            </div>
          </div>
          {cfg.data?.maintenance ? (
            <p className="mb-3 rounded-lg bg-header px-3 py-2 text-sm">{cfg.data.maintenance}</p>
          ) : null}
          <div className="mb-3 grid grid-cols-2 rounded-full bg-header p-1 text-sm">
            <button type="button" onClick={() => { setMethod("email"); setOtpSent(false); setOtp(""); }} className={`h-10 rounded-full ${method === "email" ? "bg-panel font-medium shadow" : ""}`}>
              {locale === "fa" ? "ایمیل و رمز" : "Email & password"}
            </button>
            <button type="button" onClick={() => { setMethod("phone"); setOtpSent(false); setOtp(""); }} className={`h-10 rounded-full ${method === "phone" ? "bg-panel font-medium shadow" : ""}`}>
              {locale === "fa" ? "ورود با پیامک" : "Phone & SMS"}
            </button>
          </div>
          {method === "email" ? (
            <div className="mb-4 grid grid-cols-2 rounded-full bg-header p-1 text-sm">
              <button type="button" onClick={() => setMode("login")} className={`h-10 rounded-full ${mode === "login" ? "bg-panel font-medium shadow" : ""}`}>
                {t("login")}
              </button>
              <button type="button" onClick={() => setMode("signup")} className={`h-10 rounded-full ${mode === "signup" ? "bg-panel font-medium shadow" : ""}`}>
                {t("signup")}
              </button>
            </div>
          ) : <p className="mb-4 text-sm text-muted">{locale === "fa" ? "با کد یک‌بارمصرف وارد شو یا حساب جدید بساز؛ برای حساب جدید نام کاربری یکتا لازم است." : "Use a one-time code to sign in or create an account. New accounts need a unique username."}</p>}
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            {method === "phone" ? (
              <>
                <Lab label={t("username")} value={username} onChange={setUsername} autoComplete="username" />
                <Lab label={locale === "fa" ? "شماره موبایل ایران" : "Iranian mobile number"} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
                {otpSent ? <Lab label={locale === "fa" ? "کد پیامک‌شده" : "SMS code"} value={otp} onChange={setOtp} type="text" autoComplete="one-time-code" /> : null}
                <button disabled={busy} className="h-11 w-full rounded-full bg-green font-medium text-on disabled:opacity-60">
                  {busy ? (locale === "fa" ? "لطفاً صبر کن…" : "Please wait…") : otpSent ? (locale === "fa" ? "تأیید کد و ورود" : "Verify code & sign in") : (locale === "fa" ? "ارسال کد پیامکی" : "Send SMS code")}
                </button>
                {otpSent ? <button type="button" disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full py-1 text-sm text-muted">{locale === "fa" ? "تغییر شماره / ارسال دوباره" : "Change number / request another code"}</button> : null}
              </>
            ) : (
              <>
                {mode === "signup" ? (
                  <>
                    <Lab label={t("name")} value={name} onChange={setName} autoComplete="name" />
                    <Lab label={t("username")} value={username} onChange={setUsername} autoComplete="username" />
                  </>
                ) : null}
                <Lab label={t("email")} value={email} onChange={setEmail} type="email" autoComplete="email" />
                <Lab label={t("password")} value={password} onChange={setPassword} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                {mode === "signup" ? (
                  <Lab label={t("confirmPassword")} value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
                ) : null}
                <button disabled={busy} className="h-11 w-full rounded-full bg-green font-medium text-on disabled:opacity-60">
                  {mode === "signup" ? t("signup") : t("login")}
                </button>
              </>
            )}
          </form>
          {method === "email" ? (
            <>
              <div className="my-4 text-center text-xs text-muted">{t("or")}</div>
              <div className="space-y-2">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                    className="h-11 w-full rounded-full bg-header text-sm font-medium"
                  >
                    {p.providerId === "grok-google" ? t("continueGoogle") : t("continueX")}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Lab({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1 h-11 w-full rounded-lg bg-header px-3 outline-none ring-1 ring-transparent focus:ring-green-2"
      />
    </label>
  );
}
