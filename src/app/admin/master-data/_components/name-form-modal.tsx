"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createNameItem, updateNameItem } from "../_lib/name-master-actions";
import {
  NAME_MASTERS,
  type NameItem,
  type NameMasterKey,
} from "../_lib/name-masters";

export function NameFormModal({
  entityKey,
  item,
  onClose,
  onSaved,
}: {
  entityKey: NameMasterKey;
  item?: NameItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const config = NAME_MASTERS[entityKey];
  const isEdit = Boolean(item);
  const [name, setName] = useState(item?.name ?? "");
  const [rate, setRate] = useState(item?.rate != null ? String(item.rate) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required");

    let parsedRate: number | null = null;
    if (config.withRate && rate.trim() !== "") {
      parsedRate = Number(rate);
      if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
        return setError("Rate must be greater than 0");
      }
    }

    setLoading(true);
    const input = { name, rate: parsedRate };
    const result =
      isEdit && item
        ? await updateNameItem(entityKey, item.id, input)
        : await createNameItem(entityKey, input);
    setLoading(false);

    if (result.ok) {
      toast.success(
        isEdit ? `${config.singular} updated` : `${config.singular} added`,
      );
      onSaved();
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? `Edit ${config.singular}` : `Add New ${config.singular}`}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name<span className="text-red-500"> *</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]"
              placeholder={`${config.singular} name`}
            />
          </div>

          {config.withRate && (
            <div>
              <label
                htmlFor="rate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Rate (₹ per MT)
              </label>
              <input
                id="rate"
                type="number"
                min="0.01"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]"
                placeholder="e.g. 450"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used on new invoices for this {config.singular.toLowerCase()}.
                Leave blank to keep it unset — invoices can&apos;t be created
                until a rate is set.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
