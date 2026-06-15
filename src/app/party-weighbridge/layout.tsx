import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function PartyWeighbridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("PARTY_WB");
  return (
    <AppShell
      role="PARTY_WB"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
