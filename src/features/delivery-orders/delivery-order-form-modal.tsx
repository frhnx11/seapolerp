"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatQty } from "@/core/format";

import {
  type DeliveryOrderRow,
  type DoComboOption,
  type Option,
} from "./delivery-order";
import {
  createDeliveryOrder,
  updateDeliveryOrder,
} from "./delivery-order-actions";
import { formatDoVesselId } from "./do-vessel";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

const comboKey = (c: {
  vesselId: string;
  importerId: string;
  cargoTypeId: string;
}) => `${c.vesselId}|${c.importerId}|${c.cargoTypeId}`;

export function DeliveryOrderFormModal({
  deliveryOrder,
  combos,
  parties,
  lockedVesselId,
  onClose,
  onSaved,
}: {
  deliveryOrder?: DeliveryOrderRow;
  combos: DoComboOption[];
  parties: Option[];
  /** When set (per-vessel view), the vessel is fixed and not editable. */
  lockedVesselId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(deliveryOrder);
  const [vesselId, setVesselId] = useState(
    deliveryOrder?.vesselId ?? lockedVesselId ?? "",
  );
  const [importerId, setImporterId] = useState(deliveryOrder?.importerId ?? "");
  const [cargoTypeId, setCargoTypeId] = useState(
    deliveryOrder?.cargoTypeId ?? "",
  );
  const [partyId, setPartyId] = useState(deliveryOrder?.partyId ?? "");
  const [doQuantity, setDoQuantity] = useState(
    deliveryOrder ? String(deliveryOrder.doQuantity) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Combos with remaining headroom, plus (on edit) this DO's current combo.
  const currentKey = deliveryOrder ? comboKey(deliveryOrder) : null;
  const usableCombos = useMemo(
    () =>
      combos.filter(
        (c) => c.available > 1e-9 || (currentKey && comboKey(c) === currentKey),
      ),
    [combos, currentKey],
  );

  const vesselOptions = useMemo(() => {
    const seen = new Map<string, { seq: number; name: string }>();
    for (const c of usableCombos) {
      if (!seen.has(c.vesselId)) {
        seen.set(c.vesselId, { seq: c.vesselSeq, name: c.vesselName });
      }
    }
    return [...seen.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.seq - b.seq);
  }, [usableCombos]);

  const importerOptions = useMemo(() => {
    if (!vesselId) return [];
    const seen = new Map<string, string>();
    for (const c of usableCombos) {
      if (c.vesselId === vesselId && !seen.has(c.importerId)) {
        seen.set(c.importerId, c.importerName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usableCombos, vesselId]);

  const cargoOptions = useMemo(() => {
    if (!vesselId || !importerId) return [];
    const seen = new Map<string, string>();
    for (const c of usableCombos) {
      if (
        c.vesselId === vesselId &&
        c.importerId === importerId &&
        !seen.has(c.cargoTypeId)
      ) {
        seen.set(c.cargoTypeId, c.cargoTypeName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usableCombos, vesselId, importerId]);

  const selectedCombo = useMemo(
    () =>
      combos.find(
        (c) =>
          c.vesselId === vesselId &&
          c.importerId === importerId &&
          c.cargoTypeId === cargoTypeId,
      ) ?? null,
    [combos, vesselId, importerId, cargoTypeId],
  );

  // On edit, this DO's own quantity frees up first when it's the same combo.
  const available = useMemo(() => {
    if (!selectedCombo) return null;
    const ownBack =
      isEdit &&
      deliveryOrder &&
      comboKey(selectedCombo) === comboKey(deliveryOrder)
        ? deliveryOrder.doQuantity
        : 0;
    return selectedCombo.available + ownBack;
  }, [selectedCombo, isEdit, deliveryOrder]);

  function changeVessel(value: string) {
    setVesselId(value);
    setImporterId("");
    setCargoTypeId("");
  }
  function changeImporter(value: string) {
    setImporterId(value);
    setCargoTypeId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!vesselId) return setError("Select a vessel");
    if (!importerId) return setError("Select an importer");
    if (!cargoTypeId) return setError("Select a cargo type");
    if (!partyId) return setError("Select a party");
    if (!doQuantity || Number(doQuantity) <= 0) {
      return setError("Enter a DO quantity greater than 0");
    }
    if (available !== null && Number(doQuantity) > available) {
      return setError(
        `DO quantity can't exceed the ${formatQty(Math.max(available, 0))} MT still available for this vessel/importer/cargo.`,
      );
    }

    const input = {
      vesselId,
      importerId,
      cargoTypeId,
      partyId,
      doQuantity: Number(doQuantity),
    };

    setLoading(true);
    const result =
      isEdit && deliveryOrder
        ? await updateDeliveryOrder(deliveryOrder.id, input)
        : await createDeliveryOrder(input);
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Delivery order updated" : "Delivery order added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save delivery order");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Delivery Order" : "Create New Delivery Order"}
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
                htmlFor="do-vessel"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Vessel<span className="text-red-500"> *</span>
              </label>
              <select
                id="do-vessel"
                value={vesselId}
                onChange={(e) => changeVessel(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  {vesselOptions.length === 0
                    ? "No vessels with bill-of-entry headroom"
                    : "Select vessel"}
                </option>
                {vesselOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDoVesselId(v.seq)} — {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="do-importer"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Importer<span className="text-red-500"> *</span>
            </label>
            <select
              id="do-importer"
              value={importerId}
              onChange={(e) => changeImporter(e.target.value)}
              required
              disabled={!vesselId}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
            >
              <option value="" disabled>
                {!vesselId ? "Select a vessel first" : "Select importer"}
              </option>
              {importerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="do-cargo"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Cargo Type<span className="text-red-500"> *</span>
            </label>
            <select
              id="do-cargo"
              value={cargoTypeId}
              onChange={(e) => setCargoTypeId(e.target.value)}
              required
              disabled={!importerId}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
            >
              <option value="" disabled>
                {!importerId ? "Select an importer first" : "Select cargo type"}
              </option>
              {cargoOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="do-party"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Party<span className="text-red-500"> *</span>
            </label>
            <select
              id="do-party"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select party
              </option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The receiver — independent of the vessel, importer and cargo.
            </p>
          </div>

          <div>
            <label
              htmlFor="do-quantity"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              DO Quantity (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="do-quantity"
              type="number"
              min="0"
              step="0.001"
              value={doQuantity}
              onChange={(e) => setDoQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 2000"
            />
            {available !== null && (
              <p className="mt-1 text-xs text-gray-500">
                {formatQty(Math.max(available, 0))} MT available for this
                vessel/importer/cargo
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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create DO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
