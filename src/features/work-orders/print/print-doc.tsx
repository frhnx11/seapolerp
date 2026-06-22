/**
 * Shared pieces for the printable trip documents. The documents are server
 * components; only the toolbar (separate file) is client-side.
 */

export type TruckOrderPrintData = {
  seq: number;
  vehicleNo: string;
  loadingSiteName: string | null;
  loadingSlipAt: string | null;
};

/** ISO timestamp -> "DD-MM-YYYY" (the format used on the paper chits). */
export function docDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/** ISO timestamp -> "DD-MM-YYYY HH:mm". */
export function docDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${docDate(iso)} ${hh}:${mm}`;
}

/** The paper card — A5-ish width, black on white, screen shadow only. */
export function DocCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[460px] border border-gray-400 bg-white p-5 font-sans text-sm text-black shadow-lg print:border-gray-600 print:shadow-none">
      {children}
    </div>
  );
}

/** A "Label : value" line in the style of the handwritten chits. */
export function DocRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="w-40 shrink-0 font-semibold">{label}</span>
      <span className="shrink-0">:</span>
      <span className={strong ? "text-base font-bold" : ""}>{value}</span>
    </div>
  );
}
