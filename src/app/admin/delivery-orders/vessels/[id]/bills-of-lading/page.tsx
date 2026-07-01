import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { BillsOfLadingScreen } from "@/features/delivery-orders/bills-of-lading-screen";
import { formatDoVesselId } from "@/features/delivery-orders/do-vessel";

/** Admin → a single vessel → its Bills of Lading (scoped, no Vessel column). */
export default async function VesselBillsOfLadingPage({
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
    <BillsOfLadingScreen
      basePath="/admin/delivery-orders"
      canManage
      month={month}
      vesselId={id}
      backHref={`/admin/delivery-orders/vessels/${id}`}
      backLabel={`Back to ${formatDoVesselId(vessel.seq)} — ${vessel.name}`}
    />
  );
}
