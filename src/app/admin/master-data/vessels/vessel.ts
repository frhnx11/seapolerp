import { z } from "zod";

export type VesselRow = {
  id: string;
  seq: number;
  name: string;
  blQuantity: number;
  /** Σ of this vessel's work-order DO quantities (MT). */
  allocatedDo: number;
  /** BL minus allocated — what's still open for new/raised DOs (MT). */
  available: number;
};

/** Vessel ID, e.g. 1 -> "VSL-#001". */
export function formatVesselId(seq: number): string {
  return `VSL-#${String(seq).padStart(3, "0")}`;
}

export const vesselSchema = z.object({
  name: z.string().trim().min(1, "Vessel name is required").max(200),
  blQuantity: z.coerce
    .number()
    .positive("BL quantity must be greater than 0")
    .max(999_999_999, "BL quantity is too large"),
});

export type VesselInput = z.infer<typeof vesselSchema>;
