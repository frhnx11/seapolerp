import { WorkOrdersScreen } from "@/features/work-orders/wo-list-screen";

const BASE = "/admin/work-orders";

/** Admin → Work Orders (full access; admin-guarded by the /admin layout). */
export default async function AdminWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <WorkOrdersScreen basePath={BASE} month={month} />;
}
