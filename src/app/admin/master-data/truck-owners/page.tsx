import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function TruckOwnersPage() {
  const items = await prisma.truckOwner.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NameMasterClient entityKey="truckOwner" items={items} />;
}
