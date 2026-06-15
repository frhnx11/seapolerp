import { z } from "zod";

/** Invoice number, e.g. 1 -> "INV-#001". */
export function formatInvoiceNo(seq: number): string {
  return `INV-#${String(seq).padStart(3, "0")}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** A settled trip (COMPLETED + net received) offered to the invoice wizard. */
export type CandidateTrip = {
  id: string;
  seq: number; // TO#
  vtNumber: string | null;
  vehicleNo: string;
  owner: string;
  netWeight: number; // net sent at the port (gross − tare)
  netWeightReceived: number;
  /** Set when the trip is already on an invoice (only that invoice may reuse it). */
  invoiceId: string | null;
};

/** The billed weight for one trip: the lower of net sent and net received. */
export function lowestNet(t: {
  netWeight: number;
  netWeightReceived: number;
}): number {
  return Math.min(t.netWeight, t.netWeightReceived);
}

/** Σ lowest nets for a set of trips, in MT (3 dp). */
export function totalLowestNet(
  trips: { netWeight: number; netWeightReceived: number }[],
): number {
  return round3(trips.reduce((sum, t) => sum + lowestNet(t), 0));
}

/**
 * The invoice money math — single source shared by the wizard preview, the
 * document view, and the server actions: amount = qty × rate, then the
 * percentage discount comes off.
 */
export function computeInvoiceTotals(
  totalQty: number,
  rate: number,
  discountPct: number,
) {
  const amount = round2(totalQty * rate);
  const discount = round2((amount * discountPct) / 100);
  return { amount, discount, finalAmount: round2(amount - discount) };
}

export const invoiceInputSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid invoice date"),
  truckOwner: z.string().trim().min(1, "Truck company is required"),
  tripIds: z.array(z.string().min(1)).min(1, "Select at least one trip"),
  discountPct: z.coerce
    .number()
    .min(0, "Discount can't be negative")
    .max(100, "Discount can't exceed 100%")
    .default(0),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

/** One row of the invoices table (with what the edit wizard needs to prefill). */
export type InvoiceListRow = {
  id: string;
  seq: number;
  date: string; // "YYYY-MM-DD"
  truckOwner: string;
  rate: number;
  totalQty: number;
  amount: number;
  discountPct: number;
  finalAmount: number;
  tripIds: string[];
};
