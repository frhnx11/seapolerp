import { BillsOfEntryScreen } from "@/features/delivery-orders/bills-of-entry-screen";

/** Admin → Delivery Orders → Bills of Entry. Group BLs into BEs. */
export default async function BillsOfEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <BillsOfEntryScreen
      basePath="/admin/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
