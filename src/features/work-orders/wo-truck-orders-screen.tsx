import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/core/db";

import { fetchWorkOrderOptions } from "./truck-order-options";
import { toTruckOrderRow, truckOrderInclude } from "./truck-order-row";
import { TruckOrdersClient } from "./truck-orders-client";
import { formatWoNumber } from "./work-order";
import { fetchWoHeader } from "./wo-header";

/**
 * A single work order's Truck Orders. Trips are created on the global Truck
 * Orders page (a new trip has no work order yet); they appear here once the gross
 * stage maps them to this work order. Editing the port stages (loading slip,
 * gross incl. re-picking the WO) and net received is allowed here too — same
 * server actions as the global page — but there is no "Create" button.
 */
export async function WoTruckOrdersScreen({
  id,
  basePath,
  variant = "port",
}: {
  id: string;
  basePath: string;
  /** Drives which columns are shown and editable (port/party/accountant/admin). */
  variant?: "port" | "party" | "accountant" | "admin";
}) {
  const workOrder = await fetchWoHeader(id);
  if (!workOrder) notFound();

  // Port/admin edit the port stages here, so they need the option lists; the
  // other portals don't. No trucks list — trips are never created from inside a
  // single work order.
  const isEditor = variant === "port" || variant === "admin";
  const [trips, loadingSites, workOrders] = await Promise.all([
    prisma.truckOrder.findMany({
      where: { workOrderId: workOrder.id },
      orderBy: { seq: "desc" },
      include: truckOrderInclude,
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
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={`${basePath}/${workOrder.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to {formatWoNumber(workOrder.seq)}
      </Link>

      <TruckOrdersClient
        trips={trips.map(toTruckOrderRow)}
        loadingSites={loadingSites}
        workOrders={workOrders}
        variant={variant}
        allowCreate={false}
      />
    </div>
  );
}
