import { prisma } from "@/core/db";

import { type WorkOrderOption } from "./truck-order-lib";

/**
 * Work orders offered in the gross-stage selector, newest first, with the
 * quantities the picker needs to show each one's remaining balance. Shared by
 * the global Truck Orders screen and a single work order's Truck Orders screen.
 */
export async function fetchWorkOrderOptions(): Promise<WorkOrderOption[]> {
  const workOrders = await prisma.workOrder.findMany({
    orderBy: { seq: "desc" },
    include: {
      vessel: { select: { name: true } },
      cargoType: { select: { name: true } },
      supplier: { select: { name: true } },
      party: { select: { name: true } },
    },
  });

  return workOrders.map((w) => ({
    id: w.id,
    seq: w.seq,
    vesselName: w.vessel.name,
    cargoTypeName: w.cargoType.name,
    supplierName: w.supplier.name,
    partyName: w.party.name,
    doQuantity: w.doQuantity.toNumber(),
    delivered: w.delivered.toNumber(),
  }));
}
