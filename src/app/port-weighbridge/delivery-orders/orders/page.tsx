import { DeliveryOrdersScreen } from "@/features/delivery-orders/delivery-orders-screen";

/** Port Admin → Delivery Orders → Delivery Orders. View-only list. */
export default async function PortWbDeliveryOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <DeliveryOrdersScreen
      basePath="/port-weighbridge/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
