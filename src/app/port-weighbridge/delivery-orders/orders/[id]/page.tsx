import { DeliveryOrderDetailScreen } from "@/features/delivery-orders/delivery-order-detail-screen";

/** Port Admin → a single delivery order: header + Truck DO data entry. */
export default async function PortWbDeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DeliveryOrderDetailScreen
      id={id}
      basePath="/port-weighbridge/delivery-orders"
    />
  );
}
