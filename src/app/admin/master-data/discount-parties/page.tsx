import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function DiscountPartiesPage() {
  const items = await prisma.discountParty.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NameMasterClient entityKey="discountParty" items={items} />;
}
