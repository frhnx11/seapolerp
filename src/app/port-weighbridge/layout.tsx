import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function PortWeighbridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("PORT_WB");
  return (
    <AppShell
      role="PORT_WB"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
