import {
  FileBarChart,
  FileCheck,
  FileText,
  PackageCheck,
  Ship,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type DeliveryCard = {
  title: string;
  description: string;
  /** Sub-path appended to the portal's delivery-orders base. */
  path: string;
  icon: LucideIcon;
  tile: string;
  iconColor: string;
  hover: string;
  view: string;
};

// Full Tailwind class strings per card (no interpolation, so JIT keeps them).
const DELIVERY_CARDS: DeliveryCard[] = [
  {
    title: "Vessels",
    description: "Vessels for the delivery-order flow.",
    path: "/vessels",
    icon: Ship,
    tile: "bg-sky-100",
    iconColor: "text-sky-600",
    hover: "hover:border-sky-300",
    view: "text-sky-600",
  },
  {
    title: "Bills of Lading",
    description: "Bills of lading issued against vessels.",
    path: "/bills-of-lading",
    icon: FileText,
    tile: "bg-indigo-100",
    iconColor: "text-indigo-600",
    hover: "hover:border-indigo-300",
    view: "text-indigo-600",
  },
  {
    title: "Bills of Entry",
    description: "Bills of entry grouping bills of lading.",
    path: "/bills-of-entry",
    icon: FileCheck,
    tile: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hover: "hover:border-emerald-300",
    view: "text-emerald-600",
  },
  {
    title: "Delivery Orders",
    description: "Delivery orders issued against bills of entry.",
    path: "/orders",
    icon: Truck,
    tile: "bg-rose-100",
    iconColor: "text-rose-600",
    hover: "hover:border-rose-300",
    view: "text-rose-600",
  },
  {
    title: "Reports",
    description: "Cargo delivery & stock reports.",
    path: "/reports",
    icon: FileBarChart,
    tile: "bg-amber-100",
    iconColor: "text-amber-600",
    hover: "hover:border-amber-300",
    view: "text-amber-600",
  },
];

/**
 * The Delivery Orders card grid — reused by the hub and the per-vessel detail
 * page. `cards` is the set of sub-paths to show (links resolve to `basePath` +
 * sub-path), so each surface exposes its own subset.
 */
export function DeliveryCardsGrid({
  basePath,
  cards,
}: {
  basePath: string;
  cards: string[];
}) {
  const shownCards = DELIVERY_CARDS.filter((c) => cards.includes(c.path));
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {shownCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.path}
            href={`${basePath}${card.path}`}
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
  );
}

/**
 * Delivery Orders hub — title + the card grid shared across portals. `basePath`
 * is the portal's delivery-orders root (e.g. "/admin/delivery-orders").
 */
export function DeliveryOrdersHub({
  basePath,
  cards,
}: {
  basePath: string;
  cards: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <PackageCheck className="text-[#0483ca]" size={32} />
          Delivery Orders
        </h1>
        <p className="mt-2 text-gray-600">
          Manage vessels, bills of lading and entry, and delivery orders.
        </p>
      </div>

      <DeliveryCardsGrid basePath={basePath} cards={cards} />
    </div>
  );
}
