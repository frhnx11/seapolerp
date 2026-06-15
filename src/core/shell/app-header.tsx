import { NotificationBell } from "@/features/alerts/notification-bell";

import { LogoutButton } from "./logout-button";

export function AppHeader({
  portalLabel,
  role,
}: {
  portalLabel: string;
  role: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#0372b0] bg-[#0483ca] px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seapol ERP</h1>
          <p className="mt-0.5 text-sm text-white/80">{portalLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {role === "ADMIN" && <NotificationBell />}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
