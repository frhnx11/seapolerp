import { AlertsScreen } from "@/features/alerts/alerts-screen";

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <AlertsScreen month={month} />;
}
