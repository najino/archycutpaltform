import type { User } from "@eth/db";
import { EditorNav } from "./editor-nav";
import { RealtimeRefetch } from "./realtime-refetch";

export function EditorShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="editor-shell">
      <RealtimeRefetch />
      <EditorNav user={user} />
      <div className="editor-content">{children}</div>
    </div>
  );
}
