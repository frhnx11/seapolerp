import { requireRole } from "@/core/auth/guards";
import { AppShell } from "@/core/shell/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("ADMIN");
  return (
    <AppShell
      role="ADMIN"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
