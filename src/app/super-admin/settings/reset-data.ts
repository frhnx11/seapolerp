import { prisma } from "@/core/db";
import { getTodayIso, WHEELS } from "@/features/trucks/truck";
import {
  SAMPLE_CARGO_TYPES,
  SAMPLE_LOADING_SITES,
  SAMPLE_PARTIES,
  SAMPLE_SUPPLIERS,
  SAMPLE_TRUCK_OWNERS,
  SAMPLE_VESSELS,
} from "@/features/super-admin/sample-constants";

import { provisionAccount } from "../accounts/provision";
import { type CreatableRole, DEFAULT_PASSWORD } from "../accounts/username";

/**
 * Engine behind the super-admin "reset" actions. Plain functions (not server
 * actions) — the actions in `./actions.ts` guard the caller and call these.
 *
 * IMPORTANT: the wipe preserves the acting super-admin's user + session + account
 * so the subsequent `auth.api.createUser` calls (via `provisionAccount`) stay
 * authorized. The wipe and the seed are NOT one atomic operation — Better Auth's
 * `createUser` runs its own Prisma calls outside our transaction.
 */

/**
 * Wipes the whole database to a fresh ERP, keeping ONLY the super-admin
 * account(s). One interactive transaction (single pinned connection, required
 * for the raw `TRUNCATE`). `RESTART IDENTITY` resets the `seq` sequences so the
 * next vessel/work-order/etc. starts at #001.
 */
export async function wipeAllData(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Drop every non-super-admin user; cascades their session/account/notification.
    await tx.$executeRawUnsafe(
      `DELETE FROM "user" WHERE role IS DISTINCT FROM 'SUPER_ADMIN'`,
    );
    // Clear all domain + master tables and reset their identity sequences.
    await tx.$executeRawUnsafe(
      `TRUNCATE TABLE "vessels","work_orders","truck_orders","invoices","allotted_trucks","notifications","trucks","truck_owners","cargo_types","parties","suppliers","loading_sites" RESTART IDENTITY CASCADE`,
    );
    // Transient email-verification tokens.
    await tx.$executeRawUnsafe(`DELETE FROM "verification"`);
  });
}

// ---- Sample truck generation ----

const STATE_CODES = [
  "KA",
  "MH",
  "DL",
  "TN",
  "AP",
  "TS",
  "GJ",
  "RJ",
  "UP",
  "WB",
  "KL",
  "HR",
  "PB",
  "MP",
  "OD",
  "BR",
  "JH",
  "CG",
  "AS",
  "GA",
];
const SERIES_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // skip I/O to avoid confusion
const TRUCK_COUNT = 100;
const EXPIRED_COUNT = 10; // the rest stay active (none blocked)

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function makeVehicleNo(): string {
  const state = pick(STATE_CODES);
  const rto = String(randInt(1, 49)).padStart(2, "0");
  const series = pick([...SERIES_LETTERS]) + pick([...SERIES_LETTERS]);
  const number = String(randInt(1, 9999)).padStart(4, "0");
  return `${state}${rto}${series}${number}`;
}

