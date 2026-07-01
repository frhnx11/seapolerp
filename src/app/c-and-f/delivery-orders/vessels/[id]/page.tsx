import { DoVesselDetailScreen } from "@/features/delivery-orders/do-vessel-detail-screen";

/** C&F → a single vessel: header + Bills of Lading / Bills of Entry cards. */
export default async function CAndFDoVesselDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DoVesselDetailScreen
      id={id}
      basePath="/c-and-f/delivery-orders"
      cards={["/bills-of-lading", "/bills-of-entry"]}
    />
  );
}
