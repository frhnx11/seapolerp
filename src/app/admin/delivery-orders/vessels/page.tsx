import { DoVesselsScreen } from "@/features/delivery-orders/do-vessels-screen";

/** Admin → Delivery Orders → Vessels. Create + list the DO flow's vessels. */
export default async function DeliveryVesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <DoVesselsScreen
      basePath="/admin/delivery-orders"
      canManage
      linkable
      month={month}
    />
  );
}
