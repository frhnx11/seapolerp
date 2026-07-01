import { DeliveryOrdersHub } from "@/features/delivery-orders/delivery-orders-hub";

/** Port Admin → Delivery Orders: Vessels + Delivery Orders only. */
export default function PortWbDeliveryOrdersPage() {
  return (
    <DeliveryOrdersHub
      basePath="/port-weighbridge/delivery-orders"
      cards={["/vessels", "/orders"]}
    />
  );
}
