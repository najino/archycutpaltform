import { AdminNav } from "@/components/admin-nav";
import { RealtimeRefetch } from "@/components/realtime-refetch";
import { requireAdmin } from "@/lib/authz";
import { currentWeekKey } from "@eth/core";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const weekKey = currentWeekKey();

  return (
    <div className="admin-shell" suppressHydrationWarning>
      <RealtimeRefetch />
      <AdminNav user={user} />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="admin-week-pill" suppressHydrationWarning>
              <span className="material-symbols-outlined muted icon-18">
                date_range
              </span>
              <span className="muted text-11">هفته جاری:</span>
              <span className="font-mono admin-week-key">{weekKey}</span>
            </div>
          </div>
          <div className="admin-topbar-right">
            <span className="sys-pill">
              <span className="sys-dot" />
              همگام‌سازی زنده
              <span className="font-mono sse-tag">(SSE)</span>
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
