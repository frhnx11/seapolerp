import { WorkOrdersScreen } from "@/features/work-orders/wo-list-screen";

const BASE = "/accountant/work-orders";

/** Accountant → Work Orders (view only; guarded by the segment layout). */
export default async function AccountantWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <WorkOrdersScreen basePath={BASE} readOnly month={month} />;
}
