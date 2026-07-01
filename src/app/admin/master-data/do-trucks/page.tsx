import { prisma } from "@/core/db";

import {
  DoTrucksMasterClient,
  type DoTruckMasterRow,
} from "./do-trucks-client";

/** Admin → Master Data → DO Trucks. View-only list of the DO truck registry. */
export default async function DoTrucksMasterPage() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const trucks = await prisma.doTruck.findMany({
    select: { id: true, vehicleNo: true, createdAt: true },
    orderBy: { vehicleNo: "asc" },
  });

  const rows: DoTruckMasterRow[] = trucks.map((t) => ({
    id: t.id,
    vehicleNo: t.vehicleNo,
    createdYmd: ymd.format(t.createdAt),
  }));

  return <DoTrucksMasterClient rows={rows} />;
}
