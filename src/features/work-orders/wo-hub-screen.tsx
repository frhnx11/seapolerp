import {
  ArrowLeft,
  FileText,
  type LucideIcon,
  ReceiptText,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchWoHeader, WoHeader } from "./wo-header";

type SectionCard = {
  title: string;
  description: string;
  segment: string;
  icon: LucideIcon;
  tile: string;
  iconColor: string;
  hover: string;
  view: string;
};

// Full Tailwind class strings per card (no interpolation, so JIT keeps them).
const SECTION_CARDS: SectionCard[] = [
  {
    title: "Truck Orders",
    description: "Truck orders under this work order.",
    segment: "truck-orders",
    icon: ReceiptText,
    tile: "bg-blue-100",
    iconColor: "text-blue-600",
    hover: "hover:border-blue-300",
    view: "text-blue-600",
  },
  {
    title: "Allotted Trucks",
    description: "Trucks assigned to deliver this work order's goods.",
    segment: "allotted-trucks",
    icon: Truck,
    tile: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hover: "hover:border-emerald-300",
    view: "text-emerald-600",
  },
];

/** Accountant and admin — transport invoicing for the WO's settled trips. */
const INVOICES_CARD: SectionCard = {
  title: "Invoices",
  description: "Transport invoices for this work order's trips.",
  segment: "invoices",
  icon: FileText,
  tile: "bg-amber-100",
  iconColor: "text-amber-600",
  hover: "hover:border-amber-300",
  view: "text-amber-600",
};

/** Work order hub — common info header + section cards (shared across portals). */
export async function WorkOrderHubScreen({
  id,
  basePath,
  withInvoices = false,
  backHref,
  backLabel,
}: {
  id: string;
  basePath: string;
  /** Adds the Invoices card (accountant and admin portals). */
  withInvoices?: boolean;
  /** Where the back link goes; defaults to the work-orders list. */
  backHref?: string;
  backLabel?: string;
}) {
  const workOrder = await fetchWoHeader(id);
  if (!workOrder) notFound();

  const cards = withInvoices
    ? [...SECTION_CARDS, INVOICES_CARD]
    : SECTION_CARDS;
  const back = {
    href: backHref ?? basePath,
    label: backLabel ?? "Back to Work Orders",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={back.href}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        {back.label}
      </Link>

      <WoHeader workOrder={workOrder} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.segment}
              href={`${basePath}/${workOrder.id}/${card.segment}`}
              className={`rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md ${card.hover}`}
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${card.tile}`}
              >
                <Icon size={28} className={card.iconColor} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600">{card.description}</p>
              <div
                className={`mt-4 flex items-center text-sm font-medium ${card.view}`}
              >
                <span>View →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
