import { TruckOrdersScreen } from "@/features/work-orders/truck-orders-screen";

/** Accountant → Truck Orders (global). Read-only, with lowest net + invoice status. */
export default function AccountantTruckOrdersPage() {
  return <TruckOrdersScreen variant="accountant" />;
}
