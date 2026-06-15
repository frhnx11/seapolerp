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

/** Vessel name + BL quantity (MT). No work orders are seeded, so each shows BL
 *  with 0 Allocated DO / 0 Delivered. */
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
