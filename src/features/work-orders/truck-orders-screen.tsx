import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { fetchWorkOrderOptions } from "./truck-order-options";
import { toTruckOrderRow, truckOrderInclude } from "./truck-order-row";
import { TruckOrdersClient } from "./truck-orders-client";

/**
 * The global Truck Orders page — every trip across all work orders, with the WO#
 * column. This is now the data-entry surface: port/admin create trips and record
 * the port stages (assigning the work order at gross), party records net received,
 * accountant views. A single work order's page (WoTruckOrdersScreen) is read-only.
 */
export async function TruckOrdersScreen({
  variant = "port",
}: {
  variant?: "port" | "party" | "accountant" | "admin";
}) {
  // Only port and admin create trips / record port stages, so the other portals
  // don't need the option lists (trucks, loading sites, work orders).
  const isEditor = variant === "port" || variant === "admin";

  const [trips, allotted, loadingSites, workOrders] = await Promise.all([
    prisma.truckOrder.findMany({
      orderBy: { seq: "desc" },
      include: truckOrderInclude,
    }),
    !isEditor
      ? Promise.resolve([])
      : prisma.allottedTruck.findMany({
          where: { truck: { status: { not: "BLOCKED" } } },
          select: { truck: { select: { id: true, vehicleNo: true } } },
          orderBy: { truck: { vehicleNo: "asc" } },
        }),
    !isEditor
      ? Promise.resolve([])
      : prisma.loadingSite.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
    !isEditor ? Promise.resolve([]) : fetchWorkOrderOptions(),
  ]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <TruckOrdersClient
        trips={trips.map(toTruckOrderRow)}
        trucks={allotted.map((a) => a.truck)}
        loadingSites={loadingSites}
        workOrders={workOrders}
        variant={variant}
        showWorkOrder
        todayIso={getTodayIso()}
      />
    </div>
  );
}
