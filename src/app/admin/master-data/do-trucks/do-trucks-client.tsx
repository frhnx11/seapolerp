"use client";

import { Search, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import { formatDate } from "@/features/work-orders/work-order";

import { BackLink } from "../_components/back-link";

export type DoTruckMasterRow = {
  id: string;
  vehicleNo: string;
  createdYmd: string; // "YYYY-MM-DD"
};

const COLUMNS = ["Vehicle No", "Date Added"];

export function DoTrucksMasterClient({ rows }: { rows: DoTruckMasterRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.vehicleNo.toLowerCase().includes(q));
  }, [rows, search]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    search,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <BackLink />

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <Truck className="text-[#0483ca]" size={32} />
          DO Trucks
        </h1>
        <p className="mt-1 text-gray-500">
          Delivery-order trucks saved from Truck DOs — view only.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by vehicle no..."
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                      {r.vehicleNo}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                      {formatDate(r.createdYmd)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center"
                  >
                    <Truck size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {rows.length === 0
                        ? "No DO trucks yet"
                        : "No DO trucks found"}
                    </h3>
                    <p className="text-gray-500">
                      {rows.length === 0
                        ? "Trucks added from Truck DOs will appear here."
                        : "Try a different search."}
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
        noun="DO trucks"
        onLoadMore={loadMore}
      />
    </div>
  );
}
