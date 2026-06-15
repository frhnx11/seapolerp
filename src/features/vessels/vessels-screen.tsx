import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { VesselsClient, type VesselTrackRow } from "./vessels-client";

/** Vessel progress tracker — BL vs delivered across each vessel's work orders. */
export async function VesselsScreen({ month }: { month?: string }) {
  // Scoped to the active month (by creation date) so the query stays bounded.
  // Asia/Kolkata is a fixed +05:30 (no DST), so the month's IST boundaries map
  // to exact UTC instants.
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00+05:30`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00+05:30`);

  const vessels = await prisma.vessel.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { seq: "desc" },
    include: {
      workOrders: {
        select: { id: true, seq: true, doQuantity: true, delivered: true },
      },
    },
  });

  const rows: VesselTrackRow[] = vessels.map((v) => {
    const allocatedDo = v.workOrders.reduce(
      (sum, w) => sum + w.doQuantity.toNumber(),
      0,
    );
    const delivered = v.workOrders.reduce(
      (sum, w) => sum + w.delivered.toNumber(),
      0,
    );
    const blQuantity = v.blQuantity.toNumber();
    return {
      id: v.id,
      seq: v.seq,
      name: v.name,
      // Creation date as a business-day string (Asia/Kolkata), matching getTodayIso.
      createdYmd: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(v.createdAt),
      blQuantity,
      allocatedDo,
      delivered,
      balance: blQuantity - delivered,
      workOrders: v.workOrders
        .map((w) => ({ id: w.id, seq: w.seq }))
        .sort((a, b) => a.seq - b.seq),
    };
  });

  return <VesselsClient rows={rows} month={activeMonth} />;
}
