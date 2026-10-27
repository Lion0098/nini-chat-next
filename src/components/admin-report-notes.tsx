import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePrefs } from "@/lib/prefs";
import { formatChatTime } from "@/lib/format";
import { addModerationReportNote, listModerationReportNotes } from "@/server/api";

export function AdminReportNotes({ reportId }: { reportId: string }) {
  const { locale, t } = usePrefs();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const notes = useQuery({
    queryKey: ["admin-report-notes", reportId],
    queryFn: () => listModerationReportNotes({ data: { reportId } }),
  });
  const fa = locale === "fa";
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <p className="font-medium">{fa ? "یادداشت‌های داخلی مدیریت" : "Internal moderation notes"}</p>
      {(notes.data ?? []).map((note) => (
        <div key={note.id} className="rounded-lg bg-header p-2">
          <p className="whitespace-pre-wrap">{note.note}</p>
          <p className="mt-1 text-xs text-muted">{formatChatTime(note.createdAt, locale, t)} · {note.authorId}</p>
        </div>
      ))}
      {notes.isLoading ? <p className="text-xs text-muted">{fa ? "در حال بارگذاری…" : "Loading…"}</p> : null}
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} className="min-h-16 w-full rounded-lg bg-header p-2" placeholder={fa ? "یادداشت داخلی؛ برای کاربر نمایش داده نمی‌شود" : "Internal note; not visible to the reported user"} />
      <button type="button" disabled={!draft.trim() || notes.isFetching} className="rounded-lg bg-green px-3 py-2 text-sm text-on disabled:opacity-50" onClick={() => {
        void addModerationReportNote({ data: { reportId, note: draft.trim() } }).then((res) => {
          if (!res.ok) { toast.error(fa ? "ثبت یادداشت انجام نشد" : "Could not save note"); return; }
          setDraft("");
          toast.success(fa ? "یادداشت ثبت شد" : "Note saved");
          void qc.invalidateQueries({ queryKey: ["admin-report-notes", reportId] });
        }).catch(() => toast.error(fa ? "خطا در ثبت یادداشت" : "Failed to save note"));
      }}>{fa ? "ثبت یادداشت" : "Add note"}</button>
    </div>
  );
}
