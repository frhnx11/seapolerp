"use client";

import { Plus, Search, Truck as TruckIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import {
  displayStatus,
  type Truck,
  TRUCK_STATUS_PILL,
  WHEELS,
  wheelsLabel,
} from "@/features/trucks/truck";

import { setAllottedTrucks } from "./actions";
import { AllotTrucksModal } from "./allot-trucks-modal";

const COLUMNS = ["Vehicle No", "Type", "Owner", "Status"];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const pillBase =
  "inline-flex rounded-full border px-3 py-1 text-xs font-medium";

/**
 * The global allotted-trucks pool. Admin gets an "Allot Trucks" button (the shared
 * truck-picker modal); the read-only portals just see the list. Status is the
 * truck's master status (Active / Expired / Blocked) — there's no per-pool block,
 * since the pool isn't tied to a work order.
 */
export function AllottedTrucksClient({
  allottedTrucks,
  allTrucks,
  todayIso,
  readOnly = false,
}: {
  allottedTrucks: Truck[];
  /** The full fleet, for the allot modal. Empty on read-only portals. */
  allTrucks: Truck[];
  todayIso: string;
  /** View-only portals: no "Allot Trucks" button. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [showAllot, setShowAllot] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");

  const owners = useMemo(
    () =>
      [...new Set(allottedTrucks.map((t) => t.owner))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [allottedTrucks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allottedTrucks.filter((t) => {
      if (typeFilter !== "ALL" && String(t.wheels) !== typeFilter) return false;
      if (ownerFilter !== "ALL" && t.owner !== ownerFilter) return false;
      if (!q) return true;
      return (
        t.vehicleNo.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q)
      );
    });
  }, [allottedTrucks, search, typeFilter, ownerFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${search}|${typeFilter}|${ownerFilter}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
            <TruckIcon className="text-[#0483ca]" size={26} />
            Allotted Trucks
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Trucks available to deliver work orders
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAllot(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={20} />
            <span>Allot Trucks</span>
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vehicle no or owner..."
            className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-12 transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
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
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filter by owner"
          className={selectClass}
        >
          <option value="ALL">All Owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((t) => {
                  const pill = TRUCK_STATUS_PILL[displayStatus(t, todayIso)];
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {t.vehicleNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {wheelsLabel(t.wheels)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {t.owner}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${pillBase} ${pill.className}`}>
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
                      {allottedTrucks.length === 0
                        ? "No trucks allotted yet"
                        : "No trucks found"}
                    </h3>
                    <p className="text-gray-500">
                      {allottedTrucks.length === 0
                        ? readOnly
                          ? "No trucks have been allotted yet."
                          : 'Use "Allot Trucks" to add trucks to the pool.'
                        : "Try a different search or filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LoadMoreFooter
        shown={shown}
        total={total}
        hasMore={hasMore}
        noun="trucks"
        onLoadMore={loadMore}
      />

      {!readOnly && showAllot && (
        <AllotTrucksModal
          trucks={allTrucks}
          initialSelectedIds={allottedTrucks.map((t) => t.id)}
          todayIso={todayIso}
          onSave={(ids) => setAllottedTrucks(ids)}
          onClose={() => setShowAllot(false)}
          onSaved={() => {
            setShowAllot(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
