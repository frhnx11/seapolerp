"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { formatQty } from "@/core/format";

import { createVessel, updateVessel } from "./actions";
import { formatVesselId, type VesselRow } from "./vessel";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function VesselFormModal({
  vessel,
  onClose,
  onSaved,
}: {
  vessel?: VesselRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(vessel);
  const [name, setName] = useState(vessel?.name ?? "");
  const [blQuantity, setBlQuantity] = useState(
    vessel ? String(vessel.blQuantity) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Vessel name is required");
    if (!blQuantity || Number(blQuantity) <= 0) {
      return setError("Enter a BL quantity greater than 0");
    }
    if (isEdit && vessel && Number(blQuantity) < vessel.allocatedDo) {
      return setError(
        `BL quantity can't be less than the ${formatQty(vessel.allocatedDo)} MT already allocated to this vessel's work orders.`,
      );
    }

    const input = { name: name.trim(), blQuantity: Number(blQuantity) };

    setLoading(true);
    const result =
      isEdit && vessel
        ? await updateVessel(vessel.id, input)
        : await createVessel(input);
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Vessel updated" : "Vessel added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save vessel");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Vessel" : "Add New Vessel"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Vessel ID:{" "}
            <span className="font-semibold text-gray-900">
              {vessel ? formatVesselId(vessel.seq) : "Auto-assigned on save"}
            </span>
          </div>

          <div>
            <label
              htmlFor="vessel-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name<span className="text-red-500"> *</span>
            </label>
            <input
              id="vessel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. MV Ocean Star"
            />
          </div>

          <div>
            <label
              htmlFor="vessel-bl"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              BL Quantity (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="vessel-bl"
              type="number"
              min="0"
              step="0.001"
              value={blQuantity}
              onChange={(e) => setBlQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 50000"
            />
            {isEdit && vessel && vessel.allocatedDo > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {formatQty(vessel.allocatedDo)} MT is already allocated to work
                orders — the BL can&apos;t go below that.
              </p>
            )}
          </div>

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
              disabled={loading}
              className="flex-1 rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Vessel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
