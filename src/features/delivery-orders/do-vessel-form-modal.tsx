"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createDoVessel, updateDoVessel } from "./do-vessel-actions";
import { formatDoVesselId, type DoVesselRow } from "./do-vessel";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function DoVesselFormModal({
  vessel,
  onClose,
  onSaved,
}: {
  vessel?: DoVesselRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(vessel);
  const [name, setName] = useState(vessel?.name ?? "");
  const [totalQuantity, setTotalQuantity] = useState(
    vessel ? String(vessel.totalQuantity) : "",
  );
  const [depth, setDepth] = useState(vessel ? String(vessel.depth) : "");
  const [hatch, setHatch] = useState(vessel ? String(vessel.hatch) : "");
  const [arrivalDate, setArrivalDate] = useState(vessel?.arrivalDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Vessel name is required");
    if (!totalQuantity || Number(totalQuantity) <= 0) {
      return setError("Enter a total quantity greater than 0");
    }
    if (!depth || Number(depth) <= 0) {
      return setError("Enter a depth greater than 0");
    }
    if (!hatch || Number(hatch) <= 0) {
      return setError("Enter a hatch greater than 0");
    }
    if (!arrivalDate) return setError("Select the date of arrival");

    const input = {
      name: name.trim(),
      totalQuantity: Number(totalQuantity),
      depth: Number(depth),
      hatch: Number(hatch),
      arrivalDate,
    };

    setLoading(true);
    const result =
      isEdit && vessel
        ? await updateDoVessel(vessel.id, input)
        : await createDoVessel(input);
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
              {vessel ? formatDoVesselId(vessel.seq) : "Auto-assigned on save"}
            </span>
          </div>

          <div>
            <label
              htmlFor="do-vessel-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-vessel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. MV Ocean Star"
            />
          </div>

          <div>
            <label
              htmlFor="do-vessel-total"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Total Quantity (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-vessel-total"
              type="number"
              min="0"
              step="0.001"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 80000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="do-vessel-depth"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Depth<span className="text-red-500"> *</span>
              </label>
              <input
                id="do-vessel-depth"
                type="number"
                min="0"
                step="0.001"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g. 12.5"
              />
            </div>

            <div>
              <label
                htmlFor="do-vessel-hatch"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Hatch<span className="text-red-500"> *</span>
              </label>
              <input
                id="do-vessel-hatch"
                type="number"
                min="0"
                step="0.001"
                value={hatch}
                onChange={(e) => setHatch(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="do-vessel-arrival"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Date of Arrival<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-vessel-arrival"
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              required
              className={inputClass}
            />
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
