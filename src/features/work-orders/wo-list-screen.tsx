import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { WorkOrdersClient } from "./work-orders-client";

/** The work-orders list, shared across role portals via basePath/readOnly. */
export async function WorkOrdersScreen({
  basePath,
  readOnly = false,
  month,
}: {
  basePath: string;
  readOnly?: boolean;
  /** Active month window "YYYY-MM"; defaults to the current business month. */
  month?: string;
}) {
  const activeMonth = month ?? getTodayIso().slice(0, 7);

  const [workOrders, suppliers, parties, vessels, cargoTypes, alloc] =
    await Promise.all([
      // Scoped to the active month so the query never grows past one window.
      prisma.workOrder.findMany({
        where: { date: { startsWith: `${activeMonth}-` } },
        orderBy: { seq: "desc" },
        include: {
          vessel: { select: { name: true } },
          cargoType: { select: { name: true } },
          supplier: { select: { name: true } },
          party: { select: { name: true } },
          _count: { select: { truckOrders: true } },
        },
      }),
      prisma.supplier.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.party.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.vessel.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, blQuantity: true },
      }),
      prisma.cargoType.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.workOrder.groupBy({
        by: ["vesselId"],
        _sum: { doQuantity: true },
      }),
    ]);

  const rows = workOrders.map((w) => ({
    id: w.id,
    seq: w.seq,
    date: w.date,
    vesselId: w.vesselId,
    vesselName: w.vessel.name,
    cargoTypeId: w.cargoTypeId,
    cargoTypeName: w.cargoType.name,
    supplierId: w.supplierId,
    supplierName: w.supplier.name,
    partyId: w.partyId,
    partyName: w.party.name,
    doQuantity: w.doQuantity.toNumber(),
    delivered: w.delivered.toNumber(),
    balance: w.doQuantity.minus(w.delivered).toNumber(),
    bePermissionNo: w.bePermissionNo,
    eaIaNo: w.eaIaNo,
    eaIaDate: w.eaIaDate,
    sbBeNo: w.sbBeNo,
    sbBeDate: w.sbBeDate,
    truckOrderCount: w._count.truckOrders,
  }));

  const allocated = new Map(
    alloc.map((a) => [a.vesselId, a._sum.doQuantity?.toNumber() ?? 0]),
  );
  const vesselOptions = vessels.map((v) => ({
    id: v.id,
    name: v.name,
    blQuantity: v.blQuantity.toNumber(),
    allocatedDo: allocated.get(v.id) ?? 0,
  }));

  return (
    <WorkOrdersClient
      rows={rows}
      suppliers={suppliers}
      parties={parties}
      vessels={vesselOptions}
      cargoTypes={cargoTypes}
      basePath={basePath}
      readOnly={readOnly}
      month={activeMonth}
    />
  );
}
