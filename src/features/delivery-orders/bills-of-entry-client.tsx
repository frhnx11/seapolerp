"use client";

import {
  ArrowLeft,
  FileCheck,
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
  type BeBlOption,
  type BeVesselOption,
  type BillOfEntryRow,
  type Option,
} from "./bill-of-entry";
import { BillOfEntryFormModal } from "./bill-of-entry-form-modal";
import { DeleteBillOfEntryModal } from "./delete-bill-of-entry-modal";
import { formatDoVesselId } from "./do-vessel";

const BASE_COLUMNS = [
  "BE Number",
  "Vessel",
  "Importer",
  "Cargo Type",
  "BLs",
  "BE Quantity (MT)",
  "Date",
];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

export function BillsOfEntryClient({
  rows,
  vessels,
  importers,
  cargoTypes,
  availableBls,
  basePath,
  canManage,
  month,
  scopedVesselId,
  backHref,
  backLabel,
}: {
  rows: BillOfEntryRow[];
  vessels: BeVesselOption[];
  importers: Option[];
  cargoTypes: Option[];
  availableBls: BeBlOption[];
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
  const [editing, setEditing] = useState<BillOfEntryRow | null>(null);
  const [deleting, setDeleting] = useState<BillOfEntryRow | null>(null);
  const [blPopup, setBlPopup] = useState<BillOfEntryRow | null>(null);
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
        String(r.beNumber).includes(q) ||
        r.vesselName.toLowerCase().includes(q) ||
        formatDoVesselId(r.vesselSeq).toLowerCase().includes(q) ||
        r.importerName.toLowerCase().includes(q) ||
        r.cargoTypeName.toLowerCase().includes(q) ||
        r.bls.some((b) => String(b.blNumber).includes(q))
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
            <FileCheck className="text-[#0483ca]" size={32} />
            Bills of Entry
          </h1>
          <p className="mt-1 text-gray-500">
            Bills of entry grouping bills of lading by vessel, importer and
            cargo
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={20} />
            <span>Create New BE</span>
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
            placeholder="Search by BE number, vessel, importer, cargo or BL number..."
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
                      {r.beNumber}
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
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setBlPopup(r)}
                        className="rounded-lg px-2 py-1 font-semibold text-[#0483ca] transition-colors hover:bg-blue-50"
                      >
                        {r.bls.length} BL{r.bls.length === 1 ? "" : "s"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium whitespace-nowrap text-gray-900">
                      {formatQty(r.blQuantity)}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                      {formatDate(r.createdYmd)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(r)}
                            aria-label="Edit bill of entry"
                            className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setDeleting(r)}
                            aria-label="Delete bill of entry"
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
                    <FileCheck
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {rows.length === 0
                        ? "No bills of entry yet"
                        : "No bills of entry found"}
                    </h3>
                    <p className="text-gray-500">
                      {rows.length === 0
                        ? "Create your first BE to get started."
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
        noun="bills of entry"
        onLoadMore={loadMore}
      />

      {showAdd && (
        <BillOfEntryFormModal
          vessels={vessels}
          importers={importers}
          cargoTypes={cargoTypes}
          availableBls={availableBls}
          lockedVesselId={scopedVesselId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <BillOfEntryFormModal
          be={editing}
          vessels={vessels}
          importers={importers}
          cargoTypes={cargoTypes}
          availableBls={availableBls}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteBillOfEntryModal
          be={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refresh();
          }}
        />
      )}

      {blPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                BE #{blPopup.beNumber} — bills of lading
              </h2>
              <button
                onClick={() => setBlPopup(null)}
                aria-label="Close"
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {blPopup.bls.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-900">
                    BL #{b.blNumber}
                  </span>
                  <span className="text-gray-500">
                    {formatQty(b.blQuantity)} MT
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatQty(blPopup.blQuantity)} MT</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
