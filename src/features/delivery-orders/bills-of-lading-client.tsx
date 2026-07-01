"use client";

import {
  ArrowLeft,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import {
  type BillOfLadingRow,
  type BlVesselOption,
  type Option,
} from "./bill-of-lading";
import { BillOfLadingFormModal } from "./bill-of-lading-form-modal";
import { DeleteBillOfLadingModal } from "./delete-bill-of-lading-modal";
import { formatDoVesselId } from "./do-vessel";

const BASE_COLUMNS = [
  "BL Number",
  "Vessel",
  "Importer",
  "Cargo Type",
  "BL Quantity (MT)",
  "BE Number",
  "Date",
];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

export function BillsOfLadingClient({
  rows,
  vessels,
  importers,
  cargoTypes,
  basePath,
  canManage,
  month,
  scopedVesselId,
  backHref,
  backLabel,
}: {
  rows: BillOfLadingRow[];
  vessels: BlVesselOption[];
  importers: Option[];
  cargoTypes: Option[];
  basePath: string;
  canManage: boolean;
  month: string;
  /** When set, the table is scoped to one vessel: hide the Vessel column/filter
   * and lock the create form's vessel. */
  scopedVesselId?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const baseCols = scopedVesselId
    ? BASE_COLUMNS.filter((c) => c !== "Vessel")
    : BASE_COLUMNS;
  const columns = canManage ? [...baseCols, "Actions"] : baseCols;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BillOfLadingRow | null>(null);
  const [deleting, setDeleting] = useState<BillOfLadingRow | null>(null);
  const [search, setSearch] = useState("");
  const [vesselFilter, setVesselFilter] = useState("ALL");

  const refresh = () => router.refresh();

  // The month is the server-fetch window — change it via the URL.
  const changeMonth = (m: string) =>
    router.replace(`${pathname}?month=${m}`, { scroll: false });

  // Distinct vessels present in the current rows, for the filter dropdown.
  const vesselChoices = useMemo(() => {
    const seen = new Map<string, { seq: number; name: string }>();
    for (const r of rows) {
      if (!seen.has(r.vesselId)) {
        seen.set(r.vesselId, { seq: r.vesselSeq, name: r.vesselName });
      }
    }
    return [...seen.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.seq - b.seq);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (vesselFilter !== "ALL" && r.vesselId !== vesselFilter) return false;
      if (!q) return true;
      return (
        String(r.blNumber).includes(q) ||
        r.vesselName.toLowerCase().includes(q) ||
        formatDoVesselId(r.vesselSeq).toLowerCase().includes(q) ||
        r.importerName.toLowerCase().includes(q) ||
        r.cargoTypeName.toLowerCase().includes(q) ||
        (r.beNumber !== null && String(r.beNumber).includes(q))
      );
    });
  }, [rows, search, vesselFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${search}|${vesselFilter}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={backHref ?? basePath}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        {backLabel ?? "Back to Delivery Orders"}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FileText className="text-[#0483ca]" size={32} />
            Bills of Lading
          </h1>
          <p className="mt-1 text-gray-500">
            Bills of lading issued against delivery-order vessels
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={20} />
            <span>Create New BL</span>
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
            placeholder="Search by BL number, vessel, importer or cargo..."
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
        {!scopedVesselId && (
          <select
            value={vesselFilter}
            onChange={(e) => setVesselFilter(e.target.value)}
            aria-label="Filter by vessel"
            className={selectClass}
          >
            <option value="ALL">All Vessels</option>
            {vesselChoices.map((v) => (
              <option key={v.id} value={v.id}>
                {formatDoVesselId(v.seq)} — {v.name}
              </option>
            ))}
          </select>
        )}
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
                visible.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                      {r.blNumber}
                    </td>
                    {!scopedVesselId && (
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-900">
                        <span className="font-medium">
                          {formatDoVesselId(r.vesselSeq)}
                        </span>{" "}
                        <span className="text-gray-500">— {r.vesselName}</span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {r.importerName}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {r.cargoTypeName}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(r.blQuantity)}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                      {r.beNumber !== null ? (
                        <span className="font-medium text-gray-900">
                          {r.beNumber}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                      {formatDate(r.createdYmd)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(r)}
                            aria-label="Edit bill of lading"
                            className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setDeleting(r)}
                            aria-label="Delete bill of lading"
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
                    <FileText
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {rows.length === 0
                        ? "No bills of lading yet"
                        : "No bills of lading found"}
                    </h3>
                    <p className="text-gray-500">
                      {rows.length === 0
                        ? "Create your first BL to get started."
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
        noun="bills of lading"
        onLoadMore={loadMore}
      />

      {showAdd && (
        <BillOfLadingFormModal
          vessels={vessels}
          importers={importers}
          cargoTypes={cargoTypes}
          lockedVesselId={scopedVesselId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <BillOfLadingFormModal
          bl={editing}
          vessels={vessels}
          importers={importers}
          cargoTypes={cargoTypes}
          lockedVesselId={scopedVesselId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteBillOfLadingModal
          bl={deleting}
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
