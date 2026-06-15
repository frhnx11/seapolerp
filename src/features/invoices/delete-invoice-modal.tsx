"use client";

import { useState } from "react";
import { toast } from "sonner";

import { deleteInvoice } from "./invoice-actions";
import { formatInvoiceNo, type InvoiceListRow } from "./invoice-lib";

/** Confirms deletion; the invoice's trips become billable again. */
export function DeleteInvoiceModal({
  invoice,
  onClose,
  onDeleted,
}: {
  invoice: InvoiceListRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    setLoading(true);
    const result = await deleteInvoice(invoice.id);
    setLoading(false);
    if (result.ok) {
      toast.success(`${formatInvoiceNo(invoice.seq)} deleted`);
      onDeleted();
    } else {
      setError(result.error ?? "Failed to delete");
    }
  }

  const trips = invoice.tripIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">
          Delete {formatInvoiceNo(invoice.seq)}?
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Its {trips} trip{trips === 1 ? "" : "s"} become available for future
          invoices. This can&apos;t be undone.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
