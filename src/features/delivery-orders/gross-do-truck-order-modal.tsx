"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LastUpdatedLine } from "@/components/last-updated-line";
import { type EditLock } from "@/core/edit-window";
import { formatQty } from "@/core/format";

import { recordDoGross } from "./do-truck-order-actions";
import { formatDoTruckOrderNo, type DoTruckOrderRow } from "./do-truck-order";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function GrossDoTruckOrderModal({
  truckOrder,
  deliveryOrderId,
  lock,
  onClose,
  onSaved,
}: {
  truckOrder: DoTruckOrderRow;
  deliveryOrderId: string;
  lock: EditLock;
  onClose: () => void;
  onSaved: () => void;
}) {
  const locked = !lock.canEdit;
  const [grossWeight, setGrossWeight] = useState(
    truckOrder.grossWeight !== null ? String(truckOrder.grossWeight) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const grossNum = Number(grossWeight);
  const netPreview =
    grossWeight && grossNum > truckOrder.tareWeight
      ? grossNum - truckOrder.tareWeight
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (locked) return setError(lock.reason ?? "Editing is locked.");
    if (!grossWeight || grossNum <= 0) {
      return setError("Enter a gross weight greater than 0");
    }
    if (grossNum <= truckOrder.tareWeight) {
      return setError(
        `Gross weight must be greater than the tare (${formatQty(truckOrder.tareWeight)} MT).`,
      );
    }

    setLoading(true);
    const result = await recordDoGross(truckOrder.id, {
      deliveryOrderId,
      grossWeight: grossNum,
    });
    setLoading(false);

    if (result.ok) {
      toast.success("Gross weight saved");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save gross weight");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Gross Weight — {formatDoTruckOrderNo(truckOrder.seq)}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <span className="text-gray-500">Tare weight</span>
            <span className="font-medium text-gray-900">
              {formatQty(truckOrder.tareWeight)} MT
            </span>
          </div>

          <div>
            <label
              htmlFor="do-truck-gross"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Gross Weight (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-truck-gross"
              type="number"
              min="0"
              step="0.001"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              required
              disabled={locked}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`}
              placeholder="e.g. 32"
            />
            {locked && lock.reason && (
              <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm">
            <span className="text-gray-500">Net weight (gross − tare)</span>
            <span className="font-semibold text-gray-900">
              {netPreview !== null ? `${formatQty(netPreview)} MT` : "—"}
            </span>
          </div>

          <LastUpdatedLine
            by={truckOrder.grossByName}
            at={truckOrder.grossAt}
            firstBy={truckOrder.grossFirstByName}
            firstAt={truckOrder.grossFirstAt}
          />

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
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
