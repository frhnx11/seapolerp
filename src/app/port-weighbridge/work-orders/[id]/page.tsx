import { WorkOrderHubScreen } from "@/features/work-orders/wo-hub-screen";

const BASE = "/port-weighbridge/work-orders";

export default async function PortWbWorkOrderHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderHubScreen id={id} basePath={BASE} />;
}
