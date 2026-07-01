"use client";

import { Plus, Trash2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { evaluateEditLock, type EditLock } from "@/core/edit-window";
import { formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import { CreateDoTruckOrderModal } from "./create-do-truck-order-modal";
import { DeleteDoTruckOrderModal } from "./delete-do-truck-order-modal";
import { GrossDoTruckOrderModal } from "./gross-do-truck-order-modal";
import { type DoTruckOption } from "./do-truck";
import { formatDoTruckOrderNo, type DoTruckOrderRow } from "./do-truck-order";

const COLUMNS = [
  "Truck DO No",
  "Vehicle No",
  "Tare Weight (MT)",
  "Gross Weight (MT)",
  "Net Weight (MT)",
  "Date",
  "Actions",
];

export function DeliveryOrderTrucksClient({
  rows,
  deliveryOrderId,
  doTrucks,
  isAdmin,
}: {
  rows: DoTruckOrderRow[];
  deliveryOrderId: string;
  doTrucks: DoTruckOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTare, setEditingTare] = useState<DoTruckOrderRow | null>(null);
  const [editingGross, setEditingGross] = useState<DoTruckOrderRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState<DoTruckOrderRow | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Re-evaluate the edit windows periodically so cells lock as time passes.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Admins are never time-limited; port gets 30 min from the value's first entry.
  const lockFor = (firstEnteredAt: string | null): EditLock =>
    evaluateEditLock({ firstEnteredAt, isAdmin, invoiced: false, now });

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Truck className="text-[#0483ca]" size={22} />
          Truck DOs
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
        >
          <Plus size={20} />
          <span>Create New Truck DO</span>
        </button>
      </div>

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
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatDoTruckOrderNo(r.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                      {r.vehicleNo}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setEditingTare(r)}
                        title="Tare weight"
                        className="-m-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-blue-50"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {formatQty(r.tareWeight)}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.grossWeight !== null ? (
                        <button
                          type="button"
                          onClick={() => setEditingGross(r)}
                          title="Gross weighment"
                          className="-m-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-blue-50"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {formatQty(r.grossWeight)}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingGross(r)}
                          className="inline-flex rounded-lg bg-[#0483ca] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0372b0]"
                        >
                          Enter Gross
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                      {r.netWeight !== null ? (
                        formatQty(r.netWeight)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-gray-600">
                      {formatDate(r.createdYmd)}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setDeleting(r)}
                        aria-label="Delete truck DO"
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center"
                  >
                    <Truck size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No truck DOs yet
                    </h3>
                    <p className="text-gray-500">
                      Trucks delivering against this order will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <CreateDoTruckOrderModal
          deliveryOrderId={deliveryOrderId}
          doTrucks={doTrucks}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {editingTare && (
        <CreateDoTruckOrderModal
          deliveryOrderId={deliveryOrderId}
          doTrucks={doTrucks}
          truckOrder={editingTare}
          lock={lockFor(editingTare.createdAt)}
          onClose={() => setEditingTare(null)}
          onSaved={() => {
            setEditingTare(null);
            refresh();
          }}
        />
      )}
      {editingGross && (
        <GrossDoTruckOrderModal
          truckOrder={editingGross}
          deliveryOrderId={deliveryOrderId}
          lock={lockFor(editingGross.grossFirstAt)}
          onClose={() => setEditingGross(null)}
          onSaved={() => {
            setEditingGross(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteDoTruckOrderModal
          truckOrder={deleting}
          deliveryOrderId={deliveryOrderId}
          lock={lockFor(deleting.createdAt)}
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
