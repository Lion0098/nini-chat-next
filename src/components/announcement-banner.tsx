import { useQuery } from "@tanstack/react-query";
import { listActiveAnnouncements } from "@/server/api";
import { usePrefs } from "@/lib/prefs";

export function AnnouncementBanner() {
  const { locale } = usePrefs();
  const announcements = useQuery({
    queryKey: ["active-system-announcements"],
    queryFn: () => listActiveAnnouncements(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  if (!announcements.data?.length) return null;
  return (
    <aside aria-label={locale === "fa" ? "اطلاعیه‌های سامانه" : "System announcements"} className="mx-auto w-full max-w-5xl space-y-2 px-3 pt-3">
      {announcements.data.map((item) => (
        <article key={item.id} className="rounded-xl border border-green/20 bg-panel p-3 text-sm">
          <h2 className="font-semibold">{item.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-muted">{item.body}</p>
        </article>
      ))}
    </aside>
  );
}
