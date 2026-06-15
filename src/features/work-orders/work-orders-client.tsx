"use client";

import { ClipboardList, Pencil, Plus, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator, monthLabel } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";

import {
  formatDate,
  formatQty,
  formatWoNumber,
  type Option,
  STATUS_META,
  type VesselOption,
  type WorkOrderRow,
  type WorkOrderStatus,
  workOrderStatus,
} from "./work-order";
import { WorkOrderFormModal } from "./work-order-form-modal";

const COLUMNS = [
  "WO#",
  "Date",
  "Vessel",
  "Cargo Type",
  "Supplier",
  "Party",
  "DO Qty (MT)",
  "Delivered (MT)",
  "Balance (MT)",
  "Status",
  "Actions",
];

const STATUS_ORDER: WorkOrderStatus[] = ["PENDING", "PARTIAL", "COMPLETED"];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

export function WorkOrdersClient({
  rows,
  suppliers,
  parties,
  vessels,
  cargoTypes,
  basePath,
  readOnly = false,
  month,
}: {
  rows: WorkOrderRow[];
  suppliers: Option[];
  parties: Option[];
  vessels: VesselOption[];
  cargoTypes: Option[];
  /** The role's work-orders route, e.g. "/admin/work-orders". */
  basePath: string;
  /** View-only portals: no create/edit and no Actions column. */
  readOnly?: boolean;
  /** Active month window "YYYY-MM" (server-scoped; rows are only this month). */
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorkOrderRow | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [partyFilter, setPartyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const refresh = () => router.refresh();
  // The month is the server-fetch window — change it via the URL so only that
  // month's rows are queried.
  const changeMonth = (m: string) =>
    router.replace(`${pathname}?month=${m}`, { scroll: false });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (supplierFilter !== "ALL" && r.supplierId !== supplierFilter) {
        return false;
      }
      if (partyFilter !== "ALL" && r.partyId !== partyFilter) return false;
      if (
        statusFilter !== "ALL" &&
        workOrderStatus(r.doQuantity, r.delivered) !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        formatWoNumber(r.seq).toLowerCase().includes(q) ||
        formatDate(r.date).toLowerCase().includes(q) ||
        r.vesselName.toLowerCase().includes(q) ||
        r.cargoTypeName.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, supplierFilter, partyFilter, statusFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${search}|${supplierFilter}|${partyFilter}|${statusFilter}`,
  );
  const columns = readOnly ? COLUMNS.filter((c) => c !== "Actions") : COLUMNS;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <ClipboardList className="text-[#0483ca]" size={32} />
            Work Orders
          </h1>
          <p className="mt-1 text-gray-500">
            {readOnly
              ? "View delivery work orders"
              : "Manage delivery work orders"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator month={month} onChange={changeMonth} />
          {!readOnly && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
            >
              <Plus size={20} />
              <span>Add New WO</span>
            </button>
          )}
        </div>
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
            placeholder="Search by WO#, vessel, supplier or party..."
            className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-12 transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Filter by supplier"
          className={selectClass}
        >
          <option value="ALL">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          aria-label="Filter by party"
          className={selectClass}
        >
          <option value="ALL">All Parties</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
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
              {visible.length > 0 ? (
                visible.map((r) => {
                  const pill =
                    STATUS_META[workOrderStatus(r.doQuantity, r.delivered)];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`${basePath}/${r.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                        {formatWoNumber(r.seq)}
                      </td>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {r.vesselName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {r.cargoTypeName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {r.supplierName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {r.partyName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {formatQty(r.doQuantity)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {formatQty(r.delivered)}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                        {formatQty(r.balance)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-3.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                            }}
                            aria-label="Edit work order"
                            className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-16 text-center"
                  >
                    <ClipboardList
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No work orders in {monthLabel(month)}
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
        noun="work orders"
        onLoadMore={loadMore}
      />

      {!readOnly && showAdd && (
        <WorkOrderFormModal
          suppliers={suppliers}
          parties={parties}
          vessels={vessels}
          cargoTypes={cargoTypes}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {!readOnly && editing && (
        <WorkOrderFormModal
          workOrder={editing}
          suppliers={suppliers}
          parties={parties}
          vessels={vessels}
          cargoTypes={cargoTypes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          onDeleted={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
