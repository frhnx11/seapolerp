import { DoVesselsScreen } from "@/features/delivery-orders/do-vessels-screen";

/** C&F → Delivery Orders → Vessels. View-only. */
export default async function CAndFDeliveryVesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <DoVesselsScreen
      basePath="/c-and-f/delivery-orders"
      canManage={false}
      linkable
      month={month}
    />
  );
}
