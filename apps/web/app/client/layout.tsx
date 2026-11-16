import { requireClientPortal } from "@/lib/authz";
import { ClientShell } from "@/components/client-shell";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClientPortal();
  return <ClientShell user={user}>{children}</ClientShell>;
}
