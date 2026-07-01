import { DeliveryOrdersScreen } from "@/features/delivery-orders/delivery-orders-screen";

/** Admin → Delivery Orders → Delivery Orders. Create + list DOs. */
export default async function AdminDeliveryOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <DeliveryOrdersScreen
      basePath="/admin/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
