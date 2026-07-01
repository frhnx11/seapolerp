import { z } from "zod";

/** Truck-DO number, e.g. 1 -> "DTO-#001". Auto-assigned (DB sequence). */
export function formatDoTruckOrderNo(seq: number): string {
  return `DTO-#${String(seq).padStart(3, "0")}`;
}

const tareField = z.coerce
  .number()
  .positive("Tare weight must be greater than 0")
  .max(999_999_999, "Tare weight is too large");

/**
 * Create input: the truck is either an existing registry entry (`truckId`) or a
 * brand-new vehicle number (`newVehicleNo`) — exactly one must be set.
 */
export const createDoTruckOrderSchema = z
  .object({
    deliveryOrderId: z.string().min(1, "Missing delivery order"),
    truckId: z.string().trim().min(1).nullable(),
    newVehicleNo: z.string().trim().min(1, "Enter a vehicle number").nullable(),
    tareWeight: tareField,
  })
  .refine((d) => Boolean(d.truckId) !== Boolean(d.newVehicleNo), {
    message: "Select a truck or create a new one",
    path: ["truckId"],
  });

export const updateDoTruckOrderSchema = z.object({
  deliveryOrderId: z.string().min(1, "Missing delivery order"),
  tareWeight: tareField,
});

export const grossDoTruckOrderSchema = z.object({
  deliveryOrderId: z.string().min(1, "Missing delivery order"),
  grossWeight: z.coerce
    .number()
    .positive("Gross weight must be greater than 0")
    .max(999_999_999, "Gross weight is too large"),
});

export type CreateDoTruckOrderInput = z.infer<typeof createDoTruckOrderSchema>;
export type UpdateDoTruckOrderInput = z.infer<typeof updateDoTruckOrderSchema>;
export type GrossDoTruckOrderInput = z.infer<typeof grossDoTruckOrderSchema>;

/** One row of a delivery order's Truck DO table. */
export type DoTruckOrderRow = {
  id: string;
  seq: number;
  vehicleNo: string;
  tareWeight: number;
  /** Gross/net are null until the gross weight is recorded; net = gross − tare. */
  grossWeight: number | null;
  netWeight: number | null;
  createdYmd: string; // "YYYY-MM-DD"
  // Attribution + edit-window anchors (ISO strings). Tare's first-entry anchor is
  // `createdAt` (the row is created at tare entry); gross's is `grossFirstAt`.
  createdByName: string | null;
  createdAt: string; // ISO
  tareByName: string | null;
  tareAt: string | null;
  grossByName: string | null;
  grossAt: string | null;
  grossFirstByName: string | null;
  grossFirstAt: string | null;
};
