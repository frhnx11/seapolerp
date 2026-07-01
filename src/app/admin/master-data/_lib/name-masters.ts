import { z } from "zod";

/** Keys for the simple name-only master lists under Admin → Master Data. */
export type NameMasterKey =
  | "cargoType"
  | "party"
  | "importer"
  | "supplier"
  | "loadingSite"
  | "truckOwner"
  | "discountParty";

export type NameItem = {
  id: string;
  name: string;
  /** Transport rate in ₹/MT — only present for masters with `withRate`. */
  rate?: number | null;
};

export type NameMasterConfig = {
  /** Plural label / page title, e.g. "Cargo Types". */
  label: string;
  /** Singular noun for buttons and messages, e.g. "Cargo Type". */
  singular: string;
  route: string;
  icon:
    | "package"
    | "store"
    | "building"
    | "factory"
    | "mapPin"
    | "users"
    | "percent";
  /** Show and edit a ₹/MT rate alongside the name (parties only). */
  withRate?: boolean;
  /** What references this master — used in the can't-delete error message. */
  usedBy: string;
};

export const NAME_MASTERS: Record<NameMasterKey, NameMasterConfig> = {
  cargoType: {
    label: "Cargo Types",
    singular: "Cargo Type",
    route: "/admin/master-data/cargo-types",
    icon: "package",
    usedBy: "work orders",
  },
  party: {
    label: "Parties",
    singular: "Party",
    route: "/admin/master-data/parties",
    icon: "store",
    withRate: true,
    usedBy: "work orders",
  },
  importer: {
    label: "Importers",
    singular: "Importer",
    route: "/admin/master-data/importers",
    icon: "building",
    usedBy: "bills of entry",
  },
  supplier: {
    label: "Suppliers",
    singular: "Supplier",
    route: "/admin/master-data/suppliers",
    icon: "factory",
    usedBy: "work orders",
  },
  loadingSite: {
    label: "Loading Sites",
    singular: "Loading Site",
    route: "/admin/master-data/loading-sites",
    icon: "mapPin",
    usedBy: "truck orders",
  },
  truckOwner: {
    label: "Truck Owners",
    singular: "Truck Owner",
    route: "/admin/master-data/truck-owners",
    icon: "users",
    usedBy: "trucks",
  },
  discountParty: {
    label: "Discount Parties",
    singular: "Discount Party",
    route: "/admin/master-data/discount-parties",
    icon: "percent",
    // Forward-looking: invoices will reference this. No FK yet, so the
    // can't-delete message is inert for now.
    usedBy: "invoices",
  },
};

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name is too long");

/** ₹/MT rate; the DB column is Decimal(12,2). */
export const rateSchema = z.coerce
  .number()
  .positive("Rate must be greater than 0")
  .max(9_999_999_999, "Rate is too large");
