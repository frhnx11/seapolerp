import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { AllottedTrucksClient } from "./allotted-trucks-client";

/**
 * The global allotted-trucks pool, shared across portals. Admin can allot/de-allot
 * (`readOnly = false`); Port WB, Party WB and Accountant see it read-only.
 */
export async function AllottedTrucksScreen({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
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
    prisma.allottedTruck.findMany({
      select: { truck: { select: truckSelect } },
      orderBy: { truck: { vehicleNo: "asc" } },
    }),
    // The full fleet is only needed to populate the allot modal (admin only).
    readOnly
      ? Promise.resolve([])
      : prisma.truck.findMany({
          orderBy: { vehicleNo: "asc" },
          select: truckSelect,
        }),
  ]);

  return (
    <div className="mx-auto max-w-[1600px]">
      <AllottedTrucksClient
        allottedTrucks={allotments.map((a) => ({
          ...a.truck,
          owner: a.truck.owner.name,
        }))}
        allTrucks={allTrucks.map((t) => ({ ...t, owner: t.owner.name }))}
        todayIso={getTodayIso()}
        readOnly={readOnly}
      />
    </div>
  );
}
