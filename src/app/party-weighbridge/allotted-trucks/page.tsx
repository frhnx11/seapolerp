import { AllottedTrucksScreen } from "@/features/allotted-trucks/allotted-trucks-screen";

/** Global allotted-trucks pool — read-only for the party weighbridge. */
export default function PartyWbAllottedTrucksPage() {
  return <AllottedTrucksScreen readOnly />;
}
