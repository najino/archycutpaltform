import type { User } from "@eth/db";
import { ClientNav } from "./client-nav";
import { RealtimeRefetch } from "./realtime-refetch";

export function ClientShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="editor-shell">
      <RealtimeRefetch />
      <ClientNav user={user} />
      <div className="editor-content">{children}</div>
    </div>
  );
}
