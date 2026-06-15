import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/core/db";

import { type TruckOrderRow, type TruckOrderStatus } from "./truck-order-lib";
import { TruckOrdersClient } from "./truck-orders-client";
import { formatWoNumber } from "./work-order";
import { fetchWoHeader } from "./wo-header";

/** Truck Orders for a work order — the pipeline grid (shared across portals). */
export async function WoTruckOrdersScreen({
  id,
  basePath,
  variant = "port",
}: {
  id: string;
  basePath: string;
  /** "party"/"accountant" are read-only; "admin" sees + edits everything. */
  variant?: "port" | "party" | "accountant" | "admin";
}) {
  const workOrder = await fetchWoHeader(id);
  if (!workOrder) notFound();

  // Only port and admin create trips or issue slips, so the read-only views
  // don't need the truck/loading-site option lists.
  const needsPortOptions = variant === "port" || variant === "admin";
  const [trips, allotments, loadingSites] = await Promise.all([
    prisma.truckOrder.findMany({
      where: { workOrderId: workOrder.id },
      orderBy: { seq: "desc" },
      include: {
        truck: {
          select: {
            vehicleNo: true,
            wheels: true,
            owner: { select: { name: true } },
          },
        },
        loadingSite: { select: { name: true } },
        invoice: { select: { seq: true } },
      },
    }),
    !needsPortOptions
      ? Promise.resolve([])
      : prisma.workOrderTruck.findMany({
          where: {
            workOrderId: workOrder.id,
            blocked: false,
            truck: { status: { not: "BLOCKED" } },
          },
          select: { truck: { select: { id: true, vehicleNo: true } } },
          orderBy: { truck: { vehicleNo: "asc" } },
        }),
    !needsPortOptions
      ? Promise.resolve([])
      : prisma.loadingSite.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
  ]);

  const rows: TruckOrderRow[] = trips.map((t) => ({
    id: t.id,
    seq: t.seq,
    status: t.status as TruckOrderStatus,
    truckId: t.truckId,
    vehicleNo: t.truck.vehicleNo,
    wheels: t.truck.wheels,
    owner: t.truck.owner.name,
    tareWeight: t.tareWeight.toNumber(),
    tareByName: t.tareByName,
    tareAt: t.tareAt.toISOString(),
    loadingSiteId: t.loadingSiteId,
    loadingSiteName: t.loadingSite?.name ?? null,
    loadingSlipByName: t.loadingSlipByName,
    loadingSlipAt: t.loadingSlipAt?.toISOString() ?? null,
    vtNumber: t.vtNumber,
    grossWeight: t.grossWeight?.toNumber() ?? null,
    netWeight: t.netWeight?.toNumber() ?? null,
    completedByName: t.completedByName,
    completedAt: t.completedAt?.toISOString() ?? null,
    netWeightReceived: t.netWeightReceived?.toNumber() ?? null,
    netReceivedByName: t.netReceivedByName,
    netReceivedAt: t.netReceivedAt?.toISOString() ?? null,
    invoiceId: t.invoiceId,
    invoiceSeq: t.invoice?.seq ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={`${basePath}/${workOrder.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to {formatWoNumber(workOrder.seq)}
      </Link>

      <TruckOrdersClient
        workOrderId={workOrder.id}
        wo={workOrder}
        trips={rows}
        trucks={allotments.map((a) => a.truck)}
        loadingSites={loadingSites}
        variant={variant}
      />
    </div>
  );
}
