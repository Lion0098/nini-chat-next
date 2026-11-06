import { useQuery } from "@tanstack/react-query";
import { adminGetServerMonitoring } from "@/server/api";
function bytes(v: number | null | undefined, locale: string) {
  if (v == null || !Number.isFinite(v)) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let n = v,
    i = 0;
  while (n >= 1024 && i < 4) {
    n /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 1 }).format(n)} ${u[i]}`;
}
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
export function AdminServerMonitoring({ locale }: { locale: string }) {
  const fa = locale === "fa",
    q = useQuery({
      queryKey: ["admin-server-monitoring"],
      queryFn: () => adminGetServerMonitoring(),
      refetchInterval: 30_000,
      staleTime: 10_000,
    }),
    d = q.data,
    n = (v: number | null | undefined) =>
      v == null
        ? "—"
        : new Intl.NumberFormat(fa ? "fa-IR" : "en-US", { maximumFractionDigits: 1 }).format(v);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">
            {fa ? "وضعیت زنده Runtime و دیتابیس" : "Live runtime & database health"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {fa ? "بروزرسانی خودکار هر ۳۰ ثانیه" : "Auto-refresh every 30 seconds"} ·{" "}
            {d?.checkedAt ?? "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void q.refetch()}
          className="rounded-full bg-panel px-4 py-2 text-sm"
        >
          {fa ? "بروزرسانی" : "Refresh"}
        </button>
      </div>
      <div className="rounded-xl border border-line bg-panel p-3 text-sm">
        <strong>{fa ? "محدوده اندازه‌گیری" : "Measurement scope"}</strong>
        <p className="mt-1 text-muted">
          {fa
            ? "این اعداد متعلق به Runtime/کانتینر اجرای برنامه هستند؛ بدون Agent، وضعیت کل VPS یا میزبان جداگانه قابل تأیید نیست."
            : "These metrics describe the runtime/container hosting this app. Without a host agent, the full VPS or a separate host cannot be verified."}
        </p>
      </div>
      {q.isLoading ? (
        <p className="rounded-xl bg-panel p-4 text-sm text-muted">
          {fa ? "در حال دریافت متریک‌ها…" : "Loading metrics…"}
        </p>
      ) : null}
      {q.isError ? (
        <p role="alert" className="rounded-xl bg-panel p-4 text-sm">
          {fa ? "دریافت متریک‌ها ناموفق بود." : "Could not load metrics."}{" "}
          <button type="button" className="underline" onClick={() => void q.refetch()}>
            {fa ? "تلاش مجدد" : "Retry"}
          </button>
        </p>
      ) : null}
      {d ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label={fa ? "سیستم عامل Runtime" : "Runtime platform"}
            value={`${d.runtime.platform} / ${d.runtime.architecture}`}
            detail={`${d.runtime.nodeVersion} · ${n(d.runtime.cpuCount)} ${fa ? "هسته" : "CPUs"}`}
          />
          <Metric
            label={fa ? "Load Average (۱/۵/۱۵ دقیقه)" : "Load average (1/5/15 min)"}
            value={d.runtime.loadAverage.map(n).join(" / ")}
          />
          <Metric
            label={fa ? "Uptime سیستم‌عامل" : "Host OS uptime"}
            value={`${n(d.runtime.uptimeSeconds / 3600)} ${fa ? "ساعت" : "hours"}`}
            detail={`${fa ? "فرآیند برنامه" : "App process"}: ${n(d.runtime.processUptimeSeconds / 3600)} h`}
          />
          <Metric
            label={fa ? "RAM محیط اجرای برنامه" : "Runtime/container memory"}
            value={`${bytes(d.runtime.runtimeMemory.usedBytes, locale)} / ${bytes(d.runtime.runtimeMemory.totalBytes, locale)}`}
            detail={`${fa ? "آزاد" : "Free"}: ${bytes(d.runtime.runtimeMemory.freeBytes, locale)}`}
          />
          <Metric
            label={fa ? "حافظه فرآیند برنامه" : "App process memory"}
            value={bytes(d.runtime.processMemory.rssBytes, locale)}
            detail={`Heap ${bytes(d.runtime.processMemory.heapUsedBytes, locale)} / ${bytes(d.runtime.processMemory.heapTotalBytes, locale)}`}
          />
          <Metric
            label={fa ? "فضای فایل‌سیستم Storage" : "Storage filesystem"}
            value={
              d.storageFilesystem
                ? `${bytes(d.storageFilesystem.usedBytes, locale)} / ${bytes(d.storageFilesystem.totalBytes, locale)}`
                : fa
                  ? "در دسترس نیست"
                  : "Unavailable"
            }
            detail={
              d.storageFilesystem
                ? `${fa ? "آزاد" : "Free"}: ${bytes(d.storageFilesystem.freeBytes, locale)}`
                : fa
                  ? "مسیر ذخیره‌سازی mount نشده یا خواندنی نیست"
                  : "Storage path is not mounted or readable"
            }
          />
          <Metric
            label={fa ? "حجم دیتابیس" : "Database size"}
            value={bytes(d.database.sizeBytes, locale)}
          />
          <Metric
            label={fa ? "اتصالات دیتابیس" : "Database connections"}
            value={
              d.database.activeConnections == null
                ? "—"
                : `${n(d.database.activeConnections)} / ${n(d.database.maxConnections)}`
            }
            detail={
              !d.database.available || d.database.latencyMs == null
                ? fa
                  ? "Probe ناموفق"
                  : "Probe failed"
                : `${n(d.database.latencyMs)} ms`
            }
          />
        </div>
      ) : null}
    </section>
  );
}
