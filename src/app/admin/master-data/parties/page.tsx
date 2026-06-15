import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

export default async function PartiesPage() {
  const parties = await prisma.party.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, rate: true },
  });
  const items = parties.map((p) => ({
    id: p.id,
    name: p.name,
    rate: p.rate?.toNumber() ?? null,
  }));

  return <NameMasterClient entityKey="party" items={items} />;
}
