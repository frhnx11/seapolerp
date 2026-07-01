"use client";

import { Printer, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LastUpdatedLine } from "@/components/last-updated-line";
import { SearchableSelect } from "@/components/searchable-select";
import { formatQty } from "@/core/format";

import {
  recordGross,
  recordLoadingSlip,
  recordNetReceived,
} from "./truck-order-actions";
import {
  type EditLock,
  formatTruckOrderNo,
  type TruckOrderRow,
  type WorkOrderOption,
} from "./truck-order-lib";
import { formatWoNumber, type Option } from "./work-order";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export type StageKey = "loadingSlip" | "gross" | "netReceived";

type SaveResult = { ok: true } | { ok: false; error?: string };

// Re-exported so existing importers (e.g. create-truck-order-modal) are unchanged.
export { LastUpdatedLine };

/**
 * Save-and-stay modal shell: Close · Save · Print. Save is dirty-tracked (grey
 * "Saved ✓" once the form matches what's persisted); Print (document stages
 * only) is enabled only when there's nothing unsaved, so a stale chit can never
 * be printed.
 */
function StageModalShell({
  title,
  trip,
  loading,
  error,
  dirty,
  saveLabel,
  printHref,
  lastUpdatedBy,
  lastUpdatedAt,
  firstEnteredByName,
  firstEnteredAt,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  trip: TruckOrderRow;
  loading: boolean;
  error: string;
  dirty: boolean;
  saveLabel: string;
  /** Print route for this stage's document; omit for stages without one. */
  printHref?: string;
  /** Who last saved this stage; omitted/null until the first save. */
  lastUpdatedBy?: string | null;
  /** When that save happened, shown beside the name. */
  lastUpdatedAt?: string | null;
  /** Who first recorded this value (immutable); omitted until entered. */
  firstEnteredByName?: string | null;
  /** Immutable first-entry time — the edit-window anchor; omitted until entered. */
  firstEnteredAt?: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const canPrint = !dirty && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {formatTruckOrderNo(trip.seq)} ·{" "}
            <span className="font-semibold text-gray-900">
              {trip.vehicleNo}
            </span>
          </div>

          {children}

          <LastUpdatedLine
            by={lastUpdatedBy ?? null}
            at={lastUpdatedAt}
            firstBy={firstEnteredByName}
            firstAt={firstEnteredAt}
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || !dirty}
              className={`flex-1 rounded-lg px-4 py-2.5 font-medium transition-colors ${
                dirty
                  ? "bg-[#0483ca] text-white hover:bg-[#0372b0] disabled:opacity-50"
                  : "cursor-default bg-gray-200 text-gray-500"
              }`}
            >
              {loading ? "Saving..." : dirty ? saveLabel : "Saved ✓"}
            </button>
            {printHref &&
              (canPrint ? (
                <a
                  href={printHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#0483ca] px-4 py-2.5 font-medium text-[#0483ca] transition-colors hover:bg-blue-50"
                >
                  <Printer size={18} />
                  Print
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Save before printing"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-400"
                >
                  <Printer size={18} />
                  Print
                </button>
              ))}
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function useStageSave(
  onSavedRefresh: () => void,
  successMessage: string,
): [boolean, string, (fn: () => Promise<SaveResult>) => Promise<boolean>] {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<SaveResult>): Promise<boolean> {
    setError("");
    setLoading(true);
    const result = await fn();
    setLoading(false);
    if (result.ok) {
      toast.success(successMessage);
      onSavedRefresh();
      return true;
    }
    setError(result.error ?? "Failed to save");
    return false;
  }

  return [loading, error, run];
}

// ---- Stage 2: Cargo Loading Slip ----

export function LoadingSlipModal({
  trip,
  lock,
  loadingSites,
  onClose,
  onSaved,
}: {
  trip: TruckOrderRow;
  lock: EditLock;
  loadingSites: Option[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loadingSiteId, setLoadingSiteId] = useState(trip.loadingSiteId ?? "");
  const [snapshot, setSnapshot] = useState<string | null>(
    trip.loadingSiteId ? JSON.stringify([trip.loadingSiteId]) : null,
  );
  const [loading, error, run] = useStageSave(onSaved, "Loading slip recorded");

  // Past its 30-minute window (or invoiced) the slip stays viewable/printable
  // but its site can't change.
  const locked = !lock.canEdit;
  const current = JSON.stringify([loadingSiteId]);
  const dirty = !locked && snapshot !== current;

  return (
    <StageModalShell
      title="Cargo Loading Slip"
      trip={trip}
      loading={loading}
      error={error}
      dirty={dirty}
      saveLabel="Save"
      printHref={`/print/truck-order/${trip.id}/loading-slip`}
      lastUpdatedBy={trip.loadingSlipByName}
      lastUpdatedAt={trip.loadingSlipAt}
      firstEnteredByName={trip.loadingSlipFirstByName}
      firstEnteredAt={trip.loadingSlipFirstAt}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() =>
          recordLoadingSlip(trip.id, { loadingSiteId }),
        );
        if (ok) setSnapshot(current);
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Loading Site<span className="text-red-500"> *</span>
        </label>
        <select
          value={loadingSiteId}
          onChange={(e) => setLoadingSiteId(e.target.value)}
          required
          disabled={locked}
          className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
        >
          <option value="" disabled>
            Select loading site
          </option>
          {loadingSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {locked && lock.reason && (
          <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
        )}
      </div>
    </StageModalShell>
  );
}

// ---- Stage 3: Gross / Exit ----

export function GrossModal({
  trip,
  lock,
  workOrders,
  onClose,
  onSaved,
}: {
  trip: TruckOrderRow;
  lock: EditLock;
  workOrders: WorkOrderOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [workOrderId, setWorkOrderId] = useState<string | null>(
    trip.workOrderId,
  );
  const [vtNumber, setVtNumber] = useState(trip.vtNumber ?? "");
  const [grossWeight, setGrossWeight] = useState(
    trip.grossWeight !== null ? String(trip.grossWeight) : "",
  );
  const snapshot =
    trip.grossWeight !== null
      ? JSON.stringify([
          trip.workOrderId ?? "",
          trip.vtNumber ?? "",
          String(trip.grossWeight),
        ])
      : null;
  const completed = trip.status === "COMPLETED";
  // Past its 30-minute window (or invoiced) the gross weighment is locked.
  const locked = !lock.canEdit;
  const [loading, error, run] = useStageSave(
    onSaved,
    completed ? "Trip updated" : "Trip completed",
  );

  const current = JSON.stringify([workOrderId ?? "", vtNumber, grossWeight]);
  const dirty = !locked && snapshot !== current;

  const gross = Number(grossWeight);
  const net =
    grossWeight && gross > trip.tareWeight ? gross - trip.tareWeight : null;

  return (
    <StageModalShell
      title="Gross Weighment & Exit"
      trip={trip}
      loading={loading}
      error={error}
      dirty={dirty}
      saveLabel={completed ? "Save" : "Complete Trip"}
      lastUpdatedBy={trip.completedByName}
      lastUpdatedAt={trip.completedAt}
      firstEnteredByName={trip.grossFirstByName}
      firstEnteredAt={trip.grossFirstAt}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        // On success the popup closes via onSaved — nothing to keep in sync.
        await run(() =>
          recordGross(trip.id, {
            workOrderId: workOrderId ?? "",
            vtNumber,
            grossWeight: gross,
          }),
        );
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Work Order<span className="text-red-500"> *</span>
        </label>
        <SearchableSelect
          options={workOrders}
          value={workOrderId}
          onChange={setWorkOrderId}
          getKey={(w) => w.id}
          getLabel={(w) => `${formatWoNumber(w.seq)} · ${w.vesselName}`}
          getSearchText={(w) =>
            `${formatWoNumber(w.seq)} ${w.vesselName} ${w.cargoTypeName} ${w.supplierName} ${w.partyName}`
          }
          renderOption={(w) => (
            <span className="block">
              <span className="block text-sm font-semibold text-gray-900">
                {formatWoNumber(w.seq)} · {w.vesselName}
              </span>
              <span className="block text-xs text-gray-500">
                {w.cargoTypeName} · {w.supplierName} · {w.partyName}
              </span>
            </span>
          )}
          placeholder="Search by WO#, vessel, cargo, supplier or party..."
          emptyText="No work order matches your search."
          disabled={locked}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          VT Number<span className="text-red-500"> *</span>
        </label>
        <input
          value={vtNumber}
          onChange={(e) => setVtNumber(e.target.value)}
          required
          disabled={locked}
          className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          placeholder="e.g. A 3851"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Gross Weight (MT)<span className="text-red-500"> *</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.001"
          value={grossWeight}
          onChange={(e) => setGrossWeight(e.target.value)}
          required
          disabled={locked}
          className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          placeholder="e.g. 30.140"
        />
        {locked
          ? lock.reason && (
              <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
            )
          : net !== null && (
              <p className="mt-1 text-xs font-medium text-green-700">
                Net weight: {formatQty(net)} MT
              </p>
            )}
      </div>
    </StageModalShell>
  );
}

// ---- Party weighbridge: Net Weight Received ----

export function NetReceivedModal({
  trip,
  lock,
  onClose,
  onSaved,
}: {
  trip: TruckOrderRow;
  lock: EditLock;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [netWeightReceived, setNetWeightReceived] = useState(
    trip.netWeightReceived !== null ? String(trip.netWeightReceived) : "",
  );
  const snapshot =
    trip.netWeightReceived !== null
      ? JSON.stringify([String(trip.netWeightReceived)])
      : null;
  const [loading, error, run] = useStageSave(
    onSaved,
    "Net weight received recorded",
  );

  // Past its 30-minute window (or invoiced) the received weight is locked.
  const locked = !lock.canEdit;
  const current = JSON.stringify([netWeightReceived]);
  const dirty = !locked && snapshot !== current;

  return (
    <StageModalShell
      title="Net Weight Received"
      trip={trip}
      loading={loading}
      error={error}
      dirty={dirty}
      saveLabel="Save"
      lastUpdatedBy={trip.netReceivedByName}
      lastUpdatedAt={trip.netReceivedAt}
      firstEnteredByName={trip.netReceivedFirstByName}
      firstEnteredAt={trip.netReceivedFirstAt}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        // On success the popup closes via onSaved — nothing to keep in sync.
        await run(() =>
          recordNetReceived(trip.id, {
            netWeightReceived: Number(netWeightReceived),
          }),
        );
      }}
    >
      <div className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
        <InfoRow
          label="Net at port"
          value={
            trip.netWeight !== null ? `${formatQty(trip.netWeight)} MT` : "—"
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Net Weight Received (MT)<span className="text-red-500"> *</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.001"
          value={netWeightReceived}
          onChange={(e) => setNetWeightReceived(e.target.value)}
          required
          disabled={locked}
          className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          placeholder="e.g. 25.480"
        />
        {locked && lock.reason && (
          <p className="mt-1 text-xs text-gray-500">{lock.reason}</p>
        )}
      </div>
    </StageModalShell>
  );
}
