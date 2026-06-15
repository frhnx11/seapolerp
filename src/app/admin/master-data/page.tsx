import {
  Database,
  Factory,
  type LucideIcon,
  MapPin,
  Package,
  Ship,
  Store,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";

type MasterCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tile: string;
  iconColor: string;
  hover: string;
  view: string;
};

// Full Tailwind class strings per card (no interpolation, so JIT keeps them).
const MASTER_CARDS: MasterCard[] = [
  {
    title: "Trucks",
    description:
      "Manage the truck master — vehicles, owners, insurance and fitness details.",
    href: "/admin/master-data/trucks",
    icon: Truck,
    tile: "bg-blue-100",
    iconColor: "text-blue-600",
    hover: "hover:border-blue-300",
    view: "text-blue-600",
  },
  {
    title: "Truck Owners",
    description:
      "Manage the truck-owner companies trucks belong to — invoices are billed per owner.",
    href: "/admin/master-data/truck-owners",
    icon: Users,
    tile: "bg-indigo-100",
    iconColor: "text-indigo-600",
    hover: "hover:border-indigo-300",
    view: "text-indigo-600",
  },
  {
    title: "Vessels",
    description:
      "Manage vessels and their BL quantities — the total goods each ship carries.",
    href: "/admin/master-data/vessels",
    icon: Ship,
    tile: "bg-cyan-100",
    iconColor: "text-cyan-600",
    hover: "hover:border-cyan-300",
    view: "text-cyan-600",
  },
  {
    title: "Cargo Types",
    description: "Manage the list of cargo types handled at the port.",
    href: "/admin/master-data/cargo-types",
    icon: Package,
    tile: "bg-amber-100",
    iconColor: "text-amber-600",
    hover: "hover:border-amber-300",
    view: "text-amber-600",
  },
  {
    title: "Parties",
    description: "Manage the list of parties.",
    href: "/admin/master-data/parties",
    icon: Store,
    tile: "bg-purple-100",
    iconColor: "text-purple-600",
    hover: "hover:border-purple-300",
    view: "text-purple-600",
  },
  {
    title: "Suppliers",
    description: "Manage the list of suppliers.",
    href: "/admin/master-data/suppliers",
    icon: Factory,
    tile: "bg-emerald-100",
    iconColor: "text-emerald-600",
    hover: "hover:border-emerald-300",
    view: "text-emerald-600",
  },
  {
    title: "Loading Sites",
    description:
      "Manage the loading sites trucks load from (warehouse, wharf, conveyor belt).",
    href: "/admin/master-data/loading-sites",
    icon: MapPin,
    tile: "bg-rose-100",
    iconColor: "text-rose-600",
    hover: "hover:border-rose-300",
    view: "text-rose-600",
  },
];

/** Admin → Master Data: entry cards for each master record. */
export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <Database className="text-[#0483ca]" size={32} />
          Master Data
        </h1>
        <p className="mt-2 text-gray-600">
          Manage the core records the delivery workflow depends on
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MASTER_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
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
