import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";
import { isNetDiscrepancy } from "@/features/work-orders/truck-order-lib";

import { AlertsClient, type AlertRow } from "./alerts-client";

/**
 * Net-weight discrepancy alerts across every work order — trips whose net sent
 * and net received differ by more than the tolerance. Scoped to the month the
 * alert was created (when the party's net weight received was recorded), so the
 * query never grows past one window. The abs-difference comparison isn't
 * expressible in the Prisma query builder, so it's filtered in JS after the
 * both-not-null + month `where` narrows to that month's settled trips.
 */
export async function AlertsScreen({ month }: { month?: string }) {
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00.000Z`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00.000Z`);

  const trips = await prisma.truckOrder.findMany({
    where: {
      netWeight: { not: null },
      netWeightReceived: { not: null },
      netReceivedAt: { gte: start, lt: end },
    },
    orderBy: { netReceivedAt: "desc" },
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
      // A trip with net weights recorded has passed the gross stage, so it is
      // always mapped to a work order (same guarantee as the weights below).
      woId: t.workOrderId!,
      woSeq: t.workOrder!.seq,
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

  return <AlertsClient rows={rows} month={activeMonth} />;
}
