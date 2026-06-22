"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/searchable-select";

import {
  createTruckOrder,
  deleteTruckOrder,
  updateTare,
} from "./truck-order-actions";
import {
  type EditLock,
  formatTruckOrderNo,
  type TruckOrderRow,
  type TruckOption,
} from "./truck-order-lib";
import { LastUpdatedLine } from "./truck-order-stage-modals";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca] disabled:bg-gray-50 disabled:text-gray-500";

/**
 * Stage 1 popup. Create mode: truck + tare → creates the trip and closes.
 * Edit/view mode (opened from the Tare cell): edit the tare while the trip is
 * open, view-only once completed; saving closes the popup.
 */
export function CreateTruckOrderModal({
  trucks,
  trip,
  lock = { canEdit: true, reason: null },
  onClose,
  onSaved,
  onDeleted,
}: {
  trucks: TruckOption[];
  /** When set, the modal edits/views this trip's tare instead of creating. */
  trip?: TruckOrderRow;
  /** Tare edit window — ignored in create mode (always editable). */
  lock?: EditLock;
  onClose: () => void;
  onSaved: () => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
}) {
  const isEdit = Boolean(trip);
  const locked = isEdit && !lock.canEdit;
  const [truckId, setTruckId] = useState("");
  const [tareWeight, setTareWeight] = useState(
    trip ? String(trip.tareWeight) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Save is enabled only once the tare differs from what's persisted.
  const dirty = isEdit && !locked && tareWeight !== String(trip!.tareWeight);
  // A trip is deletable only while nothing beyond the tare has happened.
  const canDelete = isEdit && trip?.status === "TARE_RECORDED";

  async function handleDelete() {
    if (!trip) return;
    setDeleting(true);
    const result = await deleteTruckOrder(trip.id);
    setDeleting(false);
    if (result.ok) {
      toast.success(`${formatTruckOrderNo(trip.seq)} deleted`);
      onDeleted?.();
    } else {
      setConfirmingDelete(false);
      setError(result.error ?? "Failed to delete truck order");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isEdit && !truckId) return setError("Pick a truck from the list");
    if (!tareWeight || Number(tareWeight) <= 0) {
      return setError("Enter a tare weight greater than 0");
    }

    setLoading(true);
    if (isEdit && trip) {
      const result = await updateTare(trip.id, {
        tareWeight: Number(tareWeight),
      });
      setLoading(false);
      if (result.ok) {
        toast.success("Tare updated");
        onSaved();
      } else {
        setError(result.error ?? "Failed to save");
      }
      return;
    }

    const result = await createTruckOrder({
      truckId,
      tareWeight: Number(tareWeight),
    });
    setLoading(false);
    if (result.ok) {
      toast.success(`${formatTruckOrderNo(result.seq)} created`);
      onSaved();
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit
              ? locked
                ? "Tare Weight"
                : "Edit Tare Weight"
              : "Create New Truck Order"}
          </h2>
          <div className="flex items-center gap-1">
            {isEdit && (
              <button
                type="button"
                onClick={() => canDelete && setConfirmingDelete(true)}
                disabled={!canDelete}
                title={
                  canDelete
                    ? "Delete this truck order"
                    : "The trip has a loading slip or weighment recorded — it can no longer be deleted"
                }
                aria-label="Delete truck order"
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
            TO#:{" "}
            <span className="font-semibold text-gray-900">
              {trip ? formatTruckOrderNo(trip.seq) : "Auto-assigned on save"}
            </span>
          </div>

          {isEdit && trip ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Truck
              </label>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700">
                {trip.vehicleNo}
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="vt-truck"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Truck<span className="text-red-500"> *</span>
              </label>
              <SearchableSelect
                id="vt-truck"
                options={trucks}
                value={truckId || null}
                onChange={(id) => setTruckId(id ?? "")}
                getKey={(t) => t.id}
                getLabel={(t) => t.vehicleNo}
                getSearchText={(t) => t.vehicleNo}
                placeholder="Search allotted trucks..."
                emptyText="No allotted truck matches your search."
              />
              <p className="mt-1 text-xs text-gray-500">
                Only trucks in the allotted pool can start a trip.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="vt-tare"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Tare Weight (MT)<span className="text-red-500"> *</span>
            </label>
            <input
              id="vt-tare"
              type="number"
              min="0"
              step="0.001"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              required
              disabled={locked}
              className={inputClass}
              placeholder="e.g. 14.620"
            />
            {locked && lock.reason && (
              <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
            )}
          </div>

          {isEdit && trip && (
            <LastUpdatedLine
              by={trip.tareByName}
              at={trip.tareAt}
              firstBy={trip.tareFirstByName}
              firstAt={trip.createdAt}
            />
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {isEdit ? (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading || !dirty}
                className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                  dirty
                    ? "bg-[#0483ca] text-white hover:bg-[#0372b0] disabled:opacity-50"
                    : "cursor-default bg-gray-200 text-gray-500"
                }`}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
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
                {loading ? "Creating..." : "Create Truck Order"}
              </button>
            </div>
          )}
        </form>
      </div>

      {confirmingDelete && trip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">
              Delete truck order
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Delete{" "}
              <span className="font-semibold text-gray-900">
                {formatTruckOrderNo(trip.seq)}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-gray-900">
                {trip.vehicleNo}
              </span>
              ? This cannot be undone.
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
