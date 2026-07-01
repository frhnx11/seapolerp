import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { DeliveryOrdersScreen } from "@/features/delivery-orders/delivery-orders-screen";

/** Port Admin → a single vessel → its Delivery Orders (scoped, view-only). */
export default async function PortWbVesselDeliveryOrdersPage({
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
    select: { id: true },
  });
  if (!vessel) notFound();

  return (
    <DeliveryOrdersScreen
      basePath="/port-weighbridge/delivery-orders"
      canManage={false}
      month={month}
      vesselId={id}
      backHref="/port-weighbridge/delivery-orders/vessels"
      backLabel="Back to Vessels"
    />
  );
}
