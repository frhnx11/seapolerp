import { DoVesselDetailScreen } from "@/features/delivery-orders/do-vessel-detail-screen";

/** Admin → Delivery Orders → a single vessel: header + BL/BE/DO cards. */
export default async function DoVesselDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DoVesselDetailScreen
      id={id}
      basePath="/admin/delivery-orders"
      cards={["/bills-of-lading", "/bills-of-entry", "/orders"]}
    />
  );
}
