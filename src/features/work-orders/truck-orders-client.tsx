"use client";

import { Plus, ReceiptText, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LoadMoreFooter } from "@/components/load-more-footer";
import { usePagination } from "@/components/use-pagination";
import { formatQty } from "@/core/format";
import { BUSINESS_TIME_ZONE } from "@/features/trucks/truck";

import { CreateTruckOrderModal } from "./create-truck-order-modal";
import { InvoiceInfoModal } from "./invoice-info-modal";
import {
  GrossModal,
  LoadingSlipModal,
  NetReceivedModal,
  type StageKey,
} from "./truck-order-stage-modals";
import {
  type EditLock,
  evaluateEditLock,
  formatTruckOrderNo,
  isNetDiscrepancy,
  type TruckOrderRow,
  type TruckOption,
  truckOrderStatusIndex,
  type WorkOrderOption,
} from "./truck-order-lib";
import { formatInvoiceNo } from "@/features/invoices/invoice-lib";
import { formatWoNumber, type Option } from "./work-order";

/** Which role is viewing the grid. Drives the column registry below. */
type Variant = "port" | "party" | "accountant" | "admin";

/** Roles that may create trips and edit the port stages (tare / slip / gross). */
const PORT_OPS: Variant[] = ["port", "admin"];
/** Roles that may edit the destination's Net Weight Received. */
const PARTY_OPS: Variant[] = ["party", "admin"];

const ALL_VARIANTS: Variant[] = ["port", "party", "accountant", "admin"];

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]";

function StageActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex rounded-lg bg-[#0483ca] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0372b0]"
    >
      {label}
    </button>
  );
}

function LockedCell() {
  return <span className="text-sm text-gray-300">—</span>;
}

/** Wraps a cell's content in a button that opens its editor popup. */
function EditTrigger({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-m-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-blue-50"
      title={title}
    >
      {children}
    </button>
  );
}

/** Tare cell value — shared by the editable and read-only renders. */
function TareSummary({ trip }: { trip: TruckOrderRow }) {
  return (
    <span className="text-sm font-medium text-gray-900">
      {formatQty(trip.tareWeight)} MT
    </span>
  );
}

/** Gross/Exit cell value (gross + derived net) — shared by both renders. */
function GrossSummary({ trip }: { trip: TruckOrderRow }) {
  return (
    <>
      <span className="text-sm font-medium text-gray-900">
        {trip.grossWeight !== null ? `${formatQty(trip.grossWeight)} MT` : "—"}
      </span>
      {trip.netWeight !== null && (
        <span className="block text-xs font-medium text-green-700">
          Net {formatQty(trip.netWeight)} MT
        </span>
      )}
    </>
  );
}

type CellContext = {
  trip: TruckOrderRow;
  /** Whether this column is editable for the current variant. */
  editable: boolean;
  openTare: (trip: TruckOrderRow) => void;
  openStage: (stage: StageKey, trip: TruckOrderRow) => void;
  openInvoiceInfo: (trip: TruckOrderRow) => void;
};

type ColumnDef = {
  key: string;
  header: string;
  /** Variants that show this column. */
  visibleFor: Variant[];
  /** Variants that may edit it (subset of visibleFor); others see it read-only. */
  editableFor: Variant[];
  /** Shown only on the global Truck Orders page (hidden on a single WO's page). */
  globalOnly?: boolean;
  render: (ctx: CellContext) => React.ReactNode;
};

/**
 * The single source of truth for the Truck Orders grid: each column declares
 * who sees it and who can edit it, so headers and cells can never drift and a
 * role's view is just `filter(c => c.visibleFor.includes(variant))`.
 */
