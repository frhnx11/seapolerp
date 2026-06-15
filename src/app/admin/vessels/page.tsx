import { VesselsScreen } from "@/features/vessels/vessels-screen";

export default async function AdminVesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <VesselsScreen month={month} />;
}
