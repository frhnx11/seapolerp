import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("SUPER_ADMIN");
  return (
    <AppShell
      role="SUPER_ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
