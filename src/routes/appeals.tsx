import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { createMyModerationAppeal, listMyModerationAppeals } from "@/server/user-appeals";

type Appeal = {
  id: number;
  reason: string;
  status: string;
  reviewerNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const statusLabels: Record<string, string> = {
  open: "در انتظار بررسی",
  reviewing: "در حال بررسی",
  accepted: "پذیرفته‌شده",
  rejected: "ردشده",
};

export const Route = createFileRoute("/appeals")({
  component: AppealsPage,
});

function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [reason, setReason] = useState("");
  const [restrictionId, setRestrictionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setAppeals(await listMyModerationAppeals());
    } catch {
      setMessage("برای مشاهده یا ثبت اعتراض، ابتدا وارد حساب کاربری‌ات شو.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSending(true);
    try {
      const result = await createMyModerationAppeal({
        data: { reason, restrictionId: restrictionId.trim() || null },
      });
      if (!result.ok) {
        setMessage(result.error === "appeal_already_open"
          ? "یک اعتراض باز داری؛ پس از دریافت نتیجه می‌توانی اعتراض تازه‌ای ثبت کنی."
          : "محدودیت انتخاب‌شده پیدا نشد یا به حساب تو تعلق ندارد.");
        return;
      }
      setReason("");
      setRestrictionId("");
      setMessage("اعتراضت با موفقیت ثبت شد.");
      await refresh();
    } catch {
      setMessage("ثبت اعتراض انجام نشد. وارد حساب کاربری شو و دوباره تلاش کن.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6" dir="rtl">
      <header className="mb-6">
        <a href="/" className="text-sm text-primary hover:underline">← بازگشت به چت‌نینی</a>
        <h1 className="mt-4 text-2xl font-bold">اعتراض به محدودیت حساب</h1>
        <p className="mt-2 text-sm text-muted-foreground">دلیل اعتراض را توضیح بده. پاسخ مدیریت در همین صفحه نمایش داده می‌شود.</p>
      </header>

      <form onSubmit={submit} className="mb-8 space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div>
          <label htmlFor="restrictionId" className="mb-2 block text-sm font-medium">شناسه محدودیت (اختیاری)</label>
          <input id="restrictionId" inputMode="numeric" value={restrictionId}
            onChange={(event) => setRestrictionId(event.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            placeholder="اگر شناسه‌ای در پیام مدیریت درج شده است" />
        </div>
        <div>
          <label htmlFor="reason" className="mb-2 block text-sm font-medium">شرح اعتراض</label>
          <textarea id="reason" required minLength={10} maxLength={2000} rows={5}
            value={reason} onChange={(event) => setReason(event.target.value)}
            className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm"
            placeholder="موضوع را با جزئیات کافی توضیح بده..." />
          <p className="mt-1 text-xs text-muted-foreground">{reason.length}/2000</p>
        </div>
        <button type="submit" disabled={sending || reason.trim().length < 10}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
          {sending ? "در حال ثبت..." : "ثبت اعتراض"}
        </button>
        {message && <p role="status" className="text-sm">{message}</p>}
      </form>

      <section>
        <h2 className="mb-3 text-lg font-semibold">اعتراض‌های قبلی</h2>
        {loading ? <p className="text-sm text-muted-foreground">در حال دریافت اطلاعات...</p> :
          appeals.length === 0 ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">هنوز اعتراضی ثبت نکرده‌ای.</p> :
          <div className="space-y-3">
            {appeals.map((appeal) => (
              <article key={appeal.id} className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">اعتراض #{appeal.id}</span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">{statusLabels[appeal.status] ?? appeal.status}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{appeal.reason}</p>
                <p className="mt-3 text-xs text-muted-foreground">ثبت: {new Date(appeal.createdAt).toLocaleString("fa-IR")}</p>
                {appeal.reviewerNote && <div className="mt-4 rounded-xl bg-muted p-3"><p className="mb-1 text-xs font-semibold">پاسخ مدیریت</p><p className="whitespace-pre-wrap text-sm">{appeal.reviewerNote}</p></div>}
              </article>
            ))}
          </div>
        }
      </section>
    </main>
  );
}
