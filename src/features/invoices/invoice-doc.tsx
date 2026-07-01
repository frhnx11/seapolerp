import Image from "next/image";

import { computeInvoiceTotals, fmtDotDate, fmtMonDayYear } from "./invoice-lib";

/** Fixed line-item description on every payment bill. */
const LINE_DESCRIPTION = "Trip charges (Min Weight) - Wharf/Plot to";

/** Grouped number to a fixed number of decimals, e.g. num(346522.8, 2) -> "346,522.80". */
function num(n: number, dp: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/**
 * Everything the invoice document renders. Pure data in, markup out — shared
 * by the wizard's preview (client) and the print route (server).
 */
export type InvoiceDocData = {
  invoiceNo: string; // "INV-#012", or a placeholder before the first save
  date: string; // invoice date, "YYYY-MM-DD"
  vesselName: string;
  /** The billed party — shown as "Issued To" and inside the title. */
  discountPartyName: string;
  vendorInvoiceNumber: string;
  vendorInvoiceDate: string; // "YYYY-MM-DD"
  rate: number; // ₹/MT, frozen at creation
  totalQty: number; // Σ lowest net weights (MT)
  discountPct: number;
  remarks?: string | null; // optional free text (e.g. the discount reason)
};

/** One right-aligned "label : value" pair in the header block. */
function HeadField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-right text-gray-500">{label} :</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </>
  );
}

/** The payment bill document (wizard preview + print). */
export function InvoiceDocView({ data }: { data: InvoiceDocData }) {
  const { amount, discount, finalAmount } = computeInvoiceTotals(
    data.totalQty,
    data.rate,
    data.discountPct,
  );

  const cell = "border border-gray-400 px-3 py-2";

  return (
    <div className="w-[780px] border border-gray-400 bg-white p-8 font-sans text-sm text-black shadow-lg print:border-gray-600 print:shadow-none">
      {/* Letterhead */}
      <div className="flex items-center gap-4 border-b-2 border-gray-800 pb-3">
        <Image
          src="/seapollogo.png"
          alt="Seapol"
          width={120}
          height={90}
          className="h-14 w-auto object-contain"
        />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Seaport Logistics Pvt Ltd (TTN)
          </h1>
          <p className="text-xs font-medium">
            B 32 World Trade Avenue, Harbour Estate,
          </p>
          <p className="text-xs font-medium">Tuticorin - 628004, India</p>
        </div>
      </div>

      {/* Payment Bill + Issued To (left) · dated fields (right) */}
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Bill</h2>
          <div className="mt-4">
            <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              Issued To
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.discountPartyName}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-sm">
          <HeadField label="Date" value={fmtMonDayYear(data.date)} />
          <HeadField label="No." value={data.invoiceNo} />
          <HeadField label="Vendor Inv #" value={data.vendorInvoiceNumber} />
          <HeadField
            label="Vendor Inv Date"
            value={fmtMonDayYear(data.vendorInvoiceDate)}
          />
        </div>
      </div>

      {/* Title */}
      <div className="mt-4 border-t border-gray-200 pt-3 text-sm">
        <span className="font-semibold text-gray-500">Title : </span>
        <span className="font-semibold text-gray-900">
          {data.vesselName}/{data.discountPartyName}/{data.vendorInvoiceNumber}/
          {fmtDotDate(data.vendorInvoiceDate)}
        </span>
      </div>

      {/* Line items */}
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs font-bold tracking-wide text-gray-700 uppercase">
            <th className={`${cell} text-left`}>Description</th>
            <th className={`${cell} text-right`}>Qty</th>
            <th className={`${cell} text-center`}>Rate per</th>
            <th className={`${cell} text-right`}>Rate</th>
            <th className={`${cell} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cell}>{LINE_DESCRIPTION}</td>
            <td className={`${cell} text-right`}>{num(data.totalQty, 3)}</td>
            <td className={`${cell} text-center`}>MT</td>
            <td className={`${cell} text-right`}>{num(data.rate, 2)}</td>
            <td className={`${cell} text-right`}>{num(amount, 2)}</td>
          </tr>
          <tr>
            <td className={cell} />
            <td className={`${cell} text-right`}>{num(data.totalQty, 3)}</td>
            <td className={`${cell} text-center`}>MT</td>
            <td className={`${cell} text-right font-semibold`}>SubTotal</td>
            <td className={`${cell} text-right font-semibold`}>
              {num(amount, 2)}
            </td>
          </tr>
          <tr>
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className={`${cell} text-right`}>
              Discount {num(data.discountPct, 2)} %
            </td>
            <td className={`${cell} text-right`}>{num(discount, 2)}</td>
          </tr>
          <tr>
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className={`${cell} text-right font-bold`}>Total</td>
            <td className={`${cell} text-right font-bold`}>
              {num(finalAmount, 2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer: remarks (left) + signatory (right) */}
      <div className="mt-10 flex items-start justify-between gap-6">
        <div className="max-w-xs">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            Remarks
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700">
            {data.remarks?.trim() || "None"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900">
            For SEAPORT LOGISTICS PVT LTD
          </p>
          <div className="h-12" />
          <p className="border-t border-gray-400 px-8 pt-1 text-sm font-semibold text-gray-700">
            Manager
          </p>
        </div>
      </div>

      <p className="mt-10 text-center text-sm font-medium tracking-wide text-gray-500 italic">
        THANK YOU FOR YOUR SERVICE.
      </p>
    </div>
  );
}
