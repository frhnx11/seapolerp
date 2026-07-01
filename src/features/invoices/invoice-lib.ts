import { z } from "zod";

/** Invoice number, e.g. 1 -> "INV-#001". */
export function formatInvoiceNo(seq: number): string {
  return `INV-#${String(seq).padStart(3, "0")}`;
}

const MONTHS_ABBR = [
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

/** "2026-06-20" -> "Jun 20, 2026". Empty string for a blank/invalid date. */
export function fmtMonDayYear(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${MONTHS_ABBR[Number(mo) - 1]} ${Number(d)}, ${y}`;
}

/** "2026-06-20" -> "20.6.26" (day.month.2-digit-year, no leading zeros). */
export function fmtDotDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${Number(d)}.${Number(mo)}.${y.slice(2)}`;
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

/** The absolute gap between net sent and net received for one trip, in MT. */
export function netWeightDiff(t: {
  netWeight: number;
  netWeightReceived: number;
}): number {
  return Math.abs(t.netWeight - t.netWeightReceived);
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
  vendorInvoiceNumber: z
    .string()
    .trim()
    .min(1, "Vendor invoice number is required")
    .max(100, "Vendor invoice number is too long"),
  vendorInvoiceDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid vendor invoice date"),
  discountPartyId: z.string().trim().min(1, "Discount party is required"),
  tripIds: z.array(z.string().min(1)).min(1, "Select at least one trip"),
  discountPct: z.coerce
    .number()
    .min(0, "Discount can't be negative")
    .max(100, "Discount can't exceed 100%")
    .default(0)
    // The column is Decimal(5,2); round to 2 dp so the stored figures and the
    // printed doc (which recomputes from the stored pct) never disagree.
    .transform((n) => Math.round(n * 100) / 100),
  remarks: z.string().trim().max(500, "Remarks are too long").optional(),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

/** One row of the invoices table (with what the edit wizard needs to prefill). */
export type InvoiceListRow = {
  id: string;
  seq: number;
  date: string; // "YYYY-MM-DD"
  vendorInvoiceNumber: string | null;
  vendorInvoiceDate: string | null; // "YYYY-MM-DD"
  discountPartyId: string | null;
  discountPartyName: string | null;
  rate: number;
  totalQty: number;
  amount: number;
  discountPct: number;
  finalAmount: number;
  remarks: string | null;
  tripIds: string[];
};
