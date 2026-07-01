import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { BillsOfLadingScreen } from "@/features/delivery-orders/bills-of-lading-screen";
import { formatDoVesselId } from "@/features/delivery-orders/do-vessel";

/** C&F → a single vessel → its Bills of Lading (scoped, view-only). */
export default async function CAndFVesselBillsOfLadingPage({
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
      basePath="/c-and-f/delivery-orders"
      canManage={false}
      month={month}
      vesselId={id}
      backHref={`/c-and-f/delivery-orders/vessels/${id}`}
      backLabel={`Back to ${formatDoVesselId(vessel.seq)} — ${vessel.name}`}
    />
  );
}
