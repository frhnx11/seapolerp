import { z } from "zod";

import { isValidYmd } from "@/core/date";

/** One row of the Delivery-Order vessels table. */
export type DoVesselRow = {
  id: string;
  seq: number;
  name: string;
  createdYmd: string; // "YYYY-MM-DD"
  totalQuantity: number;
  /** Σ of this vessel's delivery-order quantities (MT). */
  allocatedDo: number;
  /** Σ of this vessel's delivered truck weights (MT). 0 until the DO truck layer exists. */
  delivered: number;
  /** Vessel depth (decimal). Captured at creation/edit; not shown in the table. */
  depth: number;
  /** Vessel hatch (decimal). Captured at creation/edit; not shown in the table. */
  hatch: number;
  /** Date the vessel arrived (YYYY-MM-DD), or null. Shown on reports. */
  arrivalDate: string | null;
};

/** Delivery-order vessel ID, e.g. 1 -> "DV-#001". */
export function formatDoVesselId(seq: number): string {
  return `DV-#${String(seq).padStart(3, "0")}`;
}

/** A vessel is complete once its full total quantity has been delivered. */
export function isDoVesselCompleted(row: DoVesselRow): boolean {
  return row.totalQuantity - row.delivered <= 1e-9;
}

export const doVesselSchema = z.object({
  name: z.string().trim().min(1, "Vessel name is required").max(200),
  totalQuantity: z.coerce
    .number()
    .positive("Total quantity must be greater than 0")
    .max(999_999_999, "Total quantity is too large"),
  depth: z.coerce
    .number()
    .positive("Depth must be greater than 0")
    .max(99_999, "Depth is too large"),
  hatch: z.coerce
    .number()
    .positive("Hatch must be greater than 0")
    .max(99_999, "Hatch is too large"),
  arrivalDate: z
    .string()
    .trim()
    .refine(isValidYmd, "Enter a valid date of arrival"),
});

export type DoVesselInput = z.infer<typeof doVesselSchema>;
