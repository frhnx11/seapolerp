import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function CAndFLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("C_AND_F");
  return (
    <AppShell
      role="C_AND_F"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
