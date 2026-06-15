"use client";

import { Plus, Search, Truck as TruckIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import {
  displayStatus,
  type Truck,
  TRUCK_STATUS_PILL,
  WHEELS,
  wheelsLabel,
} from "@/features/trucks/truck";

import { setWorkOrderTruckBlocked } from "./allot-actions";
import { AllotTrucksModal } from "./allot-trucks-modal";

/** An allotted truck plus its work-order-specific block flag. */
type AllottedTruckRow = Truck & { woBlocked: boolean };

const COLUMNS = ["Vehicle No", "Type", "Owner", "Status"];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const pillBase =
  "inline-flex rounded-full border px-3 py-1 text-xs font-medium";
const WO_BLOCKED_PILL = "border-red-200 bg-red-50 text-red-700";

/**
 * Status pill. Universal block (from the trucks master) is static here; an
 * active/expired truck is a button to block it for this work order, and a
 * WO-blocked truck is a button to unblock it. Read-only portals show all
 * states without the buttons.
 */
function StatusCell({
  truck,
  todayIso,
  readOnly,
  onBlock,
  onUnblock,
}: {
  truck: AllottedTruckRow;
  todayIso: string;
  readOnly: boolean;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const universal = displayStatus(truck, todayIso);
  if (universal === "BLOCKED") {
    const pill = TRUCK_STATUS_PILL.BLOCKED;
    return (
      <span
        title="Blocked in the trucks master"
        className={`${pillBase} ${pill.className}`}
      >
        {pill.label}
      </span>
    );
  }
  if (truck.woBlocked) {
    return readOnly ? (
      <span className={`${pillBase} ${WO_BLOCKED_PILL}`}>Blocked (WO)</span>
    ) : (
      <button
        type="button"
        onClick={onUnblock}
        title="Unblock for this work order"
        className={`${pillBase} ${WO_BLOCKED_PILL} transition-colors hover:bg-red-100`}
      >
        Blocked (WO)
      </button>
    );
  }
  const pill = TRUCK_STATUS_PILL[universal];
  return readOnly ? (
    <span className={`${pillBase} ${pill.className}`}>{pill.label}</span>
  ) : (
    <button
      type="button"
      onClick={onBlock}
      title="Block for this work order"
      className={`${pillBase} ${pill.className} transition-colors hover:opacity-80`}
    >
      {pill.label}
    </button>
  );
}

export function AllottedTrucksClient({
  workOrderId,
  allottedTrucks,
  allTrucks,
  todayIso,
  readOnly = false,
}: {
  workOrderId: string;
  allottedTrucks: AllottedTruckRow[];
  allTrucks: Truck[];
  todayIso: string;
  /** View-only portals: no "Allot Trucks" button and no block toggle. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [showAllot, setShowAllot] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  // The truck whose WO-block we're confirming (block=true) or unblocking (false).
  const [blockTarget, setBlockTarget] = useState<{
    truck: AllottedTruckRow;
    block: boolean;
  } | null>(null);
  const [blocking, setBlocking] = useState(false);

  async function applyBlock() {
    if (!blockTarget) return;
    setBlocking(true);
    const result = await setWorkOrderTruckBlocked(
      workOrderId,
      blockTarget.truck.id,
      blockTarget.block,
    );
    setBlocking(false);
    if (result.ok) {
      toast.success(
        blockTarget.block
          ? "Truck blocked for this work order"
          : "Truck unblocked for this work order",
      );
      setBlockTarget(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update block status");
    }
  }

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
            Only these trucks can deliver this work order&apos;s goods
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
                visible.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-gray-50">
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
                      <StatusCell
                        truck={t}
                        todayIso={todayIso}
                        readOnly={readOnly}
                        onBlock={() =>
                          setBlockTarget({ truck: t, block: true })
                        }
                        onUnblock={() =>
                          setBlockTarget({ truck: t, block: false })
                        }
                      />
                    </td>
                  </tr>
                ))
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
                        ? 'Use "Allot Trucks" to assign trucks to this work order.'
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
          workOrderId={workOrderId}
          trucks={allTrucks}
          initialSelectedIds={allottedTrucks.map((t) => t.id)}
          todayIso={todayIso}
          onClose={() => setShowAllot(false)}
          onSaved={() => {
            setShowAllot(false);
            router.refresh();
          }}
        />
      )}

      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">
              {blockTarget.block
                ? "Block truck for this work order"
                : "Unblock truck for this work order"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {blockTarget.block ? (
                <>
                  Block{" "}
                  <span className="font-semibold text-gray-900">
                    {blockTarget.truck.vehicleNo}
                  </span>{" "}
                  for this work order? It won&apos;t be available for new truck
                  orders here. Existing trips are unaffected, and it stays
                  available to other work orders.
                </>
              ) : (
                <>
                  Allow{" "}
                  <span className="font-semibold text-gray-900">
                    {blockTarget.truck.vehicleNo}
                  </span>{" "}
                  to start new truck orders under this work order again?
                </>
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setBlockTarget(null)}
                disabled={blocking}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={applyBlock}
                disabled={blocking}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  blockTarget.block
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#0483ca] hover:bg-[#0372b0]"
                }`}
              >
                {blocking
                  ? "Saving..."
                  : blockTarget.block
                    ? "Block"
                    : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
