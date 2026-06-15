import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function LoadingSitesPage() {
  const items = await prisma.loadingSite.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NameMasterClient entityKey="loadingSite" items={items} />;
}
