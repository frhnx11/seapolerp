"use client";

import { useState } from "react";
import { toast } from "sonner";

import { type EditLock } from "@/core/edit-window";

import { deleteDoTruckOrder } from "./do-truck-order-actions";
import { formatDoTruckOrderNo, type DoTruckOrderRow } from "./do-truck-order";

export function DeleteDoTruckOrderModal({
  truckOrder,
  deliveryOrderId,
  lock,
  onClose,
  onDeleted,
}: {
  truckOrder: DoTruckOrderRow;
  deliveryOrderId: string;
  lock: EditLock;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const locked = !lock.canEdit;

  async function handleDelete() {
    if (locked) {
      toast.error(lock.reason ?? "Editing is locked.");
      return;
    }
    setLoading(true);
    const result = await deleteDoTruckOrder(truckOrder.id, deliveryOrderId);
    setLoading(false);
    if (result.ok) {
      toast.success("Truck DO deleted");
      onDeleted();
    } else {
      toast.error(result.error ?? "Failed to delete truck DO");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Delete truck DO</h2>
        <p className="mt-2 text-sm text-gray-600">
          Delete{" "}
          <span className="font-semibold text-gray-900">
            {formatDoTruckOrderNo(truckOrder.seq)} — {truckOrder.vehicleNo}
          </span>
          ? This cannot be undone. The truck stays in the registry.
        </p>
        {locked && lock.reason && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {lock.reason}
          </p>
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
            disabled={loading || locked}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
