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
    <div className="admin-shell">
      <RealtimeRefetch />
      <AdminNav user={user} />
      <div className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: "var(--radius)",
                background: "var(--surface-container-low)",
              }}
            >
              <span
                className="material-symbols-outlined muted"
                style={{ fontSize: 18 }}
              >
                date_range
              </span>
              <span className="muted" style={{ fontSize: 11 }}>
                هفته جاری:
              </span>
              <span
                className="font-mono"
                style={{ color: "var(--primary)", fontWeight: 600, fontSize: 12 }}
              >
                {weekKey}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="sys-pill">
              <span className="sys-dot" />
              همگام‌سازی زنده
              <span className="font-mono" style={{ opacity: 0.7 }}>
                (SSE)
              </span>
            </span>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
