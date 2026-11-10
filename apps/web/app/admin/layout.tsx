import { AdminNav } from "@/components/admin-nav";
import { RealtimeRefetch } from "@/components/realtime-refetch";
import { requireAdmin } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <div className="app-shell">
      <RealtimeRefetch />
      <AdminNav user={user} />
      {children}
    </div>
  );
}
