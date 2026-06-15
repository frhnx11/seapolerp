import { WoTruckOrdersScreen } from "@/features/work-orders/wo-truck-orders-screen";

const BASE = "/party-weighbridge/work-orders";

export default async function PartyWbWoTruckOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoTruckOrdersScreen id={id} basePath={BASE} variant="party" />;
}
