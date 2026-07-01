"use client";

import { Ship, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator, monthLabel } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";
import { formatVesselId } from "@/app/admin/master-data/vessels/vessel";
import { formatDate, formatWoNumber } from "@/features/work-orders/work-order";

/** One row of the vessel progress tracker. */
export type VesselTrackRow = {
  id: string;
  seq: number;
  name: string;
  createdYmd: string; // "YYYY-MM-DD"
  totalQuantity: number;
  allocatedWo: number;
  delivered: number;
  balance: number; // total − delivered
  workOrders: { id: string; seq: number }[];
};

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const COLUMNS = [
  "Vessel No",
  "Vessel Name",
  "Date Created",
  "Total Quantity",
  "Allocated WO",
  "Delivered Quantity",
  "Balance Quantity",
  "Work Orders",
  "Status",
];

/** A vessel is complete only once its full BL has been delivered. */
function isCompleted(row: VesselTrackRow): boolean {
  return row.balance <= 1e-9;
}

export function VesselsClient({
  rows,
  month,
}: {
  rows: VesselTrackRow[];
  /** Active month window "YYYY-MM" (server-scoped; rows are only this month). */
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [woPopup, setWoPopup] = useState<VesselTrackRow | null>(null);

  // The month is the server-fetch window — change it via the URL.
  const changeMonth = (m: string) =>
    router.replace(`${pathname}?month=${m}`, { scroll: false });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "ALL") {
        const status = isCompleted(r) ? "COMPLETED" : "PENDING";
        if (status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        formatVesselId(r.seq).toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${search}|${statusFilter}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Ship className="text-[#0483ca]" size={32} />
            Vessels
          </h1>
          <p className="mt-1 text-gray-500">
            Track each vessel&apos;s delivery progress
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vessel no or name..."
              className="w-full rounded-xl border border-gray-200 py-2 pr-8 pl-3 text-sm transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <MonthNavigator month={month} onChange={changeMonth} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length > 0 ? (
                visible.map((r) => {
                  const completed = isCompleted(r);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                        {formatVesselId(r.seq)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm font-medium text-gray-900">
                        {r.name}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                        {formatDate(r.createdYmd)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                        {formatQty(r.totalQuantity)} MT
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                        {formatQty(r.allocatedWo)} MT
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                        {formatQty(r.delivered)} MT
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm font-medium whitespace-nowrap text-gray-900">
                        {formatQty(r.balance)} MT
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap">
                        {r.workOrders.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setWoPopup(r)}
                            className="rounded-lg px-2 py-1 font-semibold text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            {r.workOrders.length}
                          </button>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                            completed
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {completed ? "Completed" : "Pending"}
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
                    <Ship size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No vessels in {monthLabel(month)}
                    </h3>
                    <p className="text-gray-500">
                      Try another month, search or filter.
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
        noun="vessels"
        onLoadMore={loadMore}
      />

      {woPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Work Orders — {woPopup.name}
              </h2>
              <button
                onClick={() => setWoPopup(null)}
                aria-label="Close"
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {woPopup.workOrders.map((w) => (
                <Link
                  key={w.id}
                  href={`/admin/work-orders/${w.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#0483ca] transition-colors hover:bg-blue-50"
                >
                  {formatWoNumber(w.seq)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
