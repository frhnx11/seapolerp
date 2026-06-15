"use client";

import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck as TruckIcon,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";

import { BackLink } from "../_components/back-link";
import { DeleteTruckModal } from "./delete-truck-modal";
import {
  type DisplayStatus,
  displayStatus,
  formatDate,
  type Truck,
  type TruckOwnerOption,
  WHEELS,
  wheelsLabel,
} from "@/features/trucks/truck";
import { TruckFormModal } from "./truck-form-modal";
import { UploadExcelModal } from "./upload-excel-modal";

const COLUMNS = [
  "Vehicle No",
  "Type",
  "Owner",
  "RC Validity",
  "Insurance Validity",
  "FC Certificate Validity",
  "Status",
  "Actions",
];

const STATUS_ORDER: DisplayStatus[] = ["ACTIVE", "EXPIRED", "BLOCKED"];

const STATUS_PILL: Record<DisplayStatus, { label: string; className: string }> =
  {
    ACTIVE: {
      label: "Active",
      className: "border-green-200 bg-green-50 text-green-700",
    },
    EXPIRED: {
      label: "Expired",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    BLOCKED: {
      label: "Blocked",
      className: "border-red-200 bg-red-50 text-red-700",
    },
  };

export function TrucksClient({
  trucks,
  owners,
  todayIso,
}: {
  trucks: Truck[];
  owners: TruckOwnerOption[];
  todayIso: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [deleting, setDeleting] = useState<Truck | null>(null);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const refresh = () => router.refresh();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trucks.filter((t) => {
      if (ownerFilter !== "ALL" && t.ownerId !== ownerFilter) return false;
      if (typeFilter !== "ALL" && String(t.wheels) !== typeFilter) return false;
      if (
        statusFilter !== "ALL" &&
        displayStatus(t, todayIso) !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        t.vehicleNo.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q)
      );
    });
  }, [trucks, search, ownerFilter, typeFilter, statusFilter, todayIso]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${search}|${ownerFilter}|${typeFilter}|${statusFilter}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <TruckIcon className="text-[#0483ca]" size={32} />
            Trucks
          </h1>
          <p className="mt-1 text-gray-500">Manage the truck master</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={20} />
            <span>Add New Truck</span>
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center space-x-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Upload size={20} />
            <span>Upload Truck Excel</span>
          </button>
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
            placeholder="Search by vehicle no or owner..."
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
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filter by owner"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
        >
          <option value="ALL">All Owners</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
        >
          <option value="ALL">All Types</option>
          {WHEELS.map((w) => (
            <option key={w} value={String(w)}>
              {w} wheels
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_PILL[s].label}
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
                  const pill = STATUS_PILL[displayStatus(t, todayIso)];
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(t.rcValidity)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(t.insuranceValidity)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(t.fcValidity)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(t)}
                            aria-label="Edit truck"
                            className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            aria-label="Delete truck"
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                      {trucks.length === 0
                        ? "No trucks yet"
                        : "No trucks found"}
                    </h3>
                    <p className="text-gray-500">
                      {trucks.length === 0
                        ? "Add a truck or upload an Excel sheet to get started."
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

      {showAdd && (
        <TruckFormModal
          owners={owners}
          todayIso={todayIso}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {showUpload && (
        <UploadExcelModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <TruckFormModal
          truck={editing}
          owners={owners}
          todayIso={todayIso}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteTruckModal
          truck={deleting}
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
