"use client";

import { Check, Minus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatQty } from "@/core/format";

import {
  type BeBlOption,
  type BeVesselOption,
  type BillOfEntryRow,
  type Option,
} from "./bill-of-entry";
import { createBillOfEntry, updateBillOfEntry } from "./bill-of-entry-actions";
import { formatDoVesselId } from "./do-vessel";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export function BillOfEntryFormModal({
  be,
  vessels,
  importers,
  cargoTypes,
  availableBls,
  lockedVesselId,
  onClose,
  onSaved,
}: {
  be?: BillOfEntryRow;
  vessels: BeVesselOption[];
  importers: Option[];
  cargoTypes: Option[];
  availableBls: BeBlOption[];
  /** When set (per-vessel view), the vessel is fixed at creation. */
  lockedVesselId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(be);
  const [beNumber, setBeNumber] = useState(be ? String(be.beNumber) : "");
  const [vesselId, setVesselId] = useState(
    be?.vesselId ?? lockedVesselId ?? "",
  );
  const [importerId, setImporterId] = useState(be?.importerId ?? "");
  const [cargoTypeId, setCargoTypeId] = useState(be?.cargoTypeId ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(be?.bls.map((b) => b.id) ?? []),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtersChosen = Boolean(vesselId && importerId && cargoTypeId);

  // The BLs the user can pick from: unassigned ones matching the chosen
  // vessel/importer/cargo, plus (on edit) this BE's own BLs which are already
  // assigned to it. Sorted by BL number.
  const pool = useMemo<BeBlOption[]>(() => {
    if (!filtersChosen) return [];
    const matching = availableBls.filter(
      (b) =>
        b.vesselId === vesselId &&
        b.importerId === importerId &&
        b.cargoTypeId === cargoTypeId,
    );
    if (isEdit && be) {
      const own: BeBlOption[] = be.bls.map((b) => ({
        id: b.id,
        blNumber: b.blNumber,
        vesselId: be.vesselId,
        importerId: be.importerId,
        cargoTypeId: be.cargoTypeId,
        blQuantity: b.blQuantity,
      }));
      const ownIds = new Set(own.map((b) => b.id));
      return [...own, ...matching.filter((b) => !ownIds.has(b.id))].sort(
        (a, b) => a.blNumber - b.blNumber,
      );
    }
    return [...matching].sort((a, b) => a.blNumber - b.blNumber);
  }, [
    availableBls,
    vesselId,
    importerId,
    cargoTypeId,
    filtersChosen,
    isEdit,
    be,
  ]);

  const selectedInPool = useMemo(
    () => pool.filter((b) => selected.has(b.id)),
    [pool, selected],
  );
  const selectedTotal = selectedInPool.reduce((s, b) => s + b.blQuantity, 0);

  const allSelected = pool.length > 0 && pool.every((b) => selected.has(b.id));
  const someSelected = pool.some((b) => selected.has(b.id));

  // Cascading choices: only importers/cargo types that actually have an unassigned
  // BL for the chosen vessel (+ importer) are offered, so every combo yields ≥1 BL.
  const importerOptions = useMemo(
    () =>
      vesselId
        ? importers.filter((p) =>
            availableBls.some(
              (b) => b.vesselId === vesselId && b.importerId === p.id,
            ),
          )
        : [],
    [importers, availableBls, vesselId],
  );
  const cargoOptions = useMemo(
    () =>
      vesselId && importerId
        ? cargoTypes.filter((c) =>
            availableBls.some(
              (b) =>
                b.vesselId === vesselId &&
                b.importerId === importerId &&
                b.cargoTypeId === c.id,
            ),
          )
        : [],
    [cargoTypes, availableBls, vesselId, importerId],
  );

  // Each filter change clears everything downstream (and the BL selection).
  function changeVessel(value: string) {
    setVesselId(value);
    setImporterId("");
    setCargoTypeId("");
    setSelected(new Set());
  }
  function changeImporter(value: string) {
    setImporterId(value);
    setCargoTypeId("");
    setSelected(new Set());
  }
  function changeCargo(value: string) {
    setCargoTypeId(value);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (pool.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) for (const b of pool) next.delete(b.id);
      else for (const b of pool) next.add(b.id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!beNumber || Number(beNumber) <= 0) {
      return setError("Enter a BE number greater than 0");
    }
    if (!Number.isInteger(Number(beNumber))) {
      return setError("BE number must be a whole number");
    }
    if (!isEdit && !filtersChosen) {
      return setError("Select a vessel, importer and cargo type");
    }
    const blIds = [...selected];
    if (blIds.length === 0) {
      return setError("Select at least one bill of lading");
    }

    setLoading(true);
    const result =
      isEdit && be
        ? await updateBillOfEntry(be.id, { beNumber: Number(beNumber), blIds })
        : await createBillOfEntry({
            beNumber: Number(beNumber),
            vesselId,
            importerId,
            cargoTypeId,
            blIds,
          });
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Bill of entry updated" : "Bill of entry added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save bill of entry");
    }
  }

  const lockedVessel = vessels.find((v) => v.id === vesselId);
  const lockedImporter = importers.find((p) => p.id === importerId);
  const lockedCargo = cargoTypes.find((c) => c.id === cargoTypeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Bill of Entry" : "Create New BE"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div>
              <label
                htmlFor="be-number"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                BE Number<span className="text-red-500"> *</span>
              </label>
              <input
                id="be-number"
                type="number"
                min="1"
                step="1"
                value={beNumber}
                onChange={(e) => setBeNumber(e.target.value)}
                required
                className={inputClass}
                placeholder="e.g. 123456"
              />
            </div>

            {isEdit ? (
              // Vessel/importer/cargo are fixed by the member BLs on edit.
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm sm:grid-cols-3">
                {!lockedVesselId && (
                  <div>
                    <div className="text-xs text-gray-500">Vessel</div>
                    <div className="font-medium text-gray-900">
                      {lockedVessel
                        ? `${formatDoVesselId(lockedVessel.seq)} — ${lockedVessel.name}`
                        : "—"}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Importer</div>
                  <div className="font-medium text-gray-900">
                    {lockedImporter?.name ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cargo Type</div>
                  <div className="font-medium text-gray-900">
                    {lockedCargo?.name ?? "—"}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!lockedVesselId && (
                  <div>
                    <label
                      htmlFor="be-vessel"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Vessel<span className="text-red-500"> *</span>
                    </label>
                    <select
                      id="be-vessel"
                      value={vesselId}
                      onChange={(e) => changeVessel(e.target.value)}
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
                    htmlFor="be-importer"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Importer<span className="text-red-500"> *</span>
                  </label>
                  <select
                    id="be-importer"
                    value={importerId}
                    onChange={(e) => changeImporter(e.target.value)}
                    required
                    disabled={!vesselId}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                  >
                    <option value="" disabled>
                      {!vesselId
                        ? "Select a vessel first"
                        : importerOptions.length === 0
                          ? "No importers with unassigned BLs"
                          : "Select importer"}
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
                    htmlFor="be-cargo"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Cargo Type<span className="text-red-500"> *</span>
                  </label>
                  <select
                    id="be-cargo"
                    value={cargoTypeId}
                    onChange={(e) => changeCargo(e.target.value)}
                    required
                    disabled={!importerId}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                  >
                    <option value="" disabled>
                      {!importerId
                        ? "Select an importer first"
                        : cargoOptions.length === 0
                          ? "No cargo types with unassigned BLs"
                          : "Select cargo type"}
                    </option>
                    {cargoOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Select BLs */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Select BLs<span className="text-red-500"> *</span>
              </label>
              {!filtersChosen ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  {lockedVesselId
                    ? "Choose an importer and cargo type to see matching bills of lading."
                    : "Choose a vessel, importer and cargo type to see matching bills of lading."}
                </div>
              ) : pool.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  No unassigned bills of lading match this vessel, importer and
                  cargo type.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex w-full items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <span
                      role="checkbox"
                      aria-checked={
                        allSelected ? "true" : someSelected ? "mixed" : "false"
                      }
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        allSelected || someSelected
                          ? "border-[#0483ca] bg-[#0483ca]"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {allSelected ? (
                        <Check size={14} className="text-white" />
                      ) : someSelected ? (
                        <Minus size={14} className="text-white" />
                      ) : null}
                    </span>
                    Select all ({pool.length})
                  </button>
                  <div className="max-h-56 overflow-y-auto">
                    {pool.map((b) => {
                      const isSelected = selected.has(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggle(b.id)}
                          className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-gray-50"
                        >
                          <span
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`Select BL ${b.blNumber}`}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? "border-[#0483ca] bg-[#0483ca]"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <Check size={14} className="text-white" />
                            )}
                          </span>
                          <span className="flex-1 text-sm font-medium text-gray-900">
                            BL #{b.blNumber}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatQty(b.blQuantity)} MT
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {filtersChosen && pool.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {selectedInPool.length} BL
                  {selectedInPool.length === 1 ? "" : "s"} ·{" "}
                  {formatQty(selectedTotal)} MT selected
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-gray-100 p-6">
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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create BE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
