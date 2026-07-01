import { DeliveryOrderDetailScreen } from "@/features/delivery-orders/delivery-order-detail-screen";

/**
 * Port Admin → a vessel → one of its delivery orders. Truck DO data entry;
 * the back link returns to this vessel's DO list.
 */
export default async function PortWbVesselDeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; doId: string }>;
}) {
  const { id, doId } = await params;
  return (
    <DeliveryOrderDetailScreen
      id={doId}
      basePath="/port-weighbridge/delivery-orders"
      backHref={`/port-weighbridge/delivery-orders/vessels/${id}/orders`}
    />
  );
}
