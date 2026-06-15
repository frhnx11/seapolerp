import { AllInvoicesScreen } from "@/features/invoices/all-invoices-screen";

export default async function AccountantInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <AllInvoicesScreen date={date} />;
}
