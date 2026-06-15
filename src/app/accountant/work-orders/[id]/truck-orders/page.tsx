import { WoTruckOrdersScreen } from "@/features/work-orders/wo-truck-orders-screen";

const BASE = "/accountant/work-orders";

export default async function AccountantWoTruckOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoTruckOrdersScreen id={id} basePath={BASE} variant="accountant" />;
}
