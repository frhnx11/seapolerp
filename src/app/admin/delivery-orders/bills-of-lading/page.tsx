import { BillsOfLadingScreen } from "@/features/delivery-orders/bills-of-lading-screen";

/** Admin → Delivery Orders → Bills of Lading. Create + list BLs. */
export default async function BillsOfLadingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <BillsOfLadingScreen
      basePath="/admin/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
