"use client";

import { Check, Search, Truck as TruckIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/components/use-pagination";
import {
  type DisplayStatus,
  displayStatus,
  formatDate,
  type Truck,
  TRUCK_STATUS_PILL,
  WHEELS,
  wheelsLabel,
} from "@/features/trucks/truck";

import { setAllottedTrucks } from "./allot-actions";

const COLUMNS = [
  "", // checkbox
  "Vehicle No",
  "Type",
  "Owner",
  "RC Validity",
  "Insurance Validity",
  "FC Validity",
  "Status",
];

const STATUS_ORDER: DisplayStatus[] = ["ACTIVE", "EXPIRED", "BLOCKED"];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function AllotTrucksModal({
  workOrderId,
  trucks,
  initialSelectedIds,
  todayIso,
  onClose,
  onSaved,
}: {
  workOrderId: string;
  trucks: Truck[];
  initialSelectedIds: string[];
  todayIso: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = useMemo(
    () => new Set(initialSelectedIds),
    [initialSelectedIds],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = !sameSet(selected, initial);

  /** Owners that have at least one truck in the list, for the filter. */
  const owners = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of trucks) byId.set(t.ownerId, t.owner);
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trucks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = trucks.filter((t) => {
      if (ownerFilter !== "ALL" && t.ownerId !== ownerFilter) return false;
      if (typeFilter !== "ALL" && String(t.wheels) !== typeFilter) return false;
      if (
        statusFilter !== "ALL" &&
        displayStatus(t, todayIso) !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        t.vehicleNo.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q)
      );
    });
    // Blocked trucks can't be allotted — sink them to the bottom (stable sort
    // keeps the vehicle-no order within each group).
    return matches.sort((a, b) => {
      const aBlocked = displayStatus(a, todayIso) === "BLOCKED" ? 1 : 0;
      const bBlocked = displayStatus(b, todayIso) === "BLOCKED" ? 1 : 0;
      return aBlocked - bBlocked;
    });
  }, [trucks, search, ownerFilter, typeFilter, statusFilter, todayIso]);

  const { visible, hasMore, loadMore } = usePagination(
    filtered,
    `${search}|${ownerFilter}|${typeFilter}|${statusFilter}`,
  );

  function toggle(truck: Truck) {
    const isSelected = selected.has(truck.id);
    const blocked = displayStatus(truck, todayIso) === "BLOCKED";
    // Blocked trucks can be un-ticked (removal) but never newly ticked.
    if (blocked && !isSelected) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(truck.id);
      else next.add(truck.id);
      return next;
    });
  }

  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  async function handleSave() {
    setSaving(true);
    const result = await setAllottedTrucks(workOrderId, [...selected]);
    setSaving(false);
    if (result.ok) {
      toast.success("Allotted trucks updated");
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to allot trucks");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Allot Trucks</h2>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle no or owner..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pr-4 pl-11 transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filter by owner"
            className={selectClass}
          >
            <option value="ALL">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
            className={selectClass}
          >
            <option value="ALL">All Types</option>
            {WHEELS.map((w) => (
              <option key={w} value={String(w)}>
                {w} wheels
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="ALL">All Statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TRUCK_STATUS_PILL[s].label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLUMNS.map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={`px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase ${
                      i === 0 ? "w-12" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((t) => {
                  const status = displayStatus(t, todayIso);
                  const pill = TRUCK_STATUS_PILL[status];
                  const isSelected = selected.has(t.id);
                  const blocked = status === "BLOCKED";
                  const selectable = !blocked || isSelected;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => toggle(t)}
                      aria-disabled={!selectable}
                      className={`transition-colors ${
                        selectable
                          ? "cursor-pointer hover:bg-gray-50"
                          : "cursor-not-allowed opacity-50"
                      } ${isSelected ? "bg-blue-50/50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${t.vehicleNo}`}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-[#0483ca] bg-[#0483ca]"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <Check size={14} className="text-white" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {t.vehicleNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {wheelsLabel(t.wheels)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.owner}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(t.rcValidity)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(t.insuranceValidity)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(t.fcValidity)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center"
                  >
                    <TruckIcon
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No trucks found
                    </h3>
                    <p className="text-gray-500">
                      Try a different search or filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                className="rounded-xl border border-gray-200 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 p-6">
          <p className="text-sm text-gray-500">
            {selected.size} truck{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={requestClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Discard confirmation */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              Discard changes?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your truck selections will be lost and the allotment will stay as
              it was.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
