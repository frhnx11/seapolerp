import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("ACCOUNTANT");
  return (
    <AppShell
      role="ACCOUNTANT"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