/** YYYY-MM-DD `days` away from `todayIso` (TZ-stable via UTC noon anchor). */
function isoOffset(todayIso: string, days: number): string {
  const [y, m, d] = todayIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * ~100 sample trucks mapped to the seeded owners. Mix of expired & active
 * (~30% carry at least one past validity date); NONE blocked (`status` is always
 * "ACTIVE" — "expired" is derived from the dates, not stored).
 */
function generateTrucks(ownerIds: string[], todayIso: string) {
  const futureDate = () => isoOffset(todayIso, randInt(20, 900));
  const expiredDate = () => isoOffset(todayIso, -randInt(1, 400));

  const seen = new Set<string>();
  const trucks: {
    vehicleNo: string;
    wheels: number;
    ownerId: string;
    rcValidity: string;
    insuranceValidity: string;
    fcValidity: string;
    status: string;
  }[] = [];

  while (trucks.length < TRUCK_COUNT) {
    const vehicleNo = makeVehicleNo();
    if (seen.has(vehicleNo)) continue;
    seen.add(vehicleNo);

    // Keep most trucks active — only the first EXPIRED_COUNT get a past validity
    // date (1, 2, or all 3), so the sample shows ~10 Expired and the rest Active.
    const expired = new Set<"rc" | "ins" | "fc">();
    if (trucks.length < EXPIRED_COUNT) {
      const fields: ("rc" | "ins" | "fc")[] = ["rc", "ins", "fc"];
      const shuffled = [...fields].sort(() => Math.random() - 0.5);
      for (const f of shuffled.slice(0, randInt(1, 3))) expired.add(f);
    }

    trucks.push({
      vehicleNo,
      wheels: pick(WHEELS),
      ownerId: pick(ownerIds),
      rcValidity: expired.has("rc") ? expiredDate() : futureDate(),
      insuranceValidity: expired.has("ins") ? expiredDate() : futureDate(),
      fcValidity: expired.has("fc") ? expiredDate() : futureDate(),
      status: "ACTIVE",
    });
  }

  return trucks;
}

// ---- Sample seeding ----

const SAMPLE_ACCOUNTS: { name: string; role: CreatableRole }[] = [
  { name: "Joseph", role: "ADMIN" },
  { name: "Ramesh", role: "PORT_WB" },
  { name: "Suresh", role: "PARTY_WB" },
  { name: "Rajesh", role: "ACCOUNTANT" },
];

export type SeededLogin = {
  name: string;
  username: string;
  role: CreatableRole;
};

/**
 * Seeds sample master data, ~100 trucks, and vessels (with BL; no work orders,
 * so Allocated DO / Delivered stay 0), then provisions the four sample staff
 * accounts. Returns the seeded logins so the UI can show them. Call AFTER
 * `wipeAllData()`.
 */
export async function seedSampleData(): Promise<{
  logins: SeededLogin[];
  password: string;
}> {
  const todayIso = getTodayIso();

  // Master data + trucks + vessels in one transaction.
  await prisma.$transaction(async (tx) => {
    await tx.cargoType.createMany({
      data: SAMPLE_CARGO_TYPES.map((name) => ({ name })),
      skipDuplicates: true,
    });
    await tx.party.createMany({
      // Sample transport rates (₹/MT) so invoicing works out of the box.
      data: SAMPLE_PARTIES.map((name) => ({
        name,
        rate: 300 + Math.floor(Math.random() * 40) * 5,
      })),
      skipDuplicates: true,
    });
    await tx.supplier.createMany({
      data: SAMPLE_SUPPLIERS.map((name) => ({ name })),
      skipDuplicates: true,
    });
    await tx.loadingSite.createMany({
      data: SAMPLE_LOADING_SITES.map((name) => ({ name })),
      skipDuplicates: true,
    });
    await tx.truckOwner.createMany({
      data: SAMPLE_TRUCK_OWNERS.map((name) => ({ name })),
      skipDuplicates: true,
    });

    const owners = await tx.truckOwner.findMany({ select: { id: true } });
    await tx.truck.createMany({
      data: generateTrucks(
        owners.map((o) => o.id),
        todayIso,
      ),
      skipDuplicates: true,
    });

    await tx.vessel.createMany({
      data: SAMPLE_VESSELS.map(([name, blQuantity]) => ({ name, blQuantity })),
      skipDuplicates: true,
    });
  });

  // Accounts last (Better Auth runs outside the transaction), sequentially.
  const logins: SeededLogin[] = [];
  for (const account of SAMPLE_ACCOUNTS) {
    const { username } = await provisionAccount(account);
    logins.push({ name: account.name, username, role: account.role });
  }

  return { logins, password: DEFAULT_PASSWORD };
}
