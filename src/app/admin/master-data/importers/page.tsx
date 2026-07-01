import { prisma } from "@/core/db";

import { NameMasterClient } from "../_components/name-master-client";

/** Admin → Master Data → Importers. */
export default async function ImportersPage() {
  const items = await prisma.importer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <NameMasterClient entityKey="importer" items={items} />;
}
