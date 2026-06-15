import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { navForRole, portalLabelForRole } from "./portal-config";

/**
 * The single shared app shell, reused by every role's layout: a fixed blue
 * sidebar (icon-only, expands on hover) + a sticky blue header, with the page
 * content in the white scrollable area. Configured per role via portal-config.
 */
export function AppShell({
  role,
  user,
  children,
}: {
  role: string;
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar user={user} navItems={navForRole(role)} />
      <div className="ml-20 flex flex-1 flex-col">
        <AppHeader portalLabel={portalLabelForRole(role)} role={role} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
