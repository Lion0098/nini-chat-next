import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminGetStorageManagement,
  adminSaveStorageSettings,
  adminSaveFileTypePolicy,
  adminSaveUserStorageQuota,
  adminSetStoredFileStatus,
} from "@/server/api";
const CATEGORIES = ["images", "videos", "audio", "documents", "archives", "executables", "other"];
function formatBytes(v: number, locale: string) {
  if (!Number.isFinite(v)) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let n = v,
    i = 0;
  while (n >= 1024 && i < 4) {
    n /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 1 }).format(n)} ${u[i]}`;
}
function mb(v: number | null) {
  return v == null ? "" : String(Math.round((v / 1048576) * 100) / 100);
}
function parseMb(v: string) {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("bad_mb");
  return Math.round(n * 1048576);
}
export function AdminStorageManagement({
  locale,
  canWrite,
}: {
  locale: string;
  canWrite: boolean;
}) {
  const fa = locale === "fa",
    qc = useQueryClient(),
    q = useQuery({
      queryKey: ["admin-storage-management"],
      queryFn: () => adminGetStorageManagement(),
      staleTime: 15_000,
    });
  const [fileFilter, setFileFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [extension, setExtension] = useState(""),
    [category, setCategory] = useState("documents"),
    [maxMb, setMaxMb] = useState("20"),
    [policyEnabled, setPolicyEnabled] = useState(true);
  const [userId, setUserId] = useState(""),
    [daily, setDaily] = useState(""),
    [weekly, setWeekly] = useState(""),
    [monthly, setMonthly] = useState(""),
    [maxFile, setMaxFile] = useState(""),
    [disabled, setDisabled] = useState(false),
    [note, setNote] = useState("");
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-storage-management"] });
  const saveSettings = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const r = await adminSaveStorageSettings({
        data: {
          enabled: f.get("enabled") === "on",
          quotaEnabled: f.get("quotaEnabled") === "on",
          defaultMaxBytes: parseMb(String(f.get("defaultMaxMb"))) ?? 0,
          hourlyQuotaBytes: parseMb(String(f.get("hourlyMb"))) ?? 0,
          dailyQuotaBytes: parseMb(String(f.get("dailyMb"))) ?? 0,
          weeklyQuotaBytes: parseMb(String(f.get("weeklyMb"))) ?? 0,
          monthlyQuotaBytes: parseMb(String(f.get("monthlyMb"))) ?? 0,
        },
      });
      if (!r.ok) throw new Error(r.error);
      toast.success(fa ? "تنظیمات ذخیره شد" : "Storage settings saved");
      refresh();
    } catch {
      toast.error(fa ? "ذخیره تنظیمات ناموفق بود" : "Could not save storage settings");
    }
  };
  const savePolicy = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const r = await adminSaveFileTypePolicy({
        data: {
          extension: extension.replace(/^\./, ""),
          category,
          enabled: policyEnabled,
          maxBytes: parseMb(maxMb) ?? 0,
        },
      });
      if (!r.ok) throw new Error(r.error);
      toast.success(fa ? "سیاست پسوند ذخیره شد" : "File policy saved");
      setExtension("");
      refresh();
    } catch {
      toast.error(fa ? "اطلاعات سیاست فایل معتبر نیست" : "Invalid file policy");
    }
  };
  const saveQuota = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const r = await adminSaveUserStorageQuota({
        data: {
          userId,
          dailyBytes: parseMb(daily),
          weeklyBytes: parseMb(weekly),
          monthlyBytes: parseMb(monthly),
          maxFileBytes: parseMb(maxFile),
          disabled,
          note,
        },
      });
      if (!r.ok) throw new Error(r.error);
      toast.success(fa ? "سهمیه کاربر ذخیره شد" : "User quota saved");
      setUserId("");
      refresh();
    } catch {
      toast.error(fa ? "شناسه یا مقادیر سهمیه معتبر نیست" : "Invalid user ID or quota values");
    }
  };
  const changeStatus = async (id: string, status: "active" | "quarantined" | "deleted") => {
    if (
      status === "deleted" &&
      !window.confirm(
        fa
          ? "فایل از دیسک حذف شود؟ این کار قابل بازگشت نیست."
          : "Permanently delete this file from disk? This cannot be undone.",
      )
    )
      return;
    try {
      const r = await adminSetStoredFileStatus({ data: { id, status } });
      if (!r.ok) throw new Error(r.error);
      toast.success(fa ? "وضعیت فایل تغییر کرد" : "File status updated");
      refresh();
    } catch {
      toast.error(fa ? "تغییر وضعیت فایل ناموفق بود" : "Could not update file status");
    }
  };
  if (q.isLoading)
    return (
      <p className="rounded-xl bg-panel p-4 text-sm text-muted">
        {fa ? "در حال دریافت اطلاعات فضای ذخیره‌سازی…" : "Loading storage inventory…"}
      </p>
    );
  if (q.isError || !q.data)
    return (
      <div role="alert" className="rounded-xl bg-panel p-4 text-sm">
        {fa
          ? "اطلاعات ذخیره‌سازی در دسترس نیست؛ Migrationهای ۰۰۱۰ و ۰۰۱۱ باید روی محیط اجرا اعمال شده باشند."
          : "Storage inventory is unavailable; migrations 0010 and 0011 must be applied in the target environment."}
        <button type="button" className="ms-3 underline" onClick={() => void q.refetch()}>
          {fa ? "تلاش مجدد" : "Retry"}
        </button>
      </div>
    );
  const d = q.data,
    files = d.files.filter(
      (x) =>
        (fileFilter === "all" || x.status === fileFilter) &&
        (!search.trim() ||
          `${x.name} ${x.ownerId} ${x.extension}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())),
    );
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">
          {fa ? "مدیریت ذخیره‌سازی فایل‌ها" : "File storage management"}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {fa
            ? "فقط metadata نمایش داده می‌شود؛ مسیر فیزیکی، کلید و هش فایل افشا نمی‌شود."
            : "Only file metadata is exposed; physical paths, storage keys and hashes are never shown."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [fa ? "تعداد فایل‌ها" : "Files", String(d.summary.fileCount)],
          [fa ? "حجم غیرحذف‌شده" : "Stored bytes", formatBytes(d.summary.totalBytes, locale)],
          [
            fa ? "فعال / قرنطینه" : "Active / quarantined",
            `${d.summary.activeCount} / ${d.summary.quarantinedCount}`,
          ],
          [
            fa ? "مصرف ۳۰ روزه" : "30-day upload volume",
            formatBytes(d.uploadUsage.monthlyBytes, locale),
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-panel p-4">
            <p className="text-xs text-muted">{label}</p>
            <strong className="text-xl">{value}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [fa ? "مصرف ساعتی" : "Hourly usage", d.uploadUsage.hourlyBytes],
          [fa ? "مصرف روزانه" : "Daily usage", d.uploadUsage.dailyBytes],
          [fa ? "مصرف هفتگی" : "Weekly usage", d.uploadUsage.weeklyBytes],
          [fa ? "مصرف ماهانه" : "Monthly usage", d.uploadUsage.monthlyBytes],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-line bg-panel p-3">
            <p className="text-xs text-muted">{label}</p>
            <strong>{formatBytes(Number(value), locale)}</strong>
          </div>
        ))}
      </div>
      <form onSubmit={saveSettings} className="space-y-3 rounded-xl bg-panel p-4">
        <h3 className="font-semibold">
          {fa ? "سیاست پیش‌فرض آپلود هر کاربر" : "Per-user default upload policy"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={d.settings.enabled}
              disabled={!canWrite}
            />
            {fa ? "فعال‌سازی ذخیره‌سازی روی دیسک" : "Enable disk-backed storage"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="quotaEnabled"
              type="checkbox"
              defaultChecked={d.settings.quotaEnabled}
              disabled={!canWrite}
            />
            {fa ? "اعمال سهمیه آپلود" : "Enforce upload quotas"}
          </label>
          {[
            [
              "defaultMaxMb",
              fa ? "حداکثر حجم هر فایل (MB)" : "Default max file size (MB)",
              mb(d.settings.defaultMaxBytes),
            ],
            [
              "hourlyMb",
              fa ? "سهمیه ساعتی (MB)" : "Hourly quota (MB)",
              mb(d.settings.hourlyQuotaBytes),
            ],
            [
              "dailyMb",
              fa ? "سهمیه روزانه (MB)" : "Daily quota (MB)",
              mb(d.settings.dailyQuotaBytes),
            ],
            [
              "weeklyMb",
              fa ? "سهمیه هفتگی (MB)" : "Weekly quota (MB)",
              mb(d.settings.weeklyQuotaBytes),
            ],
            [
              "monthlyMb",
              fa ? "سهمیه ماهانه (MB)" : "Monthly quota (MB)",
              mb(d.settings.monthlyQuotaBytes),
            ],
          ].map(([name, label, value]) => (
            <label key={name} className="grid gap-1 text-xs text-muted">
              {label}
              <input
                name={name}
                type="number"
                min="0"
                step="0.1"
                defaultValue={value}
                disabled={!canWrite}
                className="h-10 rounded-lg bg-header px-3 text-sm text-ink"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">
          {fa
            ? "مقدار صفر برای سهمیه یعنی بدون محدودیت؛ سهمیه ساعتی نیز اعمال می‌شود."
            : "A zero quota means unlimited; hourly quotas are enforced too."}
        </p>
        <button
          disabled={!canWrite}
          className="rounded-full bg-green px-4 py-2 text-sm text-on disabled:opacity-40"
        >
          {fa ? "ذخیره سیاست آپلود" : "Save upload policy"}
        </button>
      </form>
      <section className="space-y-3 rounded-xl bg-panel p-4">
        <h3 className="font-semibold">{fa ? "سیاست پسوند فایل‌ها" : "File extension policies"}</h3>
        {canWrite ? (
          <form onSubmit={savePolicy} className="grid gap-2 sm:grid-cols-5">
            <input
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder={fa ? "پسوند مثل pdf" : "Extension e.g. pdf"}
              required
              maxLength={16}
              className="h-10 rounded-lg bg-header px-3 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg bg-header px-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={maxMb}
              onChange={(e) => setMaxMb(e.target.value)}
              type="number"
              min="0.1"
              step="0.1"
              required
              placeholder="Max MB"
              className="h-10 rounded-lg bg-header px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={policyEnabled}
                onChange={(e) => setPolicyEnabled(e.target.checked)}
              />
              {fa ? "مجاز" : "Enabled"}
            </label>
            <button className="rounded-full bg-green px-3 py-2 text-sm text-on">
              {fa ? "ثبت پسوند" : "Save policy"}
            </button>
          </form>
        ) : null}
        <div className="max-h-72 space-y-2 overflow-auto">
          {d.policies.map((p) => (
            <div
              key={p.extension}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
            >
              <div>
                <strong dir="ltr">.{p.extension}</strong>
                <span className="ms-2 text-xs text-muted">
                  {p.category} · {formatBytes(p.maxBytes, locale)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>{p.enabled ? (fa ? "مجاز" : "Enabled") : fa ? "مسدود" : "Disabled"}</span>
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() =>
                    void adminSaveFileTypePolicy({
                      data: {
                        extension: p.extension,
                        category: p.category,
                        enabled: !p.enabled,
                        maxBytes: p.maxBytes,
                      },
                    })
                      .then((r) => {
                        if (!r.ok) throw new Error(r.error);
                        toast.success(fa ? "سیاست به‌روزرسانی شد" : "Policy updated");
                        refresh();
                      })
                      .catch(() =>
                        toast.error(fa ? "تغییر سیاست ناموفق بود" : "Policy update failed"),
                      )
                  }
                  className="rounded-full bg-header px-3 py-1 text-xs disabled:opacity-40"
                >
                  {p.enabled ? (fa ? "غیرفعال" : "Disable") : fa ? "فعال" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <form onSubmit={saveQuota} className="space-y-3 rounded-xl bg-panel p-4">
        <h3 className="font-semibold">{fa ? "سهمیه اختصاصی کاربر" : "Per-user quota override"}</h3>
        <p className="text-xs text-muted">
          {fa
            ? "شناسه ثابت کاربر را وارد کنید؛ مقدار خالی یعنی استفاده از سهمیه عمومی."
            : "Enter the immutable user ID. Blank limits inherit global defaults."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            placeholder="User ID"
            className="h-10 rounded-lg bg-header px-3 text-sm"
          />
          {[
            [daily, setDaily, fa ? "روزانه MB" : "Daily MB"],
            [weekly, setWeekly, fa ? "هفتگی MB" : "Weekly MB"],
            [monthly, setMonthly, fa ? "ماهانه MB" : "Monthly MB"],
            [maxFile, setMaxFile, fa ? "حداکثر هر فایل MB" : "Max file MB"],
          ].map(([v, set, label]) => (
            <input
              key={String(label)}
              value={v as string}
              onChange={(e) => (set as (x: string) => void)(e.target.value)}
              type="number"
              min="0"
              step="0.1"
              placeholder={label as string}
              className="h-10 rounded-lg bg-header px-3 text-sm"
            />
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder={fa ? "یادداشت داخلی (اختیاری)" : "Internal note (optional)"}
          className="h-10 w-full rounded-lg bg-header px-3 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
          />
          {fa ? "مسدود کردن آپلود کاربر" : "Disable uploads for this user"}
        </label>
        <button
          disabled={!canWrite}
          className="rounded-full bg-green px-4 py-2 text-sm text-on disabled:opacity-40"
        >
          {fa ? "ذخیره سهمیه" : "Save quota"}
        </button>
      </form>
      <section className="space-y-2 rounded-xl bg-panel p-4">
        <h3 className="font-semibold">{fa ? "مصرف به تفکیک دسته" : "Usage by category"}</h3>
        {d.categories.map((item) => (
          <div
            key={item.category}
            className="flex justify-between gap-3 border-b border-line py-1 text-sm"
          >
            <span>
              {item.category} · {item.count}
            </span>
            <span>{formatBytes(item.bytes, locale)}</span>
          </div>
        ))}
        <h3 className="pt-2 font-semibold">{fa ? "وضعیت فایل‌ها" : "File status totals"}</h3>
        {d.statuses.map((item) => (
          <div key={item.status} className="flex justify-between gap-3 text-sm">
            <span>
              {item.status} · {item.count}
            </span>
            <span>{formatBytes(item.bytes, locale)}</span>
          </div>
        ))}
      </section>
      <section className="space-y-3 rounded-xl bg-panel p-4">
        <h3 className="font-semibold">
          {fa ? "سهمیه‌های اختصاصی ثبت‌شده" : "Saved user quota overrides"}
        </h3>
        {d.overrides.length === 0 ? (
          <p className="text-sm text-muted">
            {fa ? "سهمیه اختصاصی ثبت نشده است." : "No user overrides."}
          </p>
        ) : (
          d.overrides.map((item) => (
            <div
              key={item.userId}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.displayName || item.username || item.userId}</p>
                <p className="break-all text-xs text-muted">
                  {item.userId} ·{" "}
                  {item.disabled
                    ? fa
                      ? "آپلود مسدود"
                      : "Uploads disabled"
                    : fa
                      ? "فعال"
                      : "Enabled"}{" "}
                  · {fa ? "روزانه" : "Daily"}{" "}
                  {item.dailyBytes == null ? "—" : formatBytes(item.dailyBytes, locale)}
                </p>
              </div>
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => {
                  setUserId(item.userId);
                  setDaily(mb(item.dailyBytes));
                  setWeekly(mb(item.weeklyBytes));
                  setMonthly(mb(item.monthlyBytes));
                  setMaxFile(mb(item.maxFileBytes));
                  setDisabled(item.disabled);
                  setNote(item.note ?? "");
                }}
                className="rounded-full bg-header px-3 py-1 text-xs disabled:opacity-40"
              >
                {fa ? "ویرایش" : "Edit"}
              </button>
            </div>
          ))
        )}
      </section>
      <section className="space-y-3 rounded-xl bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{fa ? "فهرست فایل‌های اخیر" : "Recent stored files"}</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={fa ? "جست‌وجوی نام یا شناسه کاربر" : "Search name or owner ID"}
            className="h-9 rounded-lg bg-header px-3 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "active", "quarantined", "deleted"].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setFileFilter(x)}
              className={`rounded-full px-3 py-1 text-xs ${fileFilter === x ? "bg-green text-on" : "bg-header"}`}
            >
              {x === "all" ? (fa ? "همه" : "All") : x}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {files.length === 0 ? (
            <p className="text-sm text-muted">{fa ? "فایلی پیدا نشد." : "No files found."}</p>
          ) : (
            files.map((f) => (
              <article
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium">{f.name}</p>
                  <p className="break-all text-xs text-muted">
                    {f.category} · {formatBytes(f.sizeBytes, locale)} · {f.status} · {f.ownerId}
                  </p>
                  <p className="text-xs text-muted">
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleString(fa ? "fa-IR" : "en-US")
                      : "—"}
                  </p>
                </div>
                {canWrite && f.status !== "deleted" ? (
                  <div className="flex gap-2">
                    {f.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => void changeStatus(f.id, "quarantined")}
                        className="rounded-full bg-header px-3 py-1 text-xs"
                      >
                        {fa ? "قرنطینه" : "Quarantine"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void changeStatus(f.id, "active")}
                        className="rounded-full bg-header px-3 py-1 text-xs"
                      >
                        {fa ? "بازیابی" : "Restore"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void changeStatus(f.id, "deleted")}
                      className="rounded-full bg-header px-3 py-1 text-xs text-danger"
                    >
                      {fa ? "حذف" : "Delete"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
      <div className="rounded-xl border border-line bg-panel p-4 text-sm">
        <strong>{fa ? "وضعیت بکاپ" : "Backup status"}</strong>
        <p className="mt-1 text-muted">
          {fa
            ? "بکاپ خودکار هنوز به Scheduler متصل نیست. اسکریپت backup-storage.sh باید دستی یا از طریق زمان‌بند امن سرور اجرا شود؛ وضعیت موفقیت بکاپ در این پنل ادعا نمی‌شود."
            : "Automated backups are not connected to a scheduler yet. Run backup-storage.sh manually or through a secure server scheduler; this panel does not claim backup success."}
        </p>
      </div>
    </section>
  );
}