const TRUCK_ORDER_COLUMNS: ColumnDef[] = [
  {
    key: "to",
    header: "TO#",
    visibleFor: ALL_VARIANTS,
    editableFor: [],
    render: ({ trip }) => (
      <span className="text-sm font-semibold whitespace-nowrap text-gray-900">
        {formatTruckOrderNo(trip.seq)}
      </span>
    ),
  },
  {
    key: "vt",
    header: "VT#",
    visibleFor: ALL_VARIANTS,
    editableFor: [],
    render: ({ trip }) =>
      trip.vtNumber ? (
        <span className="text-sm font-medium whitespace-nowrap text-gray-900">
          {trip.vtNumber}
        </span>
      ) : (
        <span className="text-sm text-gray-300">—</span>
      ),
  },
  {
    key: "truck",
    header: "Truck",
    visibleFor: ALL_VARIANTS,
    editableFor: [],
    render: ({ trip }) => (
      <span className="text-sm font-medium whitespace-nowrap text-gray-900">
        {trip.vehicleNo}
      </span>
    ),
  },
  {
    key: "workOrder",
    header: "WO#",
    visibleFor: ALL_VARIANTS,
    editableFor: [],
    // Only the global page shows this — a single WO's page is already scoped.
    globalOnly: true,
    render: ({ trip }) =>
      trip.workOrderSeq !== null ? (
        <span className="text-sm font-semibold whitespace-nowrap text-gray-900">
          {formatWoNumber(trip.workOrderSeq)}
        </span>
      ) : (
        <span className="text-sm text-gray-300">—</span>
      ),
  },
  {
    key: "tare",
    header: "Tare",
    visibleFor: ALL_VARIANTS,
    editableFor: PORT_OPS,
    // Tare is recorded when the trip is created, so it is always present.
    render: ({ trip, editable, openTare }) =>
      editable ? (
        <EditTrigger title="Tare weight" onClick={() => openTare(trip)}>
          <TareSummary trip={trip} />
        </EditTrigger>
      ) : (
        <TareSummary trip={trip} />
      ),
  },
  {
    key: "loadingSlip",
    header: "Loading Slip",
    visibleFor: PORT_OPS,
    editableFor: PORT_OPS,
    render: ({ trip, editable, openStage }) => {
      // Loading slip is the stage right after tare (status index 0 -> 1).
      if (truckOrderStatusIndex(trip.status) < 1) {
        return editable ? (
          <StageActionButton
            label="Issue Slip"
            onClick={() => openStage("loadingSlip", trip)}
          />
        ) : (
          <LockedCell />
        );
      }
      const body = (
        <span className="text-sm font-medium text-gray-900">
          {trip.loadingSiteName ?? "—"}
        </span>
      );
      return editable ? (
        <EditTrigger
          title="Edit loading slip"
          onClick={() => openStage("loadingSlip", trip)}
        >
          {body}
        </EditTrigger>
      ) : (
        <div>{body}</div>
      );
    },
  },
  {
    key: "gross",
    header: "Gross / Exit",
    visibleFor: ALL_VARIANTS,
    editableFor: PORT_OPS,
    render: ({ trip, editable, openStage }) => {
      // Gross completes the trip (status index reaches 2); it can only be
      // entered once the loading slip is issued (index 1).
      if (truckOrderStatusIndex(trip.status) < 2) {
        return editable && truckOrderStatusIndex(trip.status) === 1 ? (
          <StageActionButton
            label="Enter Gross"
            onClick={() => openStage("gross", trip)}
          />
        ) : (
          <LockedCell />
        );
      }
      if (!editable) {
        return (
          <div>
            <GrossSummary trip={trip} />
          </div>
        );
      }
      return (
        <EditTrigger
          title="Gross weighment"
          onClick={() => openStage("gross", trip)}
        >
          <GrossSummary trip={trip} />
        </EditTrigger>
      );
    },
  },
  {
    key: "netReceived",
    header: "Net Weight Received",
    visibleFor: ["party", "accountant", "admin"],
    editableFor: PARTY_OPS,
    render: ({ trip, editable, openStage }) => {
      if (trip.netWeightReceived === null) {
        // Recordable only once the trip is completed at the port.
        return editable && trip.status === "COMPLETED" ? (
          <StageActionButton
            label="Enter Net"
            onClick={() => openStage("netReceived", trip)}
          />
        ) : (
          <LockedCell />
        );
      }
      const body = (
        <span className="text-sm font-medium text-gray-900">
          {formatQty(trip.netWeightReceived)} MT
        </span>
      );
      return editable ? (
        <EditTrigger
          title="Edit net weight received"
          onClick={() => openStage("netReceived", trip)}
        >
          {body}
        </EditTrigger>
      ) : (
        <div>{body}</div>
      );
    },
  },
  {
    key: "lowestNet",
    header: "Lowest Net Weight",
    visibleFor: ["accountant", "admin"],
    editableFor: [],
    // Settlement weight = min(net sent at port, net received at destination).
    render: ({ trip }) => {
      if (trip.netWeight === null || trip.netWeightReceived === null) {
        return <LockedCell />;
      }
      return (
        <span className="text-sm font-semibold text-gray-900">
          {formatQty(Math.min(trip.netWeight, trip.netWeightReceived))} MT
        </span>
      );
    },
  },
  {
    key: "invoice",
    header: "Invoice",
    visibleFor: ["accountant", "admin"],
    editableFor: [],
    // Billing status — blank until the trip is settled (lowest net computable),
    // then Pending until it lands on an invoice, then Done (click for which one).
    render: ({ trip, openInvoiceInfo }) => {
      if (trip.netWeight === null || trip.netWeightReceived === null) {
        return <LockedCell />;
      }
      return trip.invoiceId === null ? (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          Pending
        </span>
      ) : (
        <button
          type="button"
          onClick={() => openInvoiceInfo(trip)}
          title="View invoice"
          className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        >
          Done
        </button>
      );
    },
  },
];

