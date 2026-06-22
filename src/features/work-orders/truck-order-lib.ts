import { z } from "zod";

/** Trip statuses in stage order — index = how far the trip has progressed. */
export const TRUCK_ORDER_STATUSES = [
  "TARE_RECORDED",
  "LOADING_SLIP_ISSUED",
  "COMPLETED",
] as const;

export type TruckOrderStatus = (typeof TRUCK_ORDER_STATUSES)[number];

export function truckOrderStatusIndex(status: string): number {
  const i = TRUCK_ORDER_STATUSES.indexOf(status as TruckOrderStatus);
  return i === -1 ? 0 : i;
}

// ---- Edit window ----

/**
 * Each recorded value (tare, loading site, gross, net received) is editable for
 * this long after its *first* entry. After that only an admin can change it, and
 * only until the trip is invoiced.
 */
export const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export type EditLock = { canEdit: boolean; reason: string | null };

/**
 * The single rule governing whether a value may be edited, shared by the server
 * actions (authoritative) and the popups (mirrors it for the UI).
 *
 * - `firstEnteredAt` is the immutable first-entry anchor; `null` means the value
 *   hasn't been entered yet, so this is a first entry — always allowed.
 * - Invoiced trips are locked for everyone (the weight is billed).
 * - Admins have no time limit (until invoiced); everyone else gets `EDIT_WINDOW_MS`.
 */
export function evaluateEditLock(p: {
  firstEnteredAt: string | Date | null;
  isAdmin: boolean;
  invoiced: boolean;
  now: number;
}): EditLock {
  if (p.invoiced) {
    return {
      canEdit: false,
      reason: "This trip is on an invoice — edit or delete that invoice first.",
    };
  }
  if (p.isAdmin) return { canEdit: true, reason: null };
  if (p.firstEnteredAt == null) return { canEdit: true, reason: null };
  const at =
    typeof p.firstEnteredAt === "string"
      ? Date.parse(p.firstEnteredAt)
      : p.firstEnteredAt.getTime();
  if (p.now <= at + EDIT_WINDOW_MS) return { canEdit: true, reason: null };
  return {
    canEdit: false,
    reason:
      "The 30-minute editing window has closed — ask an admin to make changes.",
  };
}

/** Truck order number, e.g. 1 -> "TO-#001". */
export function formatTruckOrderNo(seq: number): string {
  return `TO-#${String(seq).padStart(3, "0")}`;
}

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

/**
 * Net sent (gross − tare) and net received should agree within this margin (MT);
 * a larger absolute gap flags the trip for review.
 */
export const NET_TOLERANCE_MT = 0.3;

/** Absolute net difference in MT, or null when either weight is missing. */
export function netDifference(
  net: number | null,
  received: number | null,
): number | null {
  return net === null || received === null ? null : Math.abs(net - received);
}

/** True when net sent vs received exceeds the tolerance (float-safe; a true 0.300 is fine). */
export function isNetDiscrepancy(
  net: number | null,
  received: number | null,
): boolean {
  const d = netDifference(net, received);
  return d !== null && d - NET_TOLERANCE_MT > 1e-9;
}

/** ISO timestamp -> "DD Mon HH:mm" (display only, local time). */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${hh}:${mm}`;
}

/** A truck available for a new trip (in the global allotted pool, not blocked). */
export type TruckOption = { id: string; vehicleNo: string };

/**
 * A work order offered in the gross-stage selector. Carries the quantities so the
 * picker can show the remaining balance; `balance = doQuantity - delivered`.
 */
export type WorkOrderOption = {
  id: string;
  seq: number;
  vesselName: string;
  cargoTypeName: string;
  supplierName: string;
  partyName: string;
  doQuantity: number;
  delivered: number;
};

export type TruckOrderRow = {
  id: string;
  seq: number;
  status: TruckOrderStatus;
  truckId: string;
  vehicleNo: string;
  wheels: number;
  owner: string;
  // Tare's edit-window anchor — the trip is created at tare entry (immutable).
  createdAt: string; // ISO
  // Work order — null until the gross stage maps the trip to one.
  workOrderId: string | null;
  workOrderSeq: number | null;
  // Stage 1
  tareWeight: number;
  tareByName: string;
  tareAt: string; // ISO
  tareFirstByName: string | null; // immutable: who first entered tare
  // Stage 2
  loadingSiteId: string | null;
  loadingSiteName: string | null;
  loadingSlipByName: string | null;
  loadingSlipAt: string | null;
  loadingSlipFirstByName: string | null; // immutable: who first entered it
  loadingSlipFirstAt: string | null; // immutable edit-window anchor
  // Stage 3
  vtNumber: string | null;
  grossWeight: number | null;
  netWeight: number | null;
  completedByName: string | null;
  completedAt: string | null;
  grossFirstByName: string | null; // immutable: who first entered gross
  grossFirstAt: string | null; // immutable edit-window anchor
  // Party weighbridge — net weight received at the destination
  netWeightReceived: number | null;
  netReceivedByName: string | null;
  netReceivedAt: string | null;
  netReceivedFirstByName: string | null; // immutable: who first entered it
  netReceivedFirstAt: string | null; // immutable edit-window anchor
  // Invoicing — set once the trip is billed (null = not on any invoice).
  invoiceId: string | null;
  invoiceSeq: number | null; // the invoice's display number, when billed
};

const tareWeightField = z.coerce
  .number()
  .positive("Tare weight must be greater than 0")
  .max(999_999_999, "Tare weight is too large");

export const createTruckOrderSchema = z.object({
  truckId: z.string().trim().min(1, "Truck is required"),
  tareWeight: tareWeightField,
});

export type CreateTruckOrderInput = z.infer<typeof createTruckOrderSchema>;

export const editTareSchema = z.object({
  tareWeight: tareWeightField,
});

export type EditTareInput = z.infer<typeof editTareSchema>;

// ---- Stage 2-3 inputs ----

export const loadingSlipSchema = z.object({
  loadingSiteId: z.string().trim().min(1, "Loading site is required"),
});
export type LoadingSlipInput = z.infer<typeof loadingSlipSchema>;

export const grossSchema = z.object({
  workOrderId: z.string().trim().min(1, "Work order is required"),
  vtNumber: z
    .string()
    .trim()
    .min(1, "VT number is required")
    .max(100, "VT number is too long"),
  grossWeight: z.coerce
    .number()
    .positive("Gross weight must be greater than 0")
    .max(999_999_999, "Gross weight is too large"),
});
export type GrossInput = z.infer<typeof grossSchema>;

export const netReceivedSchema = z.object({
  netWeightReceived: z.coerce
    .number()
    .positive("Net weight received must be greater than 0")
    .max(999_999_999, "Net weight received is too large"),
});
export type NetReceivedInput = z.infer<typeof netReceivedSchema>;
