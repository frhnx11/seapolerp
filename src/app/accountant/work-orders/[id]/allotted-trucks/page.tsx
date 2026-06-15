import { WoAllottedTrucksScreen } from "@/features/work-orders/wo-allotted-trucks-screen";

const BASE = "/accountant/work-orders";

export default async function AccountantWoAllottedTrucksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WoAllottedTrucksScreen id={id} basePath={BASE} readOnly />;
}
