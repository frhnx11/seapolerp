"use client";

import {
  Factory,
  type LucideIcon,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import { formatInr } from "@/core/format";

import {
  NAME_MASTERS,
  type NameItem,
  type NameMasterKey,
} from "../_lib/name-masters";
import { BackLink } from "./back-link";
import { DeleteNameModal } from "./delete-name-modal";
import { NameFormModal } from "./name-form-modal";

const ICONS = {
  package: Package,
  store: Store,
  factory: Factory,
  mapPin: MapPin,
  users: Users,
} satisfies Record<string, LucideIcon>;

export function NameMasterClient({
  entityKey,
  items,
}: {
  entityKey: NameMasterKey;
  items: NameItem[];
}) {
  const router = useRouter();
  const config = NAME_MASTERS[entityKey];
  const Icon = ICONS[config.icon];
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<NameItem | null>(null);
  const [deleting, setDeleting] = useState<NameItem | null>(null);
  const [search, setSearch] = useState("");

  const refresh = () => router.refresh();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

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
            <Icon className="text-[#0483ca]" size={32} />
            {config.label}
          </h1>
          <p className="mt-1 text-gray-500">
            Manage {config.label.toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
        >
          <Plus size={20} />
          <span>Add New</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${config.label.toLowerCase()}...`}
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
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                {config.withRate && (
                  <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Rate (₹/MT)
                  </th>
                )}
                <th className="w-40 px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    {config.withRate && (
                      <td className="px-6 py-4 text-sm">
                        {item.rate != null ? (
                          <span className="font-medium text-gray-900">
                            {formatInr(item.rate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(item)}
                          aria-label="Edit"
                          className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setDeleting(item)}
                          aria-label="Delete"
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
                    colSpan={config.withRate ? 3 : 2}
                    className="px-6 py-16 text-center"
                  >
                    <Icon size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {items.length === 0
                        ? `No ${config.label.toLowerCase()} yet`
                        : `No ${config.label.toLowerCase()} found`}
                    </h3>
                    <p className="text-gray-500">
                      {items.length === 0
                        ? `Add your first ${config.singular.toLowerCase()} to get started.`
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
        noun={config.label.toLowerCase()}
        onLoadMore={loadMore}
      />

      {showAdd && (
        <NameFormModal
          entityKey={entityKey}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <NameFormModal
          entityKey={entityKey}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteNameModal
          entityKey={entityKey}
          item={deleting}
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
