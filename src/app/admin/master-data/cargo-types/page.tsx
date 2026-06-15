import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function CargoTypesPage() {
  const items = await prisma.cargoType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NameMasterClient entityKey="cargoType" items={items} />;
}
