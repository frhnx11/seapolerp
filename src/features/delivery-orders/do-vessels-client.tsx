"use client";

import { ArrowLeft, Pencil, Plus, Search, Ship, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import { DeleteDoVesselModal } from "./delete-do-vessel-modal";
import {
  formatDoVesselId,
  isDoVesselCompleted,
  type DoVesselRow,
} from "./do-vessel";
import { DoVesselFormModal } from "./do-vessel-form-modal";

const BASE_COLUMNS = [
  "Vessel No",
  "Vessel Name",
  "Date Created",
  "Total Quantity (MT)",
  "Allocated DO (MT)",
  "Delivered Quantity (MT)",
  "Balance Quantity (MT)",
  "Status",
];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

export function DoVesselsClient({
  vessels,
  basePath,
  canManage,
  linkable = false,
  linkSuffix = "",
  month,
}: {
  vessels: DoVesselRow[];
  basePath: string;
  canManage: boolean;
  /** When true, each row opens the vessel's per-vessel view. */
  linkable?: boolean;
  /** Appended to `${basePath}/vessels/${id}` for the row link (e.g. "/orders"
   * to jump straight into a vessel's delivery orders). */
  linkSuffix?: string;
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const columns = canManage ? [...BASE_COLUMNS, "Actions"] : BASE_COLUMNS;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DoVesselRow | null>(null);
  const [deleting, setDeleting] = useState<DoVesselRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const refresh = () => router.refresh();

  // The month is the server-fetch window — change it via the URL.
  const changeMonth = (m: string) =>
    router.replace(`${pathname}?month=${m}`, { scroll: false });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vessels.filter((v) => {
      if (statusFilter !== "ALL") {
        const status = isDoVesselCompleted(v) ? "COMPLETED" : "PENDING";
        if (status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        formatDoVesselId(v.seq).toLowerCase().includes(q)
      );
    });
  }, [vessels, search, statusFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${search}|${statusFilter}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to Delivery Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Ship className="text-[#0483ca]" size={32} />
            Vessels
          </h1>
          <p className="mt-1 text-gray-500">
            Delivery-order vessels and their total quantities
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={20} />
            <span>Create New Vessel</span>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vessel name or no..."
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {columns.map((h) => (
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
                visible.map((v) => (
                  <tr
                    key={v.id}
                    onClick={
                      linkable
                        ? () =>
                            router.push(
                              `${basePath}/vessels/${v.id}${linkSuffix}`,
                            )
                        : undefined
                    }
                    className={`transition-colors hover:bg-gray-50 ${
                      linkable ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatDoVesselId(v.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                      {v.name}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                      {formatDate(v.createdYmd)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(v.totalQuantity)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(v.allocatedDo)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(v.delivered)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium whitespace-nowrap text-gray-900">
                      {formatQty(v.totalQuantity - v.delivered)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {(() => {
                        const completed = isDoVesselCompleted(v);
                        return (
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                              completed
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {completed ? "Completed" : "Pending"}
                          </span>
                        );
                      })()}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(v);
                            }}
                            aria-label="Edit vessel"
                            className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(v);
                            }}
                            aria-label="Delete vessel"
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-16 text-center"
                  >
                    <Ship size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {vessels.length === 0
                        ? "No vessels yet"
                        : "No vessels found"}
                    </h3>
                    <p className="text-gray-500">
                      {vessels.length === 0
                        ? "Create your first vessel to get started."
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
        noun="vessels"
        onLoadMore={loadMore}
      />

      {showAdd && (
        <DoVesselFormModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <DoVesselFormModal
          vessel={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteDoVesselModal
          vessel={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
