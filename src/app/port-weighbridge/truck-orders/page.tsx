import { TruckOrdersScreen } from "@/features/work-orders/truck-orders-screen";

/** Port Weighbridge → Truck Orders (global). Create trips + record port stages. */
export default function PortWbTruckOrdersPage() {
  return <TruckOrdersScreen variant="port" />;
}
