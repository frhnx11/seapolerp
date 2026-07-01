import { DeliveryOrdersHub } from "@/features/delivery-orders/delivery-orders-hub";

/** C&F → Delivery Orders: entry cards for the delivery-order flow. */
export default function CAndFDeliveryOrdersPage() {
  return (
    <DeliveryOrdersHub
      basePath="/c-and-f/delivery-orders"
      cards={["/vessels", "/bills-of-lading", "/bills-of-entry"]}
    />
  );
}
