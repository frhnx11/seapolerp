"use client";

import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator, monthLabel } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";
import { formatInr, formatQty } from "@/core/format";
import { type WoHeaderData } from "@/features/work-orders/wo-header";
import { formatDate } from "@/features/work-orders/work-order";

import { DeleteInvoiceModal } from "./delete-invoice-modal";
import {
  type CandidateTrip,
  formatInvoiceNo,
  type InvoiceListRow,
} from "./invoice-lib";
import { InvoiceWizardModal } from "./invoice-wizard-modal";

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const COLUMNS = [
  "Invoice #",
  "Date",
  "Discount Party",
  "Total Net Wt (MT)",
  "Rate (₹/MT)",
  "Amount",
  "Discount",
  "Final Amount",
  "Actions",
];

export function WoInvoicesClient({
  wo,
  invoices,
  candidates,
  discountParties,
  partyRate,
  todayIso,
  initialMonth,
}: {
  wo: WoHeaderData;
  invoices: InvoiceListRow[];
  candidates: CandidateTrip[];
  discountParties: { id: string; name: string }[];
  partyRate: number | null;
  todayIso: string;
  /** Current business month "YYYY-MM" (server-provided; seeds the navigator). */
  initialMonth: string;
}) {
  const router = useRouter();
  const [wizard, setWizard] = useState<{
    invoice: InvoiceListRow | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<InvoiceListRow | null>(null);
  const [month, setMonth] = useState(initialMonth);
  const [partyFilter, setPartyFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const refresh = () => router.refresh();

  const partyNames = useMemo(
    () =>
      [
        ...new Set(
          invoices
            .map((inv) => inv.discountPartyName)
            .filter((n): n is string => n !== null),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [invoices],
  );

  // Every invoiced trip is in `candidates` (invoiced trips stay settled), so
  // VT#/vehicle search can match invoices through their trips client-side.
  const tripsByInvoice = useMemo(() => {
    const map = new Map<string, CandidateTrip[]>();
    for (const trip of candidates) {
      if (!trip.invoiceId) continue;
      const list = map.get(trip.invoiceId);
      if (list) list.push(trip);
      else map.set(trip.invoiceId, [trip]);
    }
    return map;
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (inv.date.slice(0, 7) !== month) return false;
      if (partyFilter !== "ALL" && inv.discountPartyName !== partyFilter)
        return false;
      if (!q) return true;
      return (tripsByInvoice.get(inv.id) ?? []).some(
        (t) =>
          (t.vtNumber?.toLowerCase().includes(q) ?? false) ||
          t.vehicleNo.toLowerCase().includes(q),
      );
    });
  }, [invoices, month, partyFilter, search, tripsByInvoice]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${partyFilter}|${search}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
          <FileText className="text-amber-600" size={26} />
          Invoices
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by VT# or vehicle no..."
              className="w-full rounded-xl border border-gray-200 py-2 pr-8 pl-9 text-sm transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            aria-label="Filter by discount party"
            className={selectClass}
          >
            <option value="ALL">All Discount Parties</option>
            {partyNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <MonthNavigator month={month} onChange={setMonth} />
          <button
            onClick={() => setWizard({ invoice: null })}
            className="flex items-center space-x-1.5 rounded-xl bg-[#0483ca] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <Plus size={18} />
            <span>Add New Invoice</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((inv) => (
                  <tr key={inv.id} className="align-top">
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatInvoiceNo(inv.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {inv.discountPartyName ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {formatQty(inv.totalQty)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">
                      {formatQty(inv.rate)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {formatInr(inv.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {inv.discountPct > 0
                        ? `${formatQty(inv.discountPct)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatInr(inv.finalAmount)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`/print/invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="View invoice"
                          title="View / print"
                          className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button
                          onClick={() => setWizard({ invoice: inv })}
                          aria-label="Edit invoice"
                          title="Edit"
                          className="rounded-lg p-2 text-[#0483ca] transition-colors hover:bg-blue-50"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setDeleting(inv)}
                          aria-label="Delete invoice"
                          title="Delete"
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
                    <FileText
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {invoices.length === 0
                        ? "No invoices yet"
                        : `No invoices in ${monthLabel(month)}`}
                    </h3>
                    <p className="text-gray-500">
                      {invoices.length === 0
                        ? "Create one once trips are completed at the port and received by the party."
                        : "Try another month, search or filter."}
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
        noun="invoices"
        onLoadMore={loadMore}
      />

      {wizard && (
        <InvoiceWizardModal
          wo={wo}
          candidates={candidates}
          discountParties={discountParties}
          partyRate={partyRate}
          todayIso={todayIso}
          invoice={wizard.invoice}
          onClose={() => setWizard(null)}
          onSaved={() => {
            setWizard(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteInvoiceModal
          invoice={deleting}
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
