/**
 * Curated sample master-data, shared by the in-app super-admin reset
 * (`src/app/super-admin/settings/reset-data.ts`) and the CLI seed scripts
 * (`prisma/seed-master-data.ts`, `prisma/seed-work-orders.ts`).
 *
 * Pure data only — no imports of prisma/auth/React — so it is safe to pull into
 * both the Next.js bundler and the tsx-run seed scripts.
 */

export const SAMPLE_CARGO_TYPES = [
  "Containerized Cargo",
  "Bulk Cargo",
  "Break Bulk",
  "Liquid Bulk",
  "Dry Bulk",
  "Refrigerated (Reefer)",
  "Hazardous (DG)",
  "Project Cargo",
  "RORO (Roll-on/Roll-off)",
  "General Cargo",
  "Coal",
  "Iron Ore",
  "Cement",
  "Fertilizer",
  "Food Grains",
  "Steel Coils",
];

export const SAMPLE_PARTIES = [
  "Indian Oil Corporation",
  "Bharat Petroleum",
  "Hindustan Petroleum",
  "MRF Tyres",
  "Apollo Tyres",
  "CEAT Tyres",
  "Castrol Lubricants",
  "Gulf Oil Lubricants",
  "Tata Motors Spares",
  "Ashok Leyland Parts",
  "Bosch Auto Parts",
  "SKF Bearings",
];

export const SAMPLE_IMPORTERS = [
  "Adani Enterprises",
  "Cargill India",
  "Olam Agro India",
  "Louis Dreyfus Company",
  "ITC Agri Business",
  "Ruchi Soya Industries",
  "Emami Agrotech",
  "Bunge India",
  "Glencore India",
  "Allana Group",
];

// 50 sample DO-flow trucks (vehicle numbers) for the DoTruck registry. Spaceless
// uppercase (like the work-order trucks); the trailing number (1001+i) keeps every
// entry unique.
const DO_TRUCK_STATES = [
  "TN",
  "KA",
  "AP",
  "KL",
  "MH",
  "TS",
  "GJ",
  "MP",
  "RJ",
  "PB",
];
const DO_TRUCK_SERIES = [
  "AA",
  "AB",
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AH",
  "AJ",
  "AK",
];
export const SAMPLE_DO_TRUCKS: string[] = Array.from({ length: 50 }, (_, i) => {
  const state = DO_TRUCK_STATES[i % DO_TRUCK_STATES.length];
  const rto = String(41 + (i % 9)).padStart(2, "0"); // 41–49
  const series =
    DO_TRUCK_SERIES[
      Math.floor(i / DO_TRUCK_STATES.length) % DO_TRUCK_SERIES.length
    ];
  const number = String(1001 + i); // 1001–1050 → unique
  return `${state}${rto}${series}${number}`;
});

export const SAMPLE_SUPPLIERS = [
  "UltraTech Cement",
  "ACC Cement",
  "Tata Steel",
  "JSW Steel",
  "Reliance Industries",
  "Adani Enterprises",
  "Hindustan Unilever",
  "ITC Limited",
  "Coal India",
  "NTPC Limited",
  "IFFCO Fertilizers",
  "Asian Paints",
];

export const SAMPLE_LOADING_SITES = [
  "W/H – Warehouse",
  "W/F – Wharf",
  "C.BELT – Conveyor Belt",
];

/** Discount parties — who transport invoices are billed to. */
export const SAMPLE_DISCOUNT_PARTIES = [
  "Coastal Trade Partners",
  "Harbour Discount Co.",
  "Bay Logistics Traders",
  "Eastern Freight Agency",
];

/** Owner pool — trucks are mapped to these (also used by the truck generator). */
export const SAMPLE_TRUCK_OWNERS = [
  "Rajesh Kumar",
  "Singh Logistics",
  "Suresh Reddy",
  "Patel Transport",
  "Mohan Carriers",
  "Vijay Sharma",
  "Naidu Roadways",
  "Imran Freight Lines",
];

/** Vessel name + total quantity (MT). No work orders are seeded, so each shows
 *  total with 0 Allocated WO / 0 Delivered. */
export const SAMPLE_VESSELS: [string, number][] = [
  ["MV Ocean Star", 40_000],
  ["MV Coral Queen", 60_000],
  ["MV Bay Pioneer", 35_000],
  ["MV Eastern Glory", 50_000],
  ["MV Silver Horizon", 12_000],
  ["MV Golden Wave", 36_000],
  ["MV Indus Trader", 9_000],
  ["MV Monsoon Breeze", 40_000],
];

/** Delivery-order vessels: name + total quantity (MT) + depth & hatch (m). No
 *  BLs/BEs/DOs are seeded, so each shows total with 0 Allocated DO / 0 Delivered. */
export const SAMPLE_DO_VESSELS: {
  name: string;
  totalQuantity: number;
  depth: number;
  hatch: number;
  arrivalDate: string; // YYYY-MM-DD
}[] = [
  {
    name: "MV Pacific Trader",
    totalQuantity: 45_000,
    depth: 12.5,
    hatch: 5,
    arrivalDate: "2026-06-10",
  },
  {
    name: "MV Andaman Pride",
    totalQuantity: 60_000,
    depth: 13.2,
    hatch: 6,
    arrivalDate: "2026-06-14",
  },
  {
    name: "MV Bay Voyager",
    totalQuantity: 35_000,
    depth: 11.8,
    hatch: 4,
    arrivalDate: "2026-06-18",
  },
  {
    name: "MV Konkan Express",
    totalQuantity: 50_000,
    depth: 12.0,
    hatch: 5,
    arrivalDate: "2026-06-21",
  },
  {
    name: "MV Deccan Carrier",
    totalQuantity: 40_000,
    depth: 11.5,
    hatch: 4,
    arrivalDate: "2026-06-25",
  },
  {
    name: "MV Coromandel Star",
    totalQuantity: 55_000,
    depth: 13.0,
    hatch: 6,
    arrivalDate: "2026-06-28",
  },
];
