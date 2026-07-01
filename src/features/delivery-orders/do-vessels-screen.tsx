import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { type DoVesselRow } from "./do-vessel";
import { DoVesselsClient } from "./do-vessels-client";

/**
 * Delivery Orders → Vessels: the DO flow's vessel master (create + list).
 * Allocated DO = Σ of the vessel's delivery-order quantities; delivered = Σ of
 * their delivered amounts (0 until the truck-delivery layer increments it).
 */
export async function DoVesselsScreen({
  basePath,
  canManage,
  linkable = false,
  linkSuffix = "",
  month,
}: {
  basePath: string;
  canManage: boolean;
  linkable?: boolean;
  linkSuffix?: string;
  month?: string;
}) {
  // Table is scoped to the active month (by creation date); Asia/Kolkata is a
  // fixed +05:30, so the IST month boundaries map to exact UTC instants.
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00+05:30`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00+05:30`);

  const [vessels, doAgg] = await Promise.all([
    prisma.doVessel.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { seq: "desc" },
      select: {
        id: true,
        seq: true,
        name: true,
        totalQuantity: true,
        depth: true,
        hatch: true,
        arrivalDate: true,
        createdAt: true,
      },
    }),
    prisma.deliveryOrder.groupBy({
      by: ["vesselId"],
      _sum: { doQuantity: true, delivered: true },
    }),
  ]);

  const allocatedDoByVessel = new Map(
    doAgg.map((d) => [d.vesselId, d._sum.doQuantity?.toNumber() ?? 0]),
  );
  const deliveredByVessel = new Map(
    doAgg.map((d) => [d.vesselId, d._sum.delivered?.toNumber() ?? 0]),
  );

  const rows: DoVesselRow[] = vessels.map((v) => ({
    id: v.id,
    seq: v.seq,
    name: v.name,
    // Creation date as a business-day string (Asia/Kolkata).
    createdYmd: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(v.createdAt),
    totalQuantity: v.totalQuantity.toNumber(),
    // Σ of the vessel's delivery-order quantities.
    allocatedDo: allocatedDoByVessel.get(v.id) ?? 0,
    // Σ of this vessel's delivery-order delivered amounts (0 until the
    // truck-delivery layer increments DO.delivered); drives Status + Balance.
    delivered: deliveredByVessel.get(v.id) ?? 0,
    depth: v.depth.toNumber(),
    hatch: v.hatch.toNumber(),
    arrivalDate: v.arrivalDate
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
          v.arrivalDate,
        )
      : null,
  }));

  return (
    <DoVesselsClient
      vessels={rows}
      basePath={basePath}
      canManage={canManage}
      linkable={linkable}
      linkSuffix={linkSuffix}
      month={activeMonth}
    />
  );
}
