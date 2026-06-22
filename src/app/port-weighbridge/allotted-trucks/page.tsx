import { AllottedTrucksScreen } from "@/features/allotted-trucks/allotted-trucks-screen";

/** Global allotted-trucks pool — read-only for the port weighbridge. */
export default function PortWbAllottedTrucksPage() {
  return <AllottedTrucksScreen readOnly />;
}
