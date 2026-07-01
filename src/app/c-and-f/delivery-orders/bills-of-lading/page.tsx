import { BillsOfLadingScreen } from "@/features/delivery-orders/bills-of-lading-screen";

/** C&F → Delivery Orders → Bills of Lading. View-only. */
export default async function CAndFBillsOfLadingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <BillsOfLadingScreen
      basePath="/c-and-f/delivery-orders"
      canManage={false}
      month={month}
    />
  );
}
