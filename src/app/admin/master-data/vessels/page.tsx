import { prisma } from "@/core/db";

import { VesselsClient } from "./vessels-client";

/** Vessel master — ships and their BL quantities (admin-guarded by the layout). */
export default async function VesselsPage() {
  const [vessels, alloc] = await Promise.all([
    prisma.vessel.findMany({
      orderBy: { seq: "desc" },
      select: { id: true, seq: true, name: true, blQuantity: true },
    }),
    prisma.workOrder.groupBy({
      by: ["vesselId"],
      _sum: { doQuantity: true },
    }),
  ]);

  const allocated = new Map(
    alloc.map((a) => [a.vesselId, a._sum.doQuantity?.toNumber() ?? 0]),
  );

  const rows = vessels.map((v) => {
    const bl = v.blQuantity.toNumber();
    const used = allocated.get(v.id) ?? 0;
    return {
      id: v.id,
      seq: v.seq,
      name: v.name,
      blQuantity: bl,
      allocatedDo: used,
      available: bl - used,
    };
  });

  return <VesselsClient vessels={rows} />;
}
