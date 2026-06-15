"use client";

import { ExternalLink } from "lucide-react";

/** Shows which invoice a (billed) truck order is included in. Purely presentational. */
export function InvoiceInfoModal({
  toNo,
  invoiceNo,
  invoiceId,
  onClose,
}: {
  /** Truck order number, e.g. "TO-#011". */
  toNo: string;
  /** Invoice number, e.g. "INV-#012". */
  invoiceNo: string;
  /** Invoice id, for the print link. */
  invoiceId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Invoice</h2>
        <p className="mt-2 text-sm text-gray-600">{toNo} is included in:</p>
        <p className="mt-3 text-2xl font-bold text-gray-900">{invoiceNo}</p>
        <a
          href={`/print/invoice/${invoiceId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0483ca] hover:underline"
        >
          <ExternalLink size={16} />
          View / print invoice
        </a>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
