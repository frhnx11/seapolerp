import { DeliveryOrderDetailScreen } from "@/features/delivery-orders/delivery-order-detail-screen";

/** Admin → Delivery Orders → a single delivery order's detail page. */
export default async function AdminDeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DeliveryOrderDetailScreen id={id} basePath="/admin/delivery-orders" />
  );
}
