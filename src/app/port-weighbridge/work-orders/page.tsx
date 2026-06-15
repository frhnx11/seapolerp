import { WorkOrdersScreen } from "@/features/work-orders/wo-list-screen";

const BASE = "/port-weighbridge/work-orders";

/** Port Weighbridge → Work Orders (view only; guarded by the segment layout). */
export default async function PortWbWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <WorkOrdersScreen basePath={BASE} readOnly month={month} />;
}
