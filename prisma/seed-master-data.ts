import "dotenv/config";

import { prisma } from "@/core/db";
import {
  SAMPLE_CARGO_TYPES,
  SAMPLE_LOADING_SITES,
  SAMPLE_PARTIES,
  SAMPLE_SUPPLIERS,
  SAMPLE_TRUCK_OWNERS,
} from "@/features/super-admin/sample-constants";

/**
 * Seeds sample rows for the name-only master lists (Cargo Types, Parties,
 * Suppliers). Idempotent — `skipDuplicates` means re-running adds only new names.
 * Curated lists live in `@/features/super-admin/sample-constants` (shared with
 * the in-app super-admin reset).
 */
async function main() {
  const [cargo, parties, suppliers, loadingSites, truckOwners] =
    await Promise.all([
      prisma.cargoType.createMany({
        data: SAMPLE_CARGO_TYPES.map((name) => ({ name })),
        skipDuplicates: true,
      }),
      prisma.party.createMany({
        // Sample transport rates (₹/MT) so invoicing works out of the box.
        data: SAMPLE_PARTIES.map((name) => ({
          name,
          rate: 300 + Math.floor(Math.random() * 40) * 5,
        })),
        skipDuplicates: true,
      }),
      prisma.supplier.createMany({
        data: SAMPLE_SUPPLIERS.map((name) => ({ name })),
        skipDuplicates: true,
      }),
      prisma.loadingSite.createMany({
        data: SAMPLE_LOADING_SITES.map((name) => ({ name })),
        skipDuplicates: true,
      }),
      prisma.truckOwner.createMany({
        data: SAMPLE_TRUCK_OWNERS.map((name) => ({ name })),
        skipDuplicates: true,
      }),
    ]);

  console.log(
    `Seeded master data — cargo types: +${cargo.count}, parties: +${parties.count}, suppliers: +${suppliers.count}, loading sites: +${loadingSites.count}, truck owners: +${truckOwners.count}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Master-data seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
