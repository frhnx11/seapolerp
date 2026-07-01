import { z } from "zod";

/** A simple master choice (importer, cargo type). */
export type Option = { id: string; name: string };

/** A vessel choice for the BL form, with its total and current BL allocation. */
export type BlVesselOption = {
  id: string;
  seq: number;
  name: string;
  totalQuantity: number;
  allocatedBl: number;
  /** Total minus allocated — still open for new bills of lading (MT). */
  available: number;
};

/** One row of the Bills of Lading table. */
export type BillOfLadingRow = {
  id: string;
  seq: number;
  blNumber: number;
  vesselId: string;
  vesselSeq: number;
  vesselName: string;
  importerId: string;
  importerName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  blQuantity: number;
  /** The BE this BL belongs to, if any (null until it's added to a BE). */
  beNumber: number | null;
  createdYmd: string; // "YYYY-MM-DD"
};

export const blSchema = z.object({
  vesselId: z.string().min(1, "Select a vessel"),
  blNumber: z.coerce
    .number()
    .int("BL number must be a whole number")
    .positive("BL number must be greater than 0")
    .max(2_147_483_647, "BL number is too large"),
  importerId: z.string().min(1, "Select an importer"),
  cargoTypeId: z.string().min(1, "Select a cargo type"),
  blQuantity: z.coerce
    .number()
    .positive("BL quantity must be greater than 0")
    .max(999_999_999, "BL quantity is too large"),
});

export type BillOfLadingInput = z.infer<typeof blSchema>;
