import { z } from "zod";

/** A simple master choice (party). */
export type Option = { id: string; name: string };

/** A (vessel, importer, cargo) combo a delivery order can draw from, with its BE
 * total, what's already allocated to DOs, and what's still available. */
export type DoComboOption = {
  vesselId: string;
  vesselSeq: number;
  vesselName: string;
  importerId: string;
  importerName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  /** Σ of this combo's bill-of-entry quantity (MT). */
  beTotal: number;
  /** Σ of this combo's existing delivery-order quantity (MT). */
  allocatedDo: number;
  /** beTotal − allocatedDo — still open for new delivery orders (MT). */
  available: number;
};

/** One row of the Delivery Orders table. */
export type DeliveryOrderRow = {
  id: string;
  seq: number;
  vesselId: string;
  vesselSeq: number;
  vesselName: string;
  importerId: string;
  importerName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  /** The receiver — per-DO, independent of the vessel/importer/cargo combo. */
  partyId: string;
  partyName: string;
  doQuantity: number;
  /** Delivered so far (MT); 0 until the truck-delivery layer increments it. */
  delivered: number;
  createdYmd: string; // "YYYY-MM-DD"
};

/** Delivery-order number, e.g. 1 -> "DO-#001". Auto-assigned (DB sequence). */
export function formatDoNumber(seq: number): string {
  return `DO-#${String(seq).padStart(3, "0")}`;
}

export const doSchema = z.object({
  vesselId: z.string().min(1, "Select a vessel"),
  importerId: z.string().min(1, "Select an importer"),
  cargoTypeId: z.string().min(1, "Select a cargo type"),
  partyId: z.string().min(1, "Select a party"),
  doQuantity: z.coerce
    .number()
    .positive("DO quantity must be greater than 0")
    .max(999_999_999, "DO quantity is too large"),
});

export type DeliveryOrderInput = z.infer<typeof doSchema>;
