import { prisma } from "@/core/db";

import { VesselsClient } from "./vessels-client";

/** Vessel master — ships and their total quantities (admin-guarded by the layout). */
export default async function VesselsPage() {
  const [vessels, alloc] = await Promise.all([
    prisma.vessel.findMany({
      orderBy: { seq: "desc" },
      select: { id: true, seq: true, name: true, totalQuantity: true },
    }),
    prisma.workOrder.groupBy({
      by: ["vesselId"],
      _sum: { woQuantity: true },
    }),
  ]);

  const allocated = new Map(
    alloc.map((a) => [a.vesselId, a._sum.woQuantity?.toNumber() ?? 0]),
  );

  const rows = vessels.map((v) => {
    const total = v.totalQuantity.toNumber();
    const used = allocated.get(v.id) ?? 0;
    return {
      id: v.id,
      seq: v.seq,
      name: v.name,
      totalQuantity: total,
      allocatedWo: used,
      available: total - used,
    };
  });

  return <VesselsClient vessels={rows} />;
}
