import { z } from "zod";

export { type Option } from "./bill-of-lading";

/** A vessel choice for the BE form. */
export type BeVesselOption = { id: string; seq: number; name: string };

/** A selectable bill of lading for the BE picker (the unassigned pool). */
export type BeBlOption = {
  id: string;
  blNumber: number;
  vesselId: string;
  importerId: string;
  cargoTypeId: string;
  blQuantity: number;
};

/** One row of the Bills of Entry table. */
export type BillOfEntryRow = {
  id: string;
  seq: number;
  beNumber: number;
  vesselId: string;
  vesselSeq: number;
  vesselName: string;
  importerId: string;
  importerName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  /** Σ of the member BLs' quantities (MT). */
  blQuantity: number;
  bls: { id: string; blNumber: number; blQuantity: number }[];
  createdYmd: string; // "YYYY-MM-DD"
};

const beNumberField = z.coerce
  .number()
  .int("BE number must be a whole number")
  .positive("BE number must be greater than 0")
  .max(2_147_483_647, "BE number is too large");

const blIdsField = z
  .array(z.string().min(1))
  .min(1, "Select at least one bill of lading");

/** Create: BE number + the three filters + the chosen BLs. */
export const beCreateSchema = z.object({
  beNumber: beNumberField,
  vesselId: z.string().min(1, "Select a vessel"),
  importerId: z.string().min(1, "Select an importer"),
  cargoTypeId: z.string().min(1, "Select a cargo type"),
  blIds: blIdsField,
});

/** Edit: vessel/importer/cargo are fixed by the BLs, so only these change. */
export const beUpdateSchema = z.object({
  beNumber: beNumberField,
  blIds: blIdsField,
});

export type BillOfEntryCreateInput = z.infer<typeof beCreateSchema>;
export type BillOfEntryUpdateInput = z.infer<typeof beUpdateSchema>;
