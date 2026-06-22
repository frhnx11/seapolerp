import { AllottedTrucksScreen } from "@/features/allotted-trucks/allotted-trucks-screen";

/** Global allotted-trucks pool — read-only for the accountant. */
export default function AccountantAllottedTrucksPage() {
  return <AllottedTrucksScreen readOnly />;
}
