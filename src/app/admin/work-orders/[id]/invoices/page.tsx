import { WoInvoicesScreen } from "@/features/invoices/wo-invoices-screen";

const BASE = "/admin/work-orders";

export default async function AdminWoInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoInvoicesScreen id={id} basePath={BASE} />;
}
