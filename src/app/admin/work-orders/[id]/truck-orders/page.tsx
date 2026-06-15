import { WoTruckOrdersScreen } from "@/features/work-orders/wo-truck-orders-screen";

const BASE = "/admin/work-orders";

export default async function AdminWoTruckOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoTruckOrdersScreen id={id} basePath={BASE} variant="admin" />;
}
