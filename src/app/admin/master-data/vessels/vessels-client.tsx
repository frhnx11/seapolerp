"use client";

import { Pencil, Plus, Search, Ship, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";

import { BackLink } from "../_components/back-link";
import { DeleteVesselModal } from "./delete-vessel-modal";
import { formatVesselId, type VesselRow } from "./vessel";
import { VesselFormModal } from "./vessel-form-modal";

const COLUMNS = [
  "Vessel ID",
  "Name",
  "Total Qty (MT)",
  "Allocated WO (MT)",
  "Available (MT)",
  "Actions",
];

export function VesselsClient({ vessels }: { vessels: VesselRow[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<VesselRow | null>(null);
  const [deleting, setDeleting] = useState<VesselRow | null>(null);
  const [search, setSearch] = useState("");

  const refresh = () => router.refresh();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vessels;
    return vessels.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        formatVesselId(v.seq).toLowerCase().includes(q),
    );
  }, [vessels, search]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    search,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Ship className="text-[#0483ca]" size={32} />
            Vessels
          </h1>
          <p className="mt-1 text-gray-500">
            Manage vessels and their BL quantities
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
        >
          <Plus size={20} />
          <span>Add New Vessel</span>
        </button>
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
          placeholder="Search by vessel name or ID..."
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
                visible.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatVesselId(v.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                      {v.name}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(v.totalQuantity)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {formatQty(v.allocatedWo)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-sm font-medium ${
                        v.available > 0 ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {formatQty(v.available)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(v)}
                          aria-label="Edit vessel"
                          className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          aria-label="Delete vessel"
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
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
                    <Ship size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {vessels.length === 0
                        ? "No vessels yet"
                        : "No vessels found"}
                    </h3>
                    <p className="text-gray-500">
                      {vessels.length === 0
                        ? "Add your first vessel to get started."
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
        <VesselFormModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <VesselFormModal
          vessel={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteVesselModal
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
