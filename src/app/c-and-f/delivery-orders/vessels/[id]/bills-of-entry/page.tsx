import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { BillsOfEntryScreen } from "@/features/delivery-orders/bills-of-entry-screen";
import { formatDoVesselId } from "@/features/delivery-orders/do-vessel";

/** C&F → a single vessel → its Bills of Entry (scoped, full management). */
export default async function CAndFVesselBillsOfEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month } = await searchParams;
  const vessel = await prisma.doVessel.findUnique({
    where: { id },
    select: { seq: true, name: true },
  });
  if (!vessel) notFound();

  return (
    <BillsOfEntryScreen
      basePath="/c-and-f/delivery-orders"
      canManage
      month={month}
      vesselId={id}
      backHref={`/c-and-f/delivery-orders/vessels/${id}`}
      backLabel={`Back to ${formatDoVesselId(vessel.seq)} — ${vessel.name}`}
    />
  );
}
