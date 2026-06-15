import { WorkOrderHubScreen } from "@/features/work-orders/wo-hub-screen";

const BASE = "/admin/work-orders";

export default async function AdminWorkOrderHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromAlerts = from === "alerts";
  return (
    <WorkOrderHubScreen
      id={id}
      basePath={BASE}
      withInvoices
      backHref={fromAlerts ? "/admin/alerts" : undefined}
      backLabel={fromAlerts ? "Back to Alerts" : undefined}
    />
  );
}
