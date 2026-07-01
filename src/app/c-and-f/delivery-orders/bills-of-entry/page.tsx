import { BillsOfEntryScreen } from "@/features/delivery-orders/bills-of-entry-screen";

/** C&F → Delivery Orders → Bills of Entry. Full management (same as admin). */
export default async function CAndFBillsOfEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <BillsOfEntryScreen
      basePath="/c-and-f/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
