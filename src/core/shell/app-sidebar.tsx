"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  Ship,
  Truck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavItemConfig, NavKey } from "./portal-config";

const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  accounts: Users,
  settings: Settings,
  profile: UserCircle,
  masterData: Database,
  workOrders: ClipboardList,
  truckOrders: Truck,
  invoices: FileText,
  alerts: AlertTriangle,
  vessels: Ship,
};

function initialsOf(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "SA";
}

export function AppSidebar({
  user,
  navItems,
}: {
  user: { name: string; email: string };
  navItems: NavItemConfig[];
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  const isExpanded = isHovered || !collapsed;
  const initials = initialsOf(user.name);
  const username = user.email.split("@")[0];

  // Highlight the section the current route is inside — the longest nav href
  // that the path equals or sits under (so sub-pages keep the parent tab active,
  // while the home tab doesn't greedily match every route).
  const activeHref = navItems.reduce<string | null>((best, item) => {
    if (item.href === "#") return best;
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) return best;
    return best && best.length >= item.href.length ? best : item.href;
  }, null);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden bg-[#0483ca] shadow-lg transition-all duration-300 ${
        isExpanded ? "w-72" : "w-20"
      }`}
    >
      {/* Logo Section */}
      <div className="flex min-h-[95px] items-center justify-between overflow-hidden border-b border-[#0372b0] px-6 py-[22px]">
        {isExpanded && (
          <Image
            src="/seapollogo.png"
            alt="Seapol"
            width={140}
            height={105}
            priority
            className="h-12 w-auto rounded-lg object-contain"
          />
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="rounded-lg p-2 text-white transition-colors hover:bg-[#0372b0]"
        >
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav
        className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 ${
          !isExpanded ? "[&::-webkit-scrollbar]:w-0" : ""
        }`}
        style={
          isExpanded
            ? { scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }
            : { scrollbarWidth: "none" }
        }
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive = item.href === activeHref;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center rounded-xl py-3.5 transition-all duration-200 ${
                    isExpanded ? "space-x-3 px-4" : "justify-center px-0"
                  } ${
                    isActive
                      ? "bg-white text-[#0483ca] shadow-sm"
                      : "text-white hover:bg-[#0372b0]"
                  }`}
                >
                  <Icon
                    size={22}
                    className={`flex-shrink-0 ${
                      isActive ? "text-[#0483ca]" : "text-white"
                    }`}
                  />
                  {isExpanded && (
                    <span
                      className={`text-[15px] font-medium whitespace-nowrap ${
                        isActive ? "text-[#0483ca]" : ""
                      }`}
                    >
                      {item.name}
                    </span>
                  )}
                  {isActive && isExpanded && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0483ca]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info Section */}
      <div className="overflow-hidden border-t border-[#0372b0] p-4">
        {isExpanded ? (
          <div className="flex cursor-pointer items-center space-x-3 rounded-xl bg-[#0372b0] p-3 transition-colors hover:bg-[#026199]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#0483ca] shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-white/70">{username}</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#0483ca] shadow-sm">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
