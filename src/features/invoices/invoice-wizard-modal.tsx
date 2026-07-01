"use client";

import { Check, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usePagination } from "@/components/use-pagination";
import { formatInr, formatQty } from "@/core/format";
import { formatTruckOrderNo } from "@/features/work-orders/truck-order-lib";
import { type WoHeaderData } from "@/features/work-orders/wo-header";

import { createInvoice, updateInvoice } from "./invoice-actions";
import { InvoiceDocView } from "./invoice-doc";
import {
  type CandidateTrip,
  computeInvoiceTotals,
  formatInvoiceNo,
  type InvoiceListRow,
  lowestNet,
  totalLowestNet,
} from "./invoice-lib";

const TRIP_COLUMNS = [
  "", // checkbox
  "TO#",
  "VT #",
  "Vehicle No",
  "Owner",
  "Net Sent (MT)",
  "Net Received (MT)",
  "Lowest Net (MT)",
];

const STEPS = ["Details & Trips", "Discount", "Preview"];

const inputClass =
  "rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * 3-step invoice wizard: (1) date + discount party + trip checklist,
 * (2) discount %, (3) full preview → create / save. Also edits an existing
 * invoice (prefilled; recalculates with the invoice's frozen rate). One invoice
 * may mix trips of any truck owner; it is simply billed to a discount party.
 */
export function InvoiceWizardModal({
  wo,
  candidates,
  discountParties,
  partyRate,
  todayIso,
  invoice,
  onClose,
  onSaved,
}: {
  wo: WoHeaderData;
  candidates: CandidateTrip[];
  /** Discount-party master rows for the (required) recipient dropdown. */
  discountParties: { id: string; name: string }[];
  /** The party's current ₹/MT rate (used for NEW invoices); null = not set. */
  partyRate: number | null;
  todayIso: string;
  /** When set, the wizard edits this invoice instead of creating one. */
  invoice: InvoiceListRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = invoice !== null;
  // Edits keep the invoice's creation-time rate; only new invoices read the
  // party's current rate.
  const rate = isEdit ? invoice.rate : partyRate;

  const initialSelected = useMemo(
    () => new Set(invoice?.tripIds ?? []),
    [invoice],
  );
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(invoice?.date ?? todayIso);
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState(
    invoice?.vendorInvoiceNumber ?? "",
  );
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState(
    invoice?.vendorInvoiceDate ?? "",
  );
  const [discountPartyId, setDiscountPartyId] = useState(
    invoice?.discountPartyId ?? "",
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(invoice?.tripIds ?? []),
  );
  const [discountPct, setDiscountPct] = useState(
    invoice && invoice.discountPct > 0 ? String(invoice.discountPct) : "",
  );
  const [remarks, setRemarks] = useState(invoice?.remarks ?? "");
  const [search, setSearch] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /**
   * Every trip this invoice may include — regardless of truck owner: free
   * trips, plus (when editing) this invoice's own claimed trips matched by id.
   * The discount party is just the recipient and never filters the list.
   */
  const eligible = useMemo(
    () =>
      candidates.filter(
        (t) => t.invoiceId === null || t.invoiceId === invoice?.id,
      ),
    [candidates, invoice],
  );

  const filteredTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (t) =>
        formatTruckOrderNo(t.seq).toLowerCase().includes(q) ||
        (t.vtNumber?.toLowerCase().includes(q) ?? false) ||
        t.vehicleNo.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q),
    );
  }, [eligible, search]);

  const { visible, hasMore, loadMore } = usePagination(filteredTrips, search);

  /** The selected discount party's name, for the preview/document. */
  const discountPartyName =
    discountParties.find((d) => d.id === discountPartyId)?.name ?? "";

  const selectedTrips = useMemo(
    () => eligible.filter((t) => selected.has(t.id)),
    [eligible, selected],
  );
  const totalQty = totalLowestNet(selectedTrips);
  const pct = discountPct.trim() === "" ? 0 : Number(discountPct);
  const pctValid = !Number.isNaN(pct) && pct >= 0 && pct <= 100;
  const totals =
    rate !== null
      ? computeInvoiceTotals(totalQty, rate, pctValid ? pct : 0)
      : null;

  const dirty = isEdit
    ? date !== invoice.date ||
      vendorInvoiceNumber.trim() !== (invoice.vendorInvoiceNumber ?? "") ||
      vendorInvoiceDate !== (invoice.vendorInvoiceDate ?? "") ||
      discountPartyId !== (invoice.discountPartyId ?? "") ||
      !sameSet(selected, initialSelected) ||
      pct !== invoice.discountPct ||
      remarks.trim() !== (invoice.remarks ?? "")
    : vendorInvoiceNumber.trim() !== "" ||
      vendorInvoiceDate !== "" ||
      discountPartyId !== "" ||
      selected.size > 0 ||
      discountPct.trim() !== "" ||
      remarks.trim() !== "";

  const step1Valid =
    Boolean(date) &&
    vendorInvoiceNumber.trim() !== "" &&
    Boolean(vendorInvoiceDate) &&
    discountPartyId !== "" &&
    selected.size > 0 &&
    rate !== null;

  function toggle(tripId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  }

  function requestClose() {
    if (dirty && !saving) setConfirmDiscard(true);
    else onClose();
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const input = {
      date,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      vendorInvoiceDate,
      discountPartyId,
      tripIds: [...selected],
      discountPct: pct,
      remarks: remarks.trim(),
    };
    const result = isEdit
      ? await updateInvoice(invoice.id, input)
      : await createInvoice(wo.id, input);
    setSaving(false);
    if (result.ok) {
      toast.success(
        `${formatInvoiceNo(result.seq)} ${isEdit ? "updated" : "created"}`,
      );
      onSaved();
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        {/* Header + step indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? `Edit ${formatInvoiceNo(invoice.seq)}` : "New Invoice"}
            </h2>
            <ol className="flex items-center gap-4">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === step
                        ? "bg-[#0483ca] text-white"
                        : i < step
                          ? "bg-blue-100 text-[#0483ca]"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < step ? <Check size={14} /> : i + 1}
                  </span>
                  <span
                    className={
                      i === step
                        ? "font-semibold text-gray-900"
                        : "text-gray-400"
                    }
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Step 1 — date + company + trip checklist */}
        {step === 0 && (
          <>
            <div className="flex flex-wrap items-end gap-4 border-b border-gray-100 px-6 py-4">
              <div>
                <label
                  htmlFor="inv-date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Invoice Date<span className="text-red-500"> *</span>
                </label>
                <input
                  id="inv-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="min-w-56">
                <label
                  htmlFor="inv-vendor-no"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Vendor Invoice Number<span className="text-red-500"> *</span>
                </label>
                <input
                  id="inv-vendor-no"
                  type="text"
                  value={vendorInvoiceNumber}
                  onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                  required
                  placeholder="e.g. 5844 & 5847"
                  className={`${inputClass} w-full`}
                />
              </div>
              <div>
                <label
                  htmlFor="inv-vendor-date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Vendor Invoice Date<span className="text-red-500"> *</span>
                </label>
                <input
                  id="inv-vendor-date"
                  type="date"
                  value={vendorInvoiceDate}
                  onChange={(e) => setVendorInvoiceDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="min-w-64">
                <label
                  htmlFor="inv-discount-party"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Discount Party<span className="text-red-500"> *</span>
                </label>
                <select
                  id="inv-discount-party"
                  value={discountPartyId}
                  onChange={(e) => setDiscountPartyId(e.target.value)}
                  required
                  className={`${inputClass} w-full`}
                >
                  <option value="" disabled>
                    Select discount party
                  </option>
                  {discountParties.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative min-w-72 flex-1">
                <Search
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by TO#, VT#, vehicle or owner..."
                  className={`${inputClass} w-full border-gray-200 pl-10`}
                />
              </div>
            </div>

            {rate === null && (
              <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {wo.partyName} has no rate set — an admin must set it in Master
                Data before invoices can be created.
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <>
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {TRIP_COLUMNS.map((h, i) => (
                        <th
                          key={`${h}-${i}`}
                          className={`px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase ${
                            i === 0 ? "w-12" : ""
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTrips.length > 0 ? (
                      visible.map((t) => {
                        const isSelected = selected.has(t.id);
                        return (
                          <tr
                            key={t.id}
                            onClick={() => toggle(t.id)}
                            className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                              isSelected ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span
                                role="checkbox"
                                aria-checked={isSelected}
                                aria-label={`Select ${formatTruckOrderNo(t.seq)}`}
                                className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                                  isSelected
                                    ? "border-[#0483ca] bg-[#0483ca]"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <Check size={14} className="text-white" />
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap text-gray-900">
                              {formatTruckOrderNo(t.seq)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
                              {t.vtNumber ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                              {t.vehicleNo}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                              {t.owner}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatQty(t.netWeight)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatQty(t.netWeightReceived)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {formatQty(lowestNet(t))}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={TRIP_COLUMNS.length}
                          className="px-6 py-16 text-center"
                        >
                          <FileText
                            size={48}
                            className="mx-auto mb-4 text-gray-200"
                          />
                          <h3 className="mb-1 text-lg font-semibold text-gray-900">
                            No billable trips found
                          </h3>
                          <p className="text-gray-500">
                            {eligible.length === 0
                              ? "This work order has no completed, received, un-invoiced trips yet."
                              : "Try a different search."}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={loadMore}
                      className="rounded-xl border border-gray-200 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            </div>
          </>
        )}

        {/* Step 2 — discount */}
        {step === 1 && totals && (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-md space-y-5">
              <div>
                <label
                  htmlFor="inv-discount"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Discount (%)
                </label>
                <input
                  id="inv-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} w-full`}
                />
                {!pctValid && (
                  <p className="mt-1 text-xs text-red-600">
                    Enter a percentage between 0 and 100.
                  </p>
                )}
              </div>

              <div className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {selectedTrips.length} trip
                    {selectedTrips.length === 1 ? "" : "s"} ·{" "}
                    {formatQty(totalQty)} MT × {formatQty(rate ?? 0)} ₹/MT
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatInr(totals.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Discount ({pctValid ? formatQty(pct) : "—"}%)
                  </span>
                  <span className="font-medium text-gray-900">
                    − {formatInr(totals.discount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-900">
                  <span>Final Amount</span>
                  <span>{formatInr(totals.finalAmount)}</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="inv-remarks"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Remarks (optional)
                </label>
                <textarea
                  id="inv-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. reason for the discount"
                  className={`${inputClass} w-full resize-none`}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Shown on the printed invoice.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — preview */}
        {step === 2 && rate !== null && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-100 p-6">
            <div className="flex justify-center">
              <InvoiceDocView
                data={{
                  invoiceNo: isEdit
                    ? formatInvoiceNo(invoice.seq)
                    : "Assigned on save",
                  date,
                  vesselName: wo.vesselName,
                  discountPartyName,
                  vendorInvoiceNumber: vendorInvoiceNumber.trim(),
                  vendorInvoiceDate,
                  rate,
                  totalQty,
                  discountPct: pctValid ? pct : 0,
                  remarks: remarks.trim() || null,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selected.size} trip{selected.size === 1 ? "" : "s"} ·{" "}
              {formatQty(totalQty)} MT selected
              {totals && selected.size > 0 && (
                <> · {formatInr(totals.finalAmount)}</>
              )}
            </p>
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 0 ? !step1Valid : !pctValid}
                  className="rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !step1Valid || !pctValid}
                  className="rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Create Invoice"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Discard confirmation */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              Discard this invoice?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isEdit
                ? "Your changes will be lost and the invoice will stay as it was."
                : "Your selections will be lost and no invoice will be created."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
