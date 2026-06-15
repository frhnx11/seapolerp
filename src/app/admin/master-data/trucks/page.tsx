import { prisma } from "@/core/db";

import { getTodayIso } from "@/features/trucks/truck";
import { TrucksClient } from "./trucks-client";

/** Truck master — table + CRUD (admin-guarded by the /admin layout). */
export default async function TrucksPage() {
  const [trucks, owners] = await Promise.all([
    prisma.truck.findMany({
      orderBy: { vehicleNo: "asc" },
      select: {
        id: true,
        vehicleNo: true,
        wheels: true,
        ownerId: true,
        owner: { select: { name: true } },
        rcValidity: true,
        insuranceValidity: true,
        fcValidity: true,
        status: true,
      },
    }),
    prisma.truckOwner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <TrucksClient
      trucks={trucks.map((t) => ({ ...t, owner: t.owner.name }))}
      owners={owners}
      todayIso={getTodayIso()}
    />
  );
}
