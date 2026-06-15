"use client";

import { useState } from "react";
import { toast } from "sonner";

import { deleteNameItem } from "../_lib/name-master-actions";
import {
  NAME_MASTERS,
  type NameItem,
  type NameMasterKey,
} from "../_lib/name-masters";

export function DeleteNameModal({
  entityKey,
  item,
  onClose,
  onDeleted,
}: {
  entityKey: NameMasterKey;
  item: NameItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const config = NAME_MASTERS[entityKey];
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteNameItem(entityKey, item.id);
    setLoading(false);
    if (result.ok) {
      toast.success(`${config.singular} deleted`);
      onDeleted();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">
          Delete {config.singular.toLowerCase()}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Delete{" "}
          <span className="font-semibold text-gray-900">{item.name}</span>? This
          cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
