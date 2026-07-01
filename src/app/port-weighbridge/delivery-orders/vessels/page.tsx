import { DoVesselsScreen } from "@/features/delivery-orders/do-vessels-screen";

/** Port Admin → Delivery Orders → Vessels. View-only. */
export default async function PortWbDeliveryVesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return (
    <DoVesselsScreen
      basePath="/port-weighbridge/delivery-orders"
      canManage={false}
      linkable
      linkSuffix="/orders"
      month={month}
    />
  );
}
