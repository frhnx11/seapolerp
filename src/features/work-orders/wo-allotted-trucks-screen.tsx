import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTodayIso } from "@/features/trucks/truck";
import { prisma } from "@/core/db";

import { AllottedTrucksClient } from "./allotted-trucks-client";
import { formatWoNumber } from "./work-order";
import { fetchWoHeader } from "./wo-header";

/** Trucks allotted to a work order (shared across portals; readOnly = no allotting). */
export async function WoAllottedTrucksScreen({
  id,
  basePath,
  readOnly = false,
}: {
  id: string;
  basePath: string;
  readOnly?: boolean;
}) {
  const workOrder = await fetchWoHeader(id);
  if (!workOrder) notFound();

  const truckSelect = {
    id: true,
    vehicleNo: true,
    wheels: true,
    ownerId: true,
    owner: { select: { name: true } },
    rcValidity: true,
    insuranceValidity: true,
    fcValidity: true,
    status: true,
  } as const;

  const [allotments, allTrucks] = await Promise.all([
    prisma.workOrderTruck.findMany({
      where: { workOrderId: id },
      select: { blocked: true, truck: { select: truckSelect } },
      orderBy: { truck: { vehicleNo: "asc" } },
    }),
    readOnly
      ? Promise.resolve([])
      : prisma.truck.findMany({
          orderBy: { vehicleNo: "asc" },
          select: truckSelect,
        }),
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

      <AllottedTrucksClient
        workOrderId={workOrder.id}
        allottedTrucks={allotments.map((a) => ({
          ...a.truck,
          owner: a.truck.owner.name,
          woBlocked: a.blocked,
        }))}
        allTrucks={allTrucks.map((t) => ({ ...t, owner: t.owner.name }))}
        todayIso={getTodayIso()}
        readOnly={readOnly}
      />
    </div>
  );
}
