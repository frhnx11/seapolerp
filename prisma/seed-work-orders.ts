import "dotenv/config";

import { prisma } from "@/core/db";
import { SAMPLE_VESSELS } from "@/features/super-admin/sample-constants";

/**
 * Seeds sample vessels and work orders for testing. Vessels carry the total
 * goods in the ship, sized with headroom above the allocated WOs so increases
 * can be tested; each work order takes a WO quantity from its vessel. Statuses
 * are mixed via `delivered`: 0 = Pending, partial = Partial, full = Completed;
 * dates are spread over the past week. Idempotent — skips if already seeded.
 */

// name, total quantity (MT) — total > Σ WO below, leaving room to raise WO qty.
// Shared vessel list lives in `@/features/super-admin/sample-constants`.
const VESSELS = SAMPLE_VESSELS;

// vessel, supplier index, party index, WO qty (MT), delivered (MT), days ago
const SAMPLE_ORDERS: [string, number, number, number, number, number][] = [
  // MV Ocean Star carries goods for several parties
  ["MV Ocean Star", 0, 1, 12_500, 0, 1], // Pending
  ["MV Ocean Star", 1, 2, 8_000, 3_250.5, 3], // Partial
  ["MV Ocean Star", 2, 0, 5_500, 5_500, 6], // Completed
  // MV Coral Queen
  ["MV Coral Queen", 3, 3, 20_000, 7_800, 2], // Partial
  ["MV Coral Queen", 4, 4, 15_750, 0, 0], // Pending
  ["MV Coral Queen", 0, 5, 9_300, 9_300, 5], // Completed
  // MV Bay Pioneer
  ["MV Bay Pioneer", 5, 6, 18_200, 18_200, 7], // Completed
  ["MV Bay Pioneer", 6, 7, 11_000, 250, 1], // Partial (just started)
  // Singles
  ["MV Eastern Glory", 7, 0, 25_000, 0, 0], // Pending
  ["MV Eastern Glory", 8, 1, 14_400, 12_900, 4], // Partial (nearly done)
  ["MV Silver Horizon", 9, 2, 7_650, 0, 2], // Pending
  ["MV Golden Wave", 10, 3, 30_000, 15_000, 6], // Partial (half)
  ["MV Indus Trader", 11, 4, 6_800, 6_800, 5], // Completed
  ["MV Monsoon Breeze", 1, 5, 22_500, 0, 3], // Pending
  ["MV Monsoon Breeze", 3, 6, 10_100, 4_040, 4], // Partial
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const [suppliers, parties, cargoTypes] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true },
    }),
    prisma.party.findMany({ orderBy: { name: "asc" }, select: { id: true } }),
    prisma.cargoType.findMany({
      orderBy: { name: "asc" },
      select: { id: true },
    }),
  ]);

  if (
    suppliers.length === 0 ||
    parties.length === 0 ||
    cargoTypes.length === 0
  ) {
    throw new Error(
      "No suppliers/parties/cargo types found — seed the master data first (prisma/seed-master-data.ts).",
    );
  }

  // Idempotence guard: if the sample set (or more) is already in, do nothing.
  const existing = await prisma.workOrder.count();
  if (existing >= SAMPLE_ORDERS.length) {
    console.log(`Work orders already seeded (${existing} present). Skipping.`);
    return;
  }

  await prisma.vessel.createMany({
    data: VESSELS.map(([name, totalQuantity]) => ({ name, totalQuantity })),
    skipDuplicates: true,
  });
  const vessels = await prisma.vessel.findMany({
    select: { id: true, name: true },
  });
  const vesselIdByName = new Map(vessels.map((v) => [v.name, v.id]));

  let orderIndex = 0;
  for (const [
    vesselName,
    sIdx,
    pIdx,
    woQty,
    delivered,
    daysAgo,
  ] of SAMPLE_ORDERS) {
    const vesselId = vesselIdByName.get(vesselName);
    if (!vesselId) throw new Error(`Vessel not seeded: ${vesselName}`);
    await prisma.workOrder.create({
      data: {
        date: isoDaysAgo(daysAgo),
        vesselId,
        // Spread cargo types across the orders (pseudo-random but stable).
        cargoTypeId: cargoTypes[(orderIndex * 7 + 3) % cargoTypes.length].id,
        supplierId: suppliers[sIdx % suppliers.length].id,
        partyId: parties[pIdx % parties.length].id,
        woQuantity: woQty,
        delivered,
        createdByName: "Super Admin",
      },
    });
    orderIndex++;
  }

  console.log(
    `Seeded ${VESSELS.length} vessels and ${SAMPLE_ORDERS.length} work orders.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Work-order seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
