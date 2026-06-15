import { prisma } from "@/core/db";
import { isNetDiscrepancy } from "@/features/work-orders/truck-order-lib";

import { AlertsClient, type AlertRow } from "./alerts-client";

/**
 * Net-weight discrepancy alerts across every work order — trips whose net sent
 * and net received differ by more than the tolerance. Filtered in JS (the
 * abs-difference comparison isn't expressible in the Prisma query builder; the
 * both-not-null `where` narrows to settled trips first).
 */
export async function AlertsScreen() {
  const trips = await prisma.truckOrder.findMany({
    where: { netWeight: { not: null }, netWeightReceived: { not: null } },
    orderBy: { seq: "desc" },
    include: {
      workOrder: { select: { seq: true } },
      truck: { select: { vehicleNo: true, owner: { select: { name: true } } } },
      invoice: { select: { seq: true } },
    },
  });

  const rows: AlertRow[] = trips
    .map((t) => ({
      id: t.id,
      seq: t.seq,
      woId: t.workOrderId,
      woSeq: t.workOrder.seq,
      vtNumber: t.vtNumber,
      vehicleNo: t.truck.vehicleNo,
      owner: t.truck.owner.name,
      tareWeight: t.tareWeight.toNumber(),
      grossWeight: t.grossWeight!.toNumber(),
      netWeight: t.netWeight!.toNumber(),
      netWeightReceived: t.netWeightReceived!.toNumber(),
      invoiceId: t.invoiceId,
      invoiceSeq: t.invoice?.seq ?? null,
      // Stage stamps — for the read-only "who recorded this" popups.
      tareByName: t.tareByName,
      tareAt: t.tareAt.toISOString(),
      completedByName: t.completedByName,
      completedAt: t.completedAt?.toISOString() ?? null,
      netReceivedByName: t.netReceivedByName,
      netReceivedAt: t.netReceivedAt?.toISOString() ?? null,
    }))
    .filter((r) => isNetDiscrepancy(r.netWeight, r.netWeightReceived));

  return <AlertsClient rows={rows} />;
}
