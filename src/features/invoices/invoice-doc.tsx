import Image from "next/image";

import { formatInr, formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import { computeInvoiceTotals } from "./invoice-lib";

/**
 * Everything the invoice document renders. Pure data in, markup out — shared
 * by the wizard's preview (client) and the print route (server).
 */
export type InvoiceDocData = {
  invoiceNo: string; // "INV-#012", or a placeholder before the first save
  date: string; // "YYYY-MM-DD"
  truckOwner: string;
  rate: number; // ₹/MT
  discountPct: number;
  workOrder: {
    woNumber: string;
    vesselName: string;
    supplierName: string;
    partyName: string;
    cargoTypeName: string;
  };
  /** One row per trip; qty = the trip's lowest net weight (MT). */
  trips: {
    id: string;
    vtNumber: string | null;
    vehicleNo: string;
    qty: number;
  }[];
};

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/** The transport invoice document (preview + print). */
export function InvoiceDocView({ data }: { data: InvoiceDocData }) {
  const totalQty = data.trips.reduce((sum, t) => sum + t.qty, 0);
  const { amount, discount, finalAmount } = computeInvoiceTotals(
    totalQty,
    data.rate,
    data.discountPct,
  );

  return (
    <div className="w-[780px] border border-gray-400 bg-white p-8 font-sans text-sm text-black shadow-lg print:border-gray-600 print:shadow-none">
      {/* Letterhead */}
      <div className="flex items-start gap-3 border-b-2 border-gray-700 pb-3">
        <Image
          src="/seapollogo.png"
          alt="Seapol"
          width={96}
          height={72}
          className="h-12 w-auto object-contain"
        />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-extrabold">
            Seaport Logistics Pvt. Ltd.
          </h1>
          <p className="text-xs font-medium">
            B-32, World Trade Avenue, Harbour Estate,
          </p>
          <p className="text-xs font-medium">
            TUTICORIN - 628 004, Tel: 4200544
          </p>
        </div>
      </div>

      {/* Title + number/date */}
      <div className="mt-4 flex items-center justify-between">
        <span className="border-2 border-gray-700 px-3 py-1 text-sm font-bold tracking-wide">
          TRANSPORT INVOICE
        </span>
        <div className="text-right">
          <p className="text-sm">
            <span className="font-semibold">No. </span>
            <span className="text-base font-bold">{data.invoiceNo}</span>
          </p>
          <p className="text-sm">
            <span className="font-semibold">Date: </span>
            {formatDate(data.date)}
          </p>
        </div>
      </div>

      {/* Work order + parties */}
      <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3 rounded border border-gray-300 p-4">
        <InfoCell label="To (Truck Owner)" value={data.truckOwner} />
        <InfoCell label="Work Order" value={data.workOrder.woNumber} />
        <InfoCell label="Vessel" value={data.workOrder.vesselName} />
        <InfoCell label="Supplier" value={data.workOrder.supplierName} />
        <InfoCell label="Party" value={data.workOrder.partyName} />
        <InfoCell label="Cargo" value={data.workOrder.cargoTypeName} />
      </div>

      {/* Trip rows */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-y-2 border-gray-700 text-left text-xs font-bold tracking-wide uppercase">
            <th className="py-2 pr-2 text-right">Sl.</th>
            <th className="px-3 py-2">VT #</th>
            <th className="px-3 py-2">Vehicle No</th>
            <th className="px-3 py-2 text-right">Lowest Net Wt (MT)</th>
            <th className="px-3 py-2 text-right">Rate (₹/MT)</th>
            <th className="py-2 pl-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.trips.map((t, i) => (
            <tr key={t.id} className="border-b border-gray-200">
              <td className="py-1.5 pr-2 text-right text-xs text-gray-500">
                {i + 1}.
              </td>
              <td className="px-3 py-1.5 font-medium">{t.vtNumber ?? "—"}</td>
              <td className="px-3 py-1.5">{t.vehicleNo}</td>
              <td className="px-3 py-1.5 text-right">{formatQty(t.qty)}</td>
              <td className="px-3 py-1.5 text-right">{formatQty(data.rate)}</td>
              <td className="py-1.5 pl-3 text-right font-medium">
                {formatInr(t.qty * data.rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-80 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Total Net Weight ({data.trips.length} trip
              {data.trips.length === 1 ? "" : "s"})
            </span>
            <span className="font-semibold">{formatQty(totalQty)} MT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold">{formatInr(amount)}</span>
          </div>
          {data.discountPct > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Discount ({formatQty(data.discountPct)}%)
              </span>
              <span className="font-semibold">− {formatInr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-gray-700 pt-1.5 text-base font-bold">
            <span>Final Amount</span>
            <span>{formatInr(finalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="mt-12 flex justify-end">
        <div className="text-center">
          <div className="h-10" />
          <p className="border-t border-gray-500 px-6 pt-1 text-xs font-semibold">
            For Seaport Logistics Pvt. Ltd.
            <br />
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
}
