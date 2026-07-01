import { z } from "zod";

export type Option = { id: string; name: string };

/** A vessel choice for the WO form, with its total and current WO allocation. */
export type VesselOption = {
  id: string;
  name: string;
  totalQuantity: number;
  allocatedWo: number;
};

export type WorkOrderRow = {
  id: string;
  seq: number;
  date: string; // "YYYY-MM-DD"
  vesselId: string;
  vesselName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  supplierId: string;
  supplierName: string;
  partyId: string;
  partyName: string;
  woQuantity: number;
  delivered: number;
  balance: number;
  // Customs/regulatory references (consignment-level, optional).
  bePermissionNo: string | null;
  eaIaNo: string | null;
  eaIaDate: string | null; // "YYYY-MM-DD"
  sbBeNo: string | null;
  sbBeDate: string | null; // "YYYY-MM-DD"
  /** Trips recorded against this WO — once > 0 it can no longer be deleted. */
  truckOrderCount: number;
};

/** Work order number, e.g. 1 -> "WO-#001". */
export function formatWoNumber(seq: number): string {
  return `WO-#${String(seq).padStart(3, "0")}`;
}

export { formatQty } from "@/core/format";

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

export type WorkOrderStatus = "PENDING" | "PARTIAL" | "COMPLETED";

/** Derived from progress: nothing delivered = Pending, fully = Completed, else Partial. */
export function workOrderStatus(
  woQuantity: number,
  delivered: number,
): WorkOrderStatus {
  if (delivered <= 0) return "PENDING";
  if (delivered >= woQuantity) return "COMPLETED";
  return "PARTIAL";
}

export const STATUS_META: Record<
  WorkOrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  PARTIAL: {
    label: "Partial",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-green-200 bg-green-50 text-green-700",
  },
};

const optionalRef = z
  .string()
  .trim()
  .max(100, "Reference is too long")
  .optional();
const optionalDate = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Enter a valid date",
  )
  .optional();

export const woSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  vesselId: z.string().trim().min(1, "Vessel is required"),
  cargoTypeId: z.string().trim().min(1, "Cargo type is required"),
  supplierId: z.string().trim().min(1, "Supplier is required"),
  partyId: z.string().trim().min(1, "Party is required"),
  woQuantity: z.coerce
    .number()
    .positive("WO quantity must be greater than 0")
    .max(999_999_999, "WO quantity is too large"),
  bePermissionNo: optionalRef,
  eaIaNo: optionalRef,
  eaIaDate: optionalDate,
  sbBeNo: optionalRef,
  sbBeDate: optionalDate,
});

export type WorkOrderInput = z.infer<typeof woSchema>;