export function TruckOrdersClient({
  trips,
  variant = "port",
  allowCreate = true,
  showWorkOrder = false,
  trucks = [],
  loadingSites = [],
  workOrders = [],
  todayIso,
}: {
  trips: TruckOrderRow[];
  /**
   * Drives the column registry (see TRUCK_ORDER_COLUMNS):
   * - "port": create trips and edit tare / loading slip / gross.
   * - "party": port stages are read-only; their input is Net Weight Received.
   * - "accountant": fully read-only, plus the derived Lowest Net Weight.
   * - "admin": the full picture — every column, with port + party editing.
   */
  variant?: Variant;
  /**
   * Whether the "Create New Truck Order" button is offered. The global page
   * allows it; a single WO's page does not (a new trip has no work order yet, so
   * it can't appear under that WO). Per-role cell editing is independent of this
   * — that's driven entirely by the variant column registry.
   */
  allowCreate?: boolean;
  /** Show the WO# column (the global page) — hidden on a single WO's page. */
  showWorkOrder?: boolean;
  /** Allotted-pool trucks for the create modal (editor variants only). */
  trucks?: TruckOption[];
  /** Loading sites for the loading-slip modal (editor variants only). */
  loadingSites?: Option[];
  /** Work orders offered in the gross-stage selector (editor variants only). */
  workOrders?: WorkOrderOption[];
  /**
   * Today's business date (YYYY-MM-DD) — only the global page passes it, to seed
   * and enable the creation-date filter. Absent on a single WO's page.
   */
  todayIso?: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTare, setEditingTare] = useState<TruckOrderRow | null>(null);
  const [activeStage, setActiveStage] = useState<{
    stage: StageKey;
    trip: TruckOrderRow;
  } | null>(null);
  const [invoiceInfo, setInvoiceInfo] = useState<TruckOrderRow | null>(null);
  // Ticking wall-clock for the edit-window check. Starts at 0 (never read during
  // SSR — only popups, which open post-mount, consume it) and syncs to the real
  // clock on mount, then every 30s so an open page locks values as they expire.
  const [now, setNow] = useState(0);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  // Creation-date filter (global page only). Seeded to today; "" means all days.
  const [dateFilter, setDateFilter] = useState(todayIso ?? "");
  // One formatter, reused across the list — business-TZ YYYY-MM-DD, matching the
  // seeded `todayIso` (also Asia/Kolkata) so a trip's day compares correctly.
  const createdDateFmt = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }),
    [],
  );

  const visibleColumns = useMemo(
    () =>
      TRUCK_ORDER_COLUMNS.filter(
        (c) =>
          c.visibleFor.includes(variant) && (!c.globalOnly || showWorkOrder),
      ),
    [variant, showWorkOrder],
  );
  // Port-ops roles (port/admin) edit the port stages; creating a brand-new trip
  // additionally requires the surface to allow it (the global page, not a WO's).
  const canDoPortOps = PORT_OPS.includes(variant);
  const canCreate = canDoPortOps && allowCreate;

  // Empty-state hint, accurate to who's looking and where.
  const emptyHint = canCreate
    ? "Create the first one when a truck arrives at the weighbridge."
    : showWorkOrder
      ? "Truck orders appear here once the port weighbridge records them."
      : "Truck orders appear here once they're assigned to this work order at the gross stage.";

  const refresh = () => router.refresh();
  const closeStage = () => setActiveStage(null);
  const openStage = (stage: StageKey, trip: TruckOrderRow) =>
    setActiveStage({ stage, trip });

  // Modal state holds a row snapshot; re-resolve against the fresh rows so
  // stamps like "Last updated by" update right after an in-popup save.
  const freshTrip = (t: TruckOrderRow) => trips.find((x) => x.id === t.id) ?? t;

  // The 30-minute editing window for a value, evaluated against the ticking
  // clock (`now`, below). The server action re-checks it authoritatively on save.
  const lockFor = (t: TruckOrderRow, firstEnteredAt: string | null): EditLock =>
    evaluateEditLock({
      firstEnteredAt,
      isAdmin: variant === "admin",
      invoiced: t.invoiceId !== null,
      now,
    });

  // Several stations work this grid at once — keep every screen ≤15s stale.
  // RSC refresh preserves open modals and their form state.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  // Sync the edit-window clock to the client just after mount, then tick every
  // 30s so a popup opened later sees an up-to-date window (the server is
  // authoritative). The first sync is deferred off the effect body to avoid a
  // synchronous render cascade.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  const owners = useMemo(
    () =>
      [...new Set(trips.map((t) => t.owner))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [trips],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (ownerFilter !== "ALL" && t.owner !== ownerFilter) return false;
      if (
        dateFilter &&
        createdDateFmt.format(new Date(t.createdAt)) !== dateFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        formatTruckOrderNo(t.seq).toLowerCase().includes(q) ||
        (t.vtNumber?.toLowerCase().includes(q) ?? false) ||
        t.vehicleNo.toLowerCase().includes(q)
      );
    });
  }, [trips, search, ownerFilter, dateFilter, createdDateFmt]);

  const { visible, hasMore, shown, total, loadMore } = usePagination(
    filtered,
    `${search}|${ownerFilter}|${dateFilter}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold text-gray-900">
          <ReceiptText className="text-[#0483ca]" size={26} />
          Truck Orders
        </h2>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by TO#, VT# or vehicle no..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pr-9 pl-10 text-sm transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filter by owner"
            className={`${selectClass} w-44`}
          >
            <option value="ALL">All Owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {showWorkOrder && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by creation date"
              title="Truck orders created on this date"
              className={selectClass}
            />
          )}
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
            >
              <Plus size={20} />
              <span>Create New Truck Order</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                visible.map((trip) => (
                  <tr
                    key={trip.id}
                    className={`align-top ${isNetDiscrepancy(trip.netWeight, trip.netWeightReceived) ? "bg-red-50" : ""}`}
                  >
                    {visibleColumns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        {c.render({
                          trip,
                          editable: c.editableFor.includes(variant),
                          openTare: setEditingTare,
                          openStage,
                          openInvoiceInfo: setInvoiceInfo,
                        })}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-6 py-16 text-center"
                  >
                    <ReceiptText
                      size={48}
                      className="mx-auto mb-4 text-gray-200"
                    />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      {trips.length === 0
                        ? "No truck orders yet"
                        : "No truck orders found"}
                    </h3>
                    <p className="text-gray-500">
                      {trips.length > 0
                        ? "Try a different search or filter."
                        : emptyHint}
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
        noun="truck orders"
        onLoadMore={loadMore}
      />

      {canCreate && showCreate && (
        <CreateTruckOrderModal
          trucks={trucks}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
      {canDoPortOps &&
        editingTare &&
        (() => {
          const t = freshTrip(editingTare);
          return (
            <CreateTruckOrderModal
              trucks={trucks}
              trip={t}
              lock={lockFor(t, t.createdAt)}
              onClose={() => setEditingTare(null)}
              onSaved={() => {
                setEditingTare(null);
                refresh();
              }}
              onDeleted={() => {
                setEditingTare(null);
                refresh();
              }}
            />
          );
        })()}
      {activeStage?.stage === "loadingSlip" &&
        (() => {
          const t = freshTrip(activeStage.trip);
          return (
            <LoadingSlipModal
              trip={t}
              lock={lockFor(t, t.loadingSlipFirstAt)}
              loadingSites={loadingSites}
              onClose={closeStage}
              onSaved={refresh}
            />
          );
        })()}
      {activeStage?.stage === "gross" &&
        (() => {
          const t = freshTrip(activeStage.trip);
          return (
            <GrossModal
              trip={t}
              lock={lockFor(t, t.grossFirstAt)}
              workOrders={workOrders}
              onClose={closeStage}
              onSaved={() => {
                closeStage();
                refresh();
              }}
            />
          );
        })()}
      {activeStage?.stage === "netReceived" &&
        (() => {
          const t = freshTrip(activeStage.trip);
          return (
            <NetReceivedModal
              trip={t}
              lock={lockFor(t, t.netReceivedFirstAt)}
              onClose={closeStage}
              onSaved={() => {
                closeStage();
                refresh();
              }}
            />
          );
        })()}
      {invoiceInfo?.invoiceId && invoiceInfo.invoiceSeq !== null && (
        <InvoiceInfoModal
          toNo={formatTruckOrderNo(invoiceInfo.seq)}
          invoiceNo={formatInvoiceNo(invoiceInfo.invoiceSeq)}
          invoiceId={invoiceInfo.invoiceId}
          onClose={() => setInvoiceInfo(null)}
        />
      )}
    </div>
  );
}
