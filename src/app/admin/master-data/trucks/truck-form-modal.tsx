"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createTruck, updateTruck } from "./actions";
import {
  anyExpired,
  type Truck,
  type TruckOwnerOption,
  type TruckStatus,
  WHEELS,
} from "@/features/trucks/truck";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        <span className="text-red-500"> *</span>
      </label>
      {children}
    </div>
  );
}

export function TruckFormModal({
  truck,
  owners,
  todayIso,
  onClose,
  onSaved,
}: {
  truck?: Truck;
  owners: TruckOwnerOption[];
  todayIso: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(truck);
  const [vehicleNo, setVehicleNo] = useState(truck?.vehicleNo ?? "");
  const [wheels, setWheels] = useState(truck ? String(truck.wheels) : "");
  const [ownerId, setOwnerId] = useState(truck?.ownerId ?? "");
  const [rcValidity, setRcValidity] = useState(truck?.rcValidity ?? "");
  const [insuranceValidity, setInsuranceValidity] = useState(
    truck?.insuranceValidity ?? "",
  );
  const [fcValidity, setFcValidity] = useState(truck?.fcValidity ?? "");
  const [blocked, setBlocked] = useState(truck?.status === "BLOCKED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Expired is derived from the current form dates. An expired truck can only be
  // Expired or Blocked — never Active — until the dates are made valid again.
  const expired = anyExpired(
    { rcValidity, insuranceValidity, fcValidity },
    todayIso,
  );
  const statusValue = blocked ? "BLOCKED" : expired ? "EXPIRED" : "ACTIVE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!vehicleNo.trim()) return setError("Vehicle No is required");
    if (!wheels) return setError("Type is required");
    if (!ownerId) return setError("Owner is required");
    if (!rcValidity || !insuranceValidity || !fcValidity) {
      return setError("All validity dates are required");
    }

    const input = {
      vehicleNo: vehicleNo.trim(),
      wheels: Number(wheels),
      ownerId,
      rcValidity,
      insuranceValidity,
      fcValidity,
      status: (blocked ? "BLOCKED" : "ACTIVE") as TruckStatus,
    };

    setLoading(true);
    const result =
      isEdit && truck
        ? await updateTruck(truck.id, input)
        : await createTruck(input);
    setLoading(false);

    if (result.ok) {
      toast.success(isEdit ? "Truck updated" : "Truck added");
      onSaved();
    } else {
      setError(result.error ?? "Failed to save truck");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Truck" : "Add New Truck"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Field label="Vehicle No">
            <input
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. KA01AB1234"
            />
          </Field>

          <Field label="Type">
            <select
              value={wheels}
              onChange={(e) => setWheels(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select type
              </option>
              {WHEELS.map((w) => (
                <option key={w} value={w}>
                  {w} wheels
                </option>
              ))}
            </select>
          </Field>

          <Field label="Owner">
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select owner
              </option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {owners.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No truck owners yet — add them in Master Data → Truck Owners
                first.
              </p>
            )}
          </Field>

          <Field label="RC Validity">
            <input
              type="date"
              value={rcValidity}
              onChange={(e) => setRcValidity(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Insurance Validity">
            <input
              type="date"
              value={insuranceValidity}
              onChange={(e) => setInsuranceValidity(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="FC Certificate Validity">
            <input
              type="date"
              value={fcValidity}
              onChange={(e) => setFcValidity(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Status">
            <select
              value={statusValue}
              onChange={(e) => setBlocked(e.target.value === "BLOCKED")}
              className={inputClass}
            >
              {expired ? (
                <option value="EXPIRED">Expired</option>
              ) : (
                <option value="ACTIVE">Active</option>
              )}
              <option value="BLOCKED">Blocked</option>
            </select>
            {expired && (
              <p className="mt-1 text-xs text-amber-600">
                This truck has an expired validity date — update the dates to
                set it Active.
              </p>
            )}
          </Field>

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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Truck"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
