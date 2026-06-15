"use client";

import { AlertTriangle, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { MonthNavigator, monthLabel } from "@/components/month-navigator";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";
import { formatInvoiceNo } from "@/features/invoices/invoice-lib";
import { InvoiceInfoModal } from "@/features/work-orders/invoice-info-modal";
import { LastUpdatedLine } from "@/features/work-orders/truck-order-stage-modals";
import {
  formatTruckOrderNo,
  netDifference,
} from "@/features/work-orders/truck-order-lib";
import { formatWoNumber } from "@/features/work-orders/work-order";

/** One flagged trip in the alerts table (net sent vs received over tolerance). */
export type AlertRow = {
  id: string;
  seq: number;
  woId: string;
  woSeq: number;
  vtNumber: string | null;
  vehicleNo: string;
  owner: string;
  tareWeight: number;
  grossWeight: number;
  netWeight: number;
  netWeightReceived: number;
  invoiceId: string | null;
  invoiceSeq: number | null;
  // Stage stamps (who recorded each weight, and when).
  tareByName: string | null;
  tareAt: string | null;
  completedByName: string | null;
  completedAt: string | null;
  netReceivedByName: string | null;
  netReceivedAt: string | null;
};

/** Read-only popup showing a stage's value(s) and who recorded it — same look
 *  as the truck-orders stage popups, but view-only (reuses LastUpdatedLine). */
type StageInfo = {
  title: string;
  rows: { label: string; value: string }[];
  byName: string | null;
  at: string | null;
};

function StageInfoModal({
  info,
  onClose,
}: {
  info: StageInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{info.title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
          {info.rows.map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-gray-500">{r.label}</span>
              <span className="text-right font-medium text-gray-900">
                {r.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <LastUpdatedLine by={info.byName} at={info.at} />
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const cellButtonClass =
  "-m-1.5 rounded-lg p-1.5 transition-colors hover:bg-blue-50";

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

const COLUMNS = [
  "TO#",
  "VT#",
  "Work Order",
  "Truck",
  "Tare",
  "Gross / Exit",
  "Net Weight Received",
  "Lowest Net Weight",
  "Net Weight Difference",
  "Invoice",
];

export function AlertsClient({
  rows,
  month,
}: {
  rows: AlertRow[];
  /** Active month window "YYYY-MM" (by net-received date; server-scoped). */
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [invoiceInfo, setInvoiceInfo] = useState<AlertRow | null>(null);
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);

  // The month is the server-fetch window — change it via the URL.
  const changeMonth = (m: string) =>
    router.replace(`${pathname}?month=${m}`, { scroll: false });

  const owners = useMemo(
    () =>
      [...new Set(rows.map((r) => r.owner))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (ownerFilter !== "ALL" && r.owner !== ownerFilter) return false;
      if (!q) return true;
      return (
        formatTruckOrderNo(r.seq).toLowerCase().includes(q) ||
        formatWoNumber(r.woSeq).toLowerCase().includes(q) ||
        (r.vtNumber?.toLowerCase().includes(q) ?? false) ||
        r.vehicleNo.toLowerCase().includes(q)
      );
    });
  }, [rows, search, ownerFilter]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${month}|${search}|${ownerFilter}`,
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <AlertTriangle className="text-amber-600" size={32} />
          Alerts
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TO#, WO #, VT# or vehicle no..."
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
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filter by truck owner"
            className={selectClass}
          >
            <option value="ALL">All Truck Owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <MonthNavigator month={month} onChange={changeMonth} />
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
                visible.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatTruckOrderNo(r.seq)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      {r.vtNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/work-orders/${r.woId}?from=alerts`}
                        className="font-medium text-[#0483ca] hover:underline"
                      >
                        {formatWoNumber(r.woSeq)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-medium whitespace-nowrap text-gray-900">
                      {r.vehicleNo}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      <button
                        type="button"
                        title="View who recorded this"
                        onClick={() =>
                          setStageInfo({
                            title: "Tare Weight",
                            rows: [
                              {
                                label: "Tare",
                                value: `${formatQty(r.tareWeight)} MT`,
                              },
                            ],
                            byName: r.tareByName,
                            at: r.tareAt,
                          })
                        }
                        className={cellButtonClass}
                      >
                        {formatQty(r.tareWeight)} MT
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      <button
                        type="button"
                        title="View who recorded this"
                        onClick={() =>
                          setStageInfo({
                            title: "Gross Weighment & Exit",
                            rows: [
                              {
                                label: "Gross",
                                value: `${formatQty(r.grossWeight)} MT`,
                              },
                              {
                                label: "Net",
                                value: `${formatQty(r.netWeight)} MT`,
                              },
                            ],
                            byName: r.completedByName,
                            at: r.completedAt,
                          })
                        }
                        className={cellButtonClass}
                      >
                        {formatQty(r.grossWeight)} MT
                        <span className="block text-xs font-medium text-green-700">
                          Net {formatQty(r.netWeight)} MT
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm whitespace-nowrap text-gray-600">
                      <button
                        type="button"
                        title="View who recorded this"
                        onClick={() =>
                          setStageInfo({
                            title: "Net Weight Received",
                            rows: [
                              {
                                label: "Net Weight Received",
                                value: `${formatQty(r.netWeightReceived)} MT`,
                              },
                            ],
                            byName: r.netReceivedByName,
                            at: r.netReceivedAt,
                          })
                        }
                        className={cellButtonClass}
                      >
                        {formatQty(r.netWeightReceived)} MT
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatQty(Math.min(r.netWeight, r.netWeightReceived))} MT
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold whitespace-nowrap text-gray-900">
                      {formatQty(
                        netDifference(r.netWeight, r.netWeightReceived)!,
                      )}{" "}
                      MT
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {r.invoiceId === null ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInvoiceInfo(r)}
                          title="View invoice"
                          className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                        >
                          Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-16 text-center"
                  >
                    <AlertTriangle
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {rows.length === 0
                        ? `No alerts in ${monthLabel(month)}`
                        : "No alerts match the current filters"}
                    </h3>
                    <p className="text-gray-500">
                      {rows.length === 0
                        ? "No net-weight discrepancies were recorded this month."
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
        noun="alerts"
        onLoadMore={loadMore}
      />

      {invoiceInfo?.invoiceId && invoiceInfo.invoiceSeq !== null && (
        <InvoiceInfoModal
          toNo={formatTruckOrderNo(invoiceInfo.seq)}
          invoiceNo={formatInvoiceNo(invoiceInfo.invoiceSeq)}
          invoiceId={invoiceInfo.invoiceId}
          onClose={() => setInvoiceInfo(null)}
        />
      )}

      {stageInfo && (
        <StageInfoModal info={stageInfo} onClose={() => setStageInfo(null)} />
      )}
    </div>
  );
}
