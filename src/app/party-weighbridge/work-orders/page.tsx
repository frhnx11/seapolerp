import { WorkOrdersScreen } from "@/features/work-orders/wo-list-screen";

const BASE = "/party-weighbridge/work-orders";

/** Party Weighbridge → Work Orders (view only; guarded by the segment layout). */
export default async function PartyWbWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <WorkOrdersScreen basePath={BASE} readOnly month={month} />;
}
