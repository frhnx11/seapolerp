import { WoTruckOrdersScreen } from "@/features/work-orders/wo-truck-orders-screen";

const BASE = "/port-weighbridge/work-orders";

export default async function PortWbWoTruckOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoTruckOrdersScreen id={id} basePath={BASE} />;
}
