import { DeliveryOrderDetailScreen } from "@/features/delivery-orders/delivery-order-detail-screen";

/**
 * Admin → a single vessel → one of its delivery orders. Same DO detail as the
 * global route, but the back link returns to this vessel's DO list.
 */
export default async function VesselDeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; doId: string }>;
}) {
  const { id, doId } = await params;
  return (
    <DeliveryOrderDetailScreen
      id={doId}
      basePath="/admin/delivery-orders"
      backHref={`/admin/delivery-orders/vessels/${id}/orders`}
    />
  );
}
