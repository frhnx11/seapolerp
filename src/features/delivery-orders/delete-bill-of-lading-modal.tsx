"use client";

import { useState } from "react";
import { toast } from "sonner";

import { type BillOfLadingRow } from "./bill-of-lading";
import { deleteBillOfLading } from "./bill-of-lading-actions";

export function DeleteBillOfLadingModal({
  bl,
  onClose,
  onDeleted,
}: {
  bl: BillOfLadingRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteBillOfLading(bl.id);
    setLoading(false);
    if (result.ok) {
      toast.success("Bill of lading deleted");
      onDeleted();
    } else {
      toast.error(result.error ?? "Failed to delete bill of lading");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">
          Delete bill of lading
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Delete{" "}
          <span className="font-semibold text-gray-900">
            BL #{bl.blNumber} — {bl.vesselName}
          </span>
          ? This cannot be undone.
        </p>
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
