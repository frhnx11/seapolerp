import { WorkOrderHubScreen } from "@/features/work-orders/wo-hub-screen";

const BASE = "/accountant/work-orders";

export default async function AccountantWorkOrderHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkOrderHubScreen id={id} basePath={BASE} withInvoices />;
}
