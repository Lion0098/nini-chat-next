import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AdminScreen } from "@/components/admin-screen";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="grid h-dvh place-items-center bg-shell" />;
  if (!user) return <RedirectToSignIn />;
  return <><div className="fixed bottom-4 left-4 z-50"><Link to="/sms-settings" className="rounded-full bg-green px-4 py-3 text-sm text-on shadow-lg">تنظیمات سرویس پیامک</Link></div><AdminScreen /></>;
}