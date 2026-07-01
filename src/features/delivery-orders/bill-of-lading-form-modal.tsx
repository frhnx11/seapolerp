"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatQty } from "@/core/format";

import {
  type BillOfLadingRow,
  type BlVesselOption,
  type Option,
} from "./bill-of-lading";
import {
  createBillOfLading,
  updateBillOfLading,
} from "./bill-of-lading-actions";
import { formatDoVesselId } from "./do-vessel";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function BillOfLadingFormModal({
  bl,
  vessels,
  importers,
  cargoTypes,
  lockedVesselId,
  onClose,
  onSaved,
}: {
  bl?: BillOfLadingRow;
  vessels: BlVesselOption[];
  importers: Option[];
  cargoTypes: Option[];
  /** When set (per-vessel view), the vessel is fixed and not editable. */
  lockedVesselId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(bl);
  const [vesselId, setVesselId] = useState(
    bl?.vesselId ?? lockedVesselId ?? "",
  );
  const [blNumber, setBlNumber] = useState(bl ? String(bl.blNumber) : "");
  const [importerId, setImporterId] = useState(bl?.importerId ?? "");
  const [cargoTypeId, setCargoTypeId] = useState(bl?.cargoTypeId ?? "");
  const [blQuantity, setBlQuantity] = useState(bl ? String(bl.blQuantity) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedVessel = useMemo(
    () => vessels.find((v) => v.id === vesselId),
    [vessels, vesselId],
  );

  // How much of the selected vessel is still open for this BL. On edit, this
  // BL's own quantity frees up first when it's still on the same vessel.
  const available = useMemo(() => {
    if (!selectedVessel) return null;
    const ownBack =
      isEdit && bl && bl.vesselId === selectedVessel.id ? bl.blQuantity : 0;
    return selectedVessel.available + ownBack;
  }, [selectedVessel, isEdit, bl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!vesselId) return setError("Select a vessel");
    if (!blNumber || Number(blNumber) <= 0) {
      return setError("Enter a BL number greater than 0");
    }
    if (!Number.isInteger(Number(blNumber))) {
      return setError("BL number must be a whole number");
    }
    if (!importerId) return setError("Select an importer");
    if (!cargoTypeId) return setError("Select a cargo type");
    if (!blQuantity || Number(blQuantity) <= 0) {
      return setError("Enter a BL quantity greater than 0");
    }
    if (available !== null && Number(blQuantity) > available) {
      return setError(
        `BL quantity can't exceed the ${formatQty(available)} MT still available on this vessel.`,
      );
    }

    const input = {
      vesselId,
      blNumber: Number(blNumber),
      importerId,
      cargoTypeId,
      blQuantity: Number(blQuantity),
    };

    setLoading(true);
    const result =
      isEdit && bl
        ? await updateBillOfLading(bl.id, input)
        : await createBillOfLading(input);
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Bill of lading updated" : "Bill of lading added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save bill of lading");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Bill of Lading" : "Create New BL"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {!lockedVesselId && (
            <div>
              <label
                htmlFor="bl-vessel"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Vessel<span className="text-red-500"> *</span>
              </label>
              <select
                id="bl-vessel"
                value={vesselId}
                onChange={(e) => setVesselId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Select vessel
                </option>
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDoVesselId(v.seq)} — {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="bl-number"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              BL Number<span className="text-red-500"> *</span>
            </label>
            <input
              id="bl-number"
              type="number"
              min="1"
              step="1"
              value={blNumber}
              onChange={(e) => setBlNumber(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 123456"
            />
          </div>

          <div>
            <label
              htmlFor="bl-importer"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Importer<span className="text-red-500"> *</span>
            </label>
            <select
              id="bl-importer"
              value={importerId}
              onChange={(e) => setImporterId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select importer
              </option>
              {importers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bl-cargo"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Cargo Type<span className="text-red-500"> *</span>
            </label>
            <select
              id="bl-cargo"
              value={cargoTypeId}
              onChange={(e) => setCargoTypeId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select cargo type
              </option>
              {cargoTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bl-quantity"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              BL Quantity (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="bl-quantity"
              type="number"
              min="0"
              step="0.001"
              value={blQuantity}
              onChange={(e) => setBlQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 5000"
            />
            {available !== null && (
              <p className="mt-1 text-xs text-gray-500">
                {formatQty(Math.max(available, 0))} MT available on this vessel
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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create BL"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
