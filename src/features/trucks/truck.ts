import { z } from "zod";

export const WHEELS = [10, 12, 14] as const;
export const TRUCK_STATUSES = ["ACTIVE", "BLOCKED"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export type Truck = {
  id: string;
  vehicleNo: string;
  wheels: number;
  ownerId: string;
  /** Owner company name (from the truck-owner master), for display/search. */
  owner: string;
  rcValidity: string;
  insuranceValidity: string;
  fcValidity: string;
  status: string;
};

/** A truck-owner master row, as offered in the owner dropdown. */
export type TruckOwnerOption = { id: string; name: string };

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)");

export const truckSchema = z.object({
  vehicleNo: z.string().trim().min(1, "Vehicle No is required"),
  wheels: z.coerce
    .number()
    .refine(
      (n) => (WHEELS as readonly number[]).includes(n),
      "Type must be 10, 12 or 14 wheels",
    ),
  ownerId: z.string().trim().min(1, "Owner is required"),
  rcValidity: dateString,
  insuranceValidity: dateString,
  fcValidity: dateString,
  status: z.enum(TRUCK_STATUSES),
});

export type TruckInput = z.infer<typeof truckSchema>;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "YYYY-MM-DD" -> "DD Mon YYYY" (display only). */
export function formatDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return value;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function wheelsLabel(wheels: number): string {
  return `${wheels} wheels`;
}

export function statusLabel(status: string): string {
  return status === "BLOCKED" ? "Blocked" : "Active";
}

// ---- Derived status (Active / Expired / Blocked) ----
//
// "Expired" is not stored — it is computed from the validity dates vs today, so
// it tracks the passage of time (a date expires with no edit, and un-expires
// when renewed). The stored `status` is the admin's intent: ACTIVE (not blocked)
// or BLOCKED. Blocked overrules expiry in the display.

export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

/** Today's business date as YYYY-MM-DD (Asia/Kolkata, regardless of server TZ). */
export function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date());
}

/** A YYYY-MM-DD validity date is expired once it is before today (valid through that day). */
export function isExpired(date: string, todayIso: string): boolean {
  return date < todayIso;
}

export function anyExpired(
  truck: { rcValidity: string; insuranceValidity: string; fcValidity: string },
  todayIso: string,
): boolean {
  return (
    isExpired(truck.rcValidity, todayIso) ||
    isExpired(truck.insuranceValidity, todayIso) ||
    isExpired(truck.fcValidity, todayIso)
  );
}

export type DisplayStatus = "ACTIVE" | "EXPIRED" | "BLOCKED";

/** Pill label + classes per derived status (shared by every truck table). */
export const TRUCK_STATUS_PILL: Record<
  DisplayStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  BLOCKED: {
    label: "Blocked",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

/**
 * The status shown in the UI: Blocked (stored intent) overrules everything;
 * otherwise a truck with any past validity date is Expired; else Active.
 */
export function displayStatus(
  truck: {
    status: string;
    rcValidity: string;
    insuranceValidity: string;
    fcValidity: string;
  },
  todayIso: string,
): DisplayStatus {
  if (truck.status === "BLOCKED") return "BLOCKED";
  return anyExpired(truck, todayIso) ? "EXPIRED" : "ACTIVE";
}
