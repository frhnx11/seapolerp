"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { formatQty } from "@/core/format";

import { createWorkOrder, deleteWorkOrder, updateWorkOrder } from "./actions";
import {
  formatWoNumber,
  type Option,
  type VesselOption,
  type WorkOrderRow,
} from "./work-order";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca] disabled:bg-gray-50 disabled:text-gray-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        <span className="text-red-500"> *</span>
      </label>
      {children}
    </div>
  );
}

export function WorkOrderFormModal({
  workOrder,
  suppliers,
  parties,
  vessels,
  cargoTypes,
  onClose,
  onSaved,
  onDeleted,
}: {
  workOrder?: WorkOrderRow;
  suppliers: Option[];
  parties: Option[];
  vessels: VesselOption[];
  cargoTypes: Option[];
  onClose: () => void;
  onSaved: () => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
}) {
  const isEdit = Boolean(workOrder);
  const [date, setDate] = useState(workOrder?.date ?? "");
  const [vesselId, setVesselId] = useState(workOrder?.vesselId ?? "");
  const [cargoTypeId, setCargoTypeId] = useState(workOrder?.cargoTypeId ?? "");
  const [supplierId, setSupplierId] = useState(workOrder?.supplierId ?? "");
  const [partyId, setPartyId] = useState(workOrder?.partyId ?? "");
  const [doQuantity, setDoQuantity] = useState(
    workOrder ? String(workOrder.doQuantity) : "",
  );
  const [bePermissionNo, setBePermissionNo] = useState(
    workOrder?.bePermissionNo ?? "",
  );
  const [eaIaNo, setEaIaNo] = useState(workOrder?.eaIaNo ?? "");
  const [eaIaDate, setEaIaDate] = useState(workOrder?.eaIaDate ?? "");
  const [sbBeNo, setSbBeNo] = useState(workOrder?.sbBeNo ?? "");
  const [sbBeDate, setSbBeDate] = useState(workOrder?.sbBeDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = isEdit && workOrder && workOrder.truckOrderCount === 0;
  // Trips and invoices print these references — once a trip exists they lock
  // (mirrors the server-side guard in updateWorkOrder).
  const refsLocked = Boolean(
    isEdit && workOrder && workOrder.truckOrderCount > 0,
  );

  async function handleDelete() {
    if (!workOrder) return;
    setDeleting(true);
    const result = await deleteWorkOrder(workOrder.id);
    setDeleting(false);
    if (result.ok) {
      toast.success("Work order deleted");
      onDeleted?.();
    } else {
      setConfirmingDelete(false);
      setError(result.error ?? "Failed to delete work order");
    }
  }

  // How much of the selected vessel's BL this WO may take: BL minus what other
  // work orders hold. When editing on the same vessel, this WO's own current DO
  // is part of "allocated", so add it back.
  const vessel = vessels.find((v) => v.id === vesselId);
  const ownDo =
    isEdit && workOrder && workOrder.vesselId === vesselId
      ? workOrder.doQuantity
      : 0;
  const available = vessel
    ? vessel.blQuantity - vessel.allocatedDo + ownDo
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!date) return setError("Date is required");
    if (!vesselId) return setError("Vessel is required");
    if (!cargoTypeId) return setError("Cargo type is required");
    if (!supplierId) return setError("Supplier is required");
    if (!partyId) return setError("Party is required");
    const dq = Number(doQuantity);
    if (!doQuantity || dq <= 0) {
      return setError("Enter a DO quantity greater than 0");
    }
    if (isEdit && workOrder && dq < workOrder.delivered) {
      return setError(
        `DO quantity can't be less than the delivered amount (${formatQty(workOrder.delivered)} MT).`,
      );
    }
    if (available !== null && dq > available) {
      return setError(
        `DO quantity exceeds the vessel's availability — only ${formatQty(Math.max(available, 0))} MT of its BL is unallocated.`,
      );
    }

    const input = {
      date,
      vesselId,
      cargoTypeId,
      supplierId,
      partyId,
      doQuantity: dq,
      bePermissionNo,
      eaIaNo,
      eaIaDate,
      sbBeNo,
      sbBeDate,
    };

    setLoading(true);
    const result =
      isEdit && workOrder
        ? await updateWorkOrder(workOrder.id, input)
        : await createWorkOrder(input);
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Work order updated" : "Work order created");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save work order");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Work Order" : "Add New Work Order"}
          </h2>
          <div className="flex items-center gap-1">
            {isEdit && (
              <button
                type="button"
                onClick={() => canDelete && setConfirmingDelete(true)}
                disabled={!canDelete}
                title={
                  canDelete
                    ? "Delete this work order"
                    : "Truck orders exist — this work order can no longer be deleted"
                }
                aria-label="Delete work order"
                className={`rounded-lg p-2 transition-colors ${
                  canDelete
                    ? "text-red-600 hover:bg-red-50"
                    : "cursor-not-allowed text-gray-300"
                }`}
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            WO#:{" "}
            <span className="font-semibold text-gray-900">
              {workOrder
                ? formatWoNumber(workOrder.seq)
                : "Auto-assigned on save"}
            </span>
          </div>

          {refsLocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This work order has truck orders — its vessel, cargo type,
              supplier and party can no longer be changed.
            </div>
          )}

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Vessel">
            <select
              value={vesselId}
              onChange={(e) => setVesselId(e.target.value)}
              required
              disabled={refsLocked}
              className={inputClass}
            >
              <option value="" disabled>
                Select vessel
              </option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cargo Type">
            <select
              value={cargoTypeId}
              onChange={(e) => setCargoTypeId(e.target.value)}
              required
              disabled={refsLocked}
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
          </Field>

          <Field label="Supplier">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              disabled={refsLocked}
              className={inputClass}
            >
              <option value="" disabled>
                Select supplier
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Party">
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              required
              disabled={refsLocked}
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
          </Field>

          <Field label="DO Quantity (MT)">
            <input
              type="number"
              min="0"
              step="0.001"
              value={doQuantity}
              onChange={(e) => setDoQuantity(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. 1500"
            />
            {vessel && available !== null && (
              <p className="mt-1 text-xs text-gray-500">
                Available on {vessel.name}:{" "}
                <span className="font-medium text-gray-700">
                  {formatQty(Math.max(available, 0))} MT
                </span>{" "}
                of {formatQty(vessel.blQuantity)} MT BL
              </p>
            )}
          </Field>

          {/* Customs / regulatory references (consignment-level, optional) */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-sm font-semibold text-gray-700">
              Customs References{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                B.E. Permission No
              </label>
              <input
                value={bePermissionNo}
                onChange={(e) => setBePermissionNo(e.target.value)}
                className={inputClass}
                placeholder="e.g. IA.0289/I/1&2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  E.A./I.A. No
                </label>
                <input
                  value={eaIaNo}
                  onChange={(e) => setEaIaNo(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 261"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  E.A./I.A. Date
                </label>
                <input
                  type="date"
                  value={eaIaDate}
                  onChange={(e) => setEaIaDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  S.B./B.E. No
                </label>
                <input
                  value={sbBeNo}
                  onChange={(e) => setSbBeNo(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  S.B./B.E. Date
                </label>
                <input
                  type="date"
                  value={sbBeDate}
                  onChange={(e) => setSbBeDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
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
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>

      {confirmingDelete && workOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">
              Delete work order
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Delete{" "}
              <span className="font-semibold text-gray-900">
                {formatWoNumber(workOrder.seq)}
              </span>
              ? Its truck allotments will be removed and its DO quantity will
              return to{" "}
              <span className="font-semibold text-gray-900">
                {workOrder.vesselName}
              </span>
              . This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
