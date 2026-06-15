import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function SuppliersPage() {
  const items = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NameMasterClient entityKey="supplier" items={items} />;
}
