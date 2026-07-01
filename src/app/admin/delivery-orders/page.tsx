import { DeliveryOrdersHub } from "@/features/delivery-orders/delivery-orders-hub";

/** Admin → Delivery Orders: entry cards for the delivery-order flow. */
export default function DeliveryOrdersPage() {
  return (
    <DeliveryOrdersHub
      basePath="/admin/delivery-orders"
      cards={[
        "/vessels",
        "/bills-of-lading",
        "/bills-of-entry",
        "/orders",
        "/reports",
      ]}
    />
  );
}
