import { z } from "zod";

export type VesselRow = {
  id: string;
  seq: number;
  name: string;
  totalQuantity: number;
  /** Σ of this vessel's work-order WO quantities (MT). */
  allocatedWo: number;
  /** Total minus allocated — what's still open for new/raised WOs (MT). */
  available: number;
};

/** Vessel ID, e.g. 1 -> "VSL-#001". */
export function formatVesselId(seq: number): string {
  return `VSL-#${String(seq).padStart(3, "0")}`;
}

export const vesselSchema = z.object({
  name: z.string().trim().min(1, "Vessel name is required").max(200),
  totalQuantity: z.coerce
    .number()
    .positive("Total quantity must be greater than 0")
    .max(999_999_999, "Total quantity is too large"),
});

export type VesselInput = z.infer<typeof vesselSchema>;
