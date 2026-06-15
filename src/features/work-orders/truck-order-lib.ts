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

/** A truck available for a new trip (allotted to the WO, not blocked). */
export type TruckOption = { id: string; vehicleNo: string };

export type TruckOrderRow = {
  id: string;
  seq: number;
  status: TruckOrderStatus;
  truckId: string;
  vehicleNo: string;
  wheels: number;
  owner: string;
  // Stage 1
  tareWeight: number;
  tareByName: string;
  tareAt: string; // ISO
  // Stage 2
  loadingSiteId: string | null;
  loadingSiteName: string | null;
  loadingSlipByName: string | null;
  loadingSlipAt: string | null;
  // Stage 3
  vtNumber: string | null;
  grossWeight: number | null;
  netWeight: number | null;
  completedByName: string | null;
  completedAt: string | null;
  // Party weighbridge — net weight received at the destination
  netWeightReceived: number | null;
  netReceivedByName: string | null;
  netReceivedAt: string | null;
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
