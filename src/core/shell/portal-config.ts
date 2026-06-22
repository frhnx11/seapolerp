/**
 * Per-role shell configuration: portal label, sidebar nav, and home route.
 * Kept serializable (icons referenced by key, not component) so a Server
 * Component can pass it to the client `AppSidebar` across the boundary.
 */
export type NavKey =
  | "dashboard"
  | "accounts"
  | "settings"
  | "profile"
  | "masterData"
  | "workOrders"
  | "truckOrders"
  | "allottedTrucks"
  | "invoices"
  | "alerts"
  | "vessels";

export type NavItemConfig = { name: string; href: string; icon: NavKey };

/** The landing route for each role — where login and `/` send the user. */
export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  PORT_WB: "/port-weighbridge",
  PARTY_WB: "/party-weighbridge",
  ACCOUNTANT: "/accountant",
};

export function roleHome(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || "/login";
}

export const ROLE_PORTAL_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin Portal",
  ADMIN: "Admin Portal",
  PORT_WB: "Port Weighbridge Portal",
  PARTY_WB: "Party Weighbridge Portal",
  ACCOUNTANT: "Accountant Portal",
};

const SUPER_ADMIN_NAV: NavItemConfig[] = [
  { name: "Dashboard", href: "/super-admin", icon: "dashboard" },
  { name: "Accounts", href: "/super-admin/accounts", icon: "accounts" },
  { name: "Settings", href: "/super-admin/settings", icon: "settings" },
  { name: "Profile", href: "#", icon: "profile" },
];

// Fallback nav for unknown/missing roles (see `navForRole`).
function basicNav(home: string): NavItemConfig[] {
  return [
    { name: "Dashboard", href: home, icon: "dashboard" },
    { name: "Profile", href: "#", icon: "profile" },
  ];
}

const ADMIN_NAV: NavItemConfig[] = [
  { name: "Dashboard", href: "/admin", icon: "dashboard" },
  { name: "Vessels", href: "/admin/vessels", icon: "vessels" },
  {
    name: "Allotted Trucks",
    href: "/admin/allotted-trucks",
    icon: "allottedTrucks",
  },
  { name: "Truck Orders", href: "/admin/truck-orders", icon: "truckOrders" },
  { name: "Work Orders", href: "/admin/work-orders", icon: "workOrders" },
  { name: "Invoices", href: "/admin/invoices", icon: "invoices" },
  { name: "Alerts", href: "/admin/alerts", icon: "alerts" },
  { name: "Master Data", href: "/admin/master-data", icon: "masterData" },
  { name: "Profile", href: "/admin/profile", icon: "profile" },
];

const PORT_WB_NAV: NavItemConfig[] = [
  { name: "Dashboard", href: "/port-weighbridge", icon: "dashboard" },
  {
    name: "Allotted Trucks",
    href: "/port-weighbridge/allotted-trucks",
    icon: "allottedTrucks",
  },
  {
    name: "Truck Orders",
    href: "/port-weighbridge/truck-orders",
    icon: "truckOrders",
  },
  {
    name: "Work Orders",
    href: "/port-weighbridge/work-orders",
    icon: "workOrders",
  },
  { name: "Profile", href: "/port-weighbridge/profile", icon: "profile" },
];

const PARTY_WB_NAV: NavItemConfig[] = [
  { name: "Dashboard", href: "/party-weighbridge", icon: "dashboard" },
  {
    name: "Allotted Trucks",
    href: "/party-weighbridge/allotted-trucks",
    icon: "allottedTrucks",
  },
  {
    name: "Truck Orders",
    href: "/party-weighbridge/truck-orders",
    icon: "truckOrders",
  },
  {
    name: "Work Orders",
    href: "/party-weighbridge/work-orders",
    icon: "workOrders",
  },
  { name: "Profile", href: "/party-weighbridge/profile", icon: "profile" },
];

const ACCOUNTANT_NAV: NavItemConfig[] = [
  { name: "Dashboard", href: "/accountant", icon: "dashboard" },
  {
    name: "Allotted Trucks",
    href: "/accountant/allotted-trucks",
    icon: "allottedTrucks",
  },
  {
    name: "Truck Orders",
    href: "/accountant/truck-orders",
    icon: "truckOrders",
  },
  {
    name: "Work Orders",
    href: "/accountant/work-orders",
    icon: "workOrders",
  },
  { name: "Invoices", href: "/accountant/invoices", icon: "invoices" },
  { name: "Profile", href: "/accountant/profile", icon: "profile" },
];

const ROLE_NAV: Record<string, NavItemConfig[]> = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  ADMIN: ADMIN_NAV,
  PORT_WB: PORT_WB_NAV,
  PARTY_WB: PARTY_WB_NAV,
  ACCOUNTANT: ACCOUNTANT_NAV,
};

export function navForRole(role: string | null | undefined): NavItemConfig[] {
  return (role && ROLE_NAV[role]) || basicNav("/");
}

export function portalLabelForRole(role: string | null | undefined): string {
  return (role && ROLE_PORTAL_LABEL[role]) || "Portal";
}
