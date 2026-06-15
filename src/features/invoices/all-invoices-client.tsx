"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import { formatInr, formatQty } from "@/core/format";
import { formatDate, formatWoNumber } from "@/features/work-orders/work-order";

import { formatInvoiceNo } from "./invoice-lib";

/** One row of the global invoices table. */
export type AllInvoiceRow = {
  id: string;
  seq: number;
  woSeq: number;
  date: string; // "YYYY-MM-DD"
  truckOwner: string;
  rate: number;
  totalQty: number;
  amount: number;
  discountPct: number;
  finalAmount: number;
  /** Invoiced trips — for VT#/vehicle search only. */
  trips: { vtNumber: string | null; vehicleNo: string }[];
};

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const COLUMNS = [
  "Invoice #",
  "Work Order",
  "Date",
  "Truck Owner",
  "Total Net Wt (MT)",
  "Rate (₹/MT)",
  "Amount",
  "Discount",
  "Final Amount",
  "View",
];

/** "YYYY-MM-DD" shifted by `delta` days (UTC math avoids timezone drift). */
function shiftDay(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function AllInvoicesClient({
  rows,
  date,
}: {
  rows: AllInvoiceRow[];
  /** Active day window "YYYY-MM-DD" (server-scoped; rows are only this day). */
  date: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // The day is the server-fetch window — change it via the URL.
  const changeDate = (d: string) =>
    router.replace(`${pathname}?date=${d}`, { scroll: false });

  const owners = useMemo(
    () =>
      [...new Set(rows.map((inv) => inv.truckOwner))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((inv) => {
      if (ownerFilter !== "ALL" && inv.truckOwner !== ownerFilter) return false;
      if (!q) return true;
      return (
        formatInvoiceNo(inv.seq).toLowerCase().includes(q) ||
        formatWoNumber(inv.woSeq).toLowerCase().includes(q) ||
        inv.trips.some(
          (t) =>
            (t.vtNumber?.toLowerCase().includes(q) ?? false) ||
            t.vehicleNo.toLowerCase().includes(q),
        )
      );
    });
  }, [rows, ownerFilter, search]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${date}|${ownerFilter}|${search}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FileText className="text-amber-600" size={32} />
            Invoices
          </h1>
          <p className="mt-1 text-gray-500">
            All transport invoices across work orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, WO #, VT# or vehicle no..."
              className="w-full rounded-xl border border-gray-200 py-2 pr-8 pl-9 text-sm transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
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
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filter by truck owner"
            className={selectClass}
          >
            <option value="ALL">All Truck Owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {/* Day navigator — drives the server fetch window. */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeDate(shiftDay(date, -1))}
              aria-label="Previous day"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) changeDate(e.target.value);
              }}
              aria-label="Invoice date"
              className={selectClass}
            />
            <button
              onClick={() => changeDate(shiftDay(date, 1))}
              aria-label="Next day"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
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
                visible.map((inv) => (
                  <tr key={inv.id} className="align-top">
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatInvoiceNo(inv.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-medium whitespace-nowrap text-gray-900">
                      {formatWoNumber(inv.woSeq)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {inv.truckOwner}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {formatQty(inv.totalQty)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {formatQty(inv.rate)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {formatInr(inv.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {inv.discountPct > 0
                        ? `${formatQty(inv.discountPct)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatInr(inv.finalAmount)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <a
                          href={`/print/invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="View invoice"
                          title="View / print"
                          className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center"
                  >
                    <FileText
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No invoices on {formatDate(date)}
                    </h3>
                    <p className="text-gray-500">
                      Try another day, search or filter.
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
        noun="invoices"
        onLoadMore={loadMore}
      />
    </div>
  );
}
