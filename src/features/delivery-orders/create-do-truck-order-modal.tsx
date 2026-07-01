"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LastUpdatedLine } from "@/components/last-updated-line";
import { type EditLock } from "@/core/edit-window";

import { DoTruckCombobox, type DoTruckSelection } from "./do-truck-combobox";
import { type DoTruckOption } from "./do-truck";
import {
  createDoTruckOrder,
  updateDoTruckOrder,
} from "./do-truck-order-actions";
import { type DoTruckOrderRow } from "./do-truck-order";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function CreateDoTruckOrderModal({
  deliveryOrderId,
  doTrucks,
  truckOrder,
  lock,
  onClose,
  onSaved,
}: {
  deliveryOrderId: string;
  doTrucks: DoTruckOption[];
  truckOrder?: DoTruckOrderRow;
  /** Edit-window lock (edit mode only); creating is always allowed. */
  lock?: EditLock;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(truckOrder);
  const locked = lock ? !lock.canEdit : false;
  const [selection, setSelection] = useState<DoTruckSelection | null>(null);
  const [tareWeight, setTareWeight] = useState(
    truckOrder ? String(truckOrder.tareWeight) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (locked) return setError(lock?.reason ?? "Editing is locked.");
    if (!isEdit && !selection) {
      return setError("Select or create a truck");
    }
    if (!tareWeight || Number(tareWeight) <= 0) {
      return setError("Enter a tare weight greater than 0");
    }

    setLoading(true);
    const result =
      isEdit && truckOrder
        ? await updateDoTruckOrder(truckOrder.id, {
            deliveryOrderId,
            tareWeight: Number(tareWeight),
          })
        : await createDoTruckOrder({
            deliveryOrderId,
            truckId: selection?.kind === "existing" ? selection.id : null,
            newVehicleNo:
              selection?.kind === "new" ? selection.vehicleNo : null,
            tareWeight: Number(tareWeight),
          });
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Truck DO updated" : "Truck DO added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save truck DO");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {!isEdit
              ? "Create New Truck DO"
              : locked
                ? "Truck DO"
                : "Edit Truck DO"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="do-truck-vehicle"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Vehicle Number<span className="text-red-500"> *</span>
            </label>
            {isEdit && truckOrder ? (
              <div className="rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-900">
                {truckOrder.vehicleNo}
              </div>
            ) : (
              <DoTruckCombobox
                id="do-truck-vehicle"
                options={doTrucks}
                selection={selection}
                onChange={setSelection}
              />
            )}
          </div>

          <div>
            <label
              htmlFor="do-truck-tare"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Tare Weight (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-truck-tare"
              type="number"
              min="0"
              step="0.001"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              required
              disabled={locked}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`}
              placeholder="e.g. 14.5"
            />
            {locked && lock?.reason && (
              <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
            )}
          </div>

          {isEdit && truckOrder && (
            <LastUpdatedLine
              by={truckOrder.tareByName}
              at={truckOrder.tareAt}
              firstBy={truckOrder.createdByName}
              firstAt={truckOrder.createdAt}
            />
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || locked}
              className="flex-1 rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
