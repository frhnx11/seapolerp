import { WoInvoicesScreen } from "@/features/invoices/wo-invoices-screen";

const BASE = "/accountant/work-orders";

export default async function AccountantWoInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoInvoicesScreen id={id} basePath={BASE} />;
}
