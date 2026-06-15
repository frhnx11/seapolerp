import { WorkOrderHubScreen } from "@/features/work-orders/wo-hub-screen";

const BASE = "/party-weighbridge/work-orders";

export default async function PartyWbWorkOrderHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderHubScreen id={id} basePath={BASE} />;
}
