// Generates public/sample-trucks.xlsx — 100 trucks for testing the truck Excel
// upload. Indian plate numbers, mixed wheel counts (incl. 16), the same owner
// pool as the in-app sample dataset, dates in DD-MM-YYYY (text). Most validity
// dates are in the future; exactly 10 trucks carry an expired date; none are
// blocked — mirroring the in-app sample seed.
//
// Plates use RTO 50–99 so they never collide with the in-app sample-seeded
// trucks (those use RTO 01–49); an Append upload onto a sample-seeded DB imports
// all 100 with nothing skipped.
//
// Run: node scripts/generate-sample-trucks.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

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
const WHEELS = [10, 12, 14, 16];
const EXPIRED_COUNT = 10; // the rest are active; none are blocked

// A small pool of owners — many trucks per owner, like a real fleet. Must stay
// in sync with SAMPLE_TRUCK_OWNERS in src/features/super-admin/sample-constants.ts
// (uploads are rejected for any owner not in the Truck Owners master).
const OWNERS = [
  "Rajesh Kumar",
  "Singh Logistics",
  "Suresh Reddy",
  "Patel Transport",
  "Mohan Carriers",
  "Vijay Sharma",
  "Naidu Roadways",
  "Imran Freight Lines",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function vehicleNo() {
  const state = pick(STATE_CODES);
  // RTO 50–99 keeps these plates disjoint from the in-app seed (which uses 01–49).
  const rto = String(randInt(50, 99)).padStart(2, "0");
  const series = pick(SERIES_LETTERS) + pick(SERIES_LETTERS);
  const number = String(randInt(1, 9999)).padStart(4, "0");
  return `${state}${rto}${series}${number}`;
}

const TODAY = new Date();
function ddmmyyyy(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
}
function dateFromOffset(days) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return ddmmyyyy(d);
}
const futureDate = () => dateFromOffset(randInt(20, 900)); // ~3 weeks to ~2.5 yrs out
const expiredDate = () => dateFromOffset(-randInt(1, 400)); // 1 day to ~13 months ago

function makeTruck(expire) {
  // Expired trucks carry 1–3 past validity dates; the rest are all in the future.
  const expired = new Set();
  if (expire) {
    const fields = ["rc", "ins", "fc"];
    const shuffled = [...fields].sort(() => Math.random() - 0.5);
    for (const f of shuffled.slice(0, randInt(1, 3))) expired.add(f);
  }
  // None blocked; Status reflects the derived state (Expired if any date is past).
  const status = expired.size > 0 ? "Expired" : "Active";
  return {
    vehicleNo: vehicleNo(),
    wheels: pick(WHEELS),
    owner: pick(OWNERS),
    rcValidity: expired.has("rc") ? expiredDate() : futureDate(),
    insuranceValidity: expired.has("ins") ? expiredDate() : futureDate(),
    fcValidity: expired.has("fc") ? expiredDate() : futureDate(),
    status,
  };
}

const seen = new Set();
const trucks = [];
while (trucks.length < 100) {
  // Only the first EXPIRED_COUNT trucks get a past validity date.
  const truck = makeTruck(trucks.length < EXPIRED_COUNT);
  if (seen.has(truck.vehicleNo)) continue;
  seen.add(truck.vehicleNo);
  trucks.push(truck);
}

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Trucks");
sheet.columns = [
  { header: "Vehicle No", key: "vehicleNo", width: 16 },
  { header: "Type", key: "wheels", width: 8 },
  { header: "Owner", key: "owner", width: 26 },
  { header: "RC Validity", key: "rcValidity", width: 14 },
  { header: "Insurance Validity", key: "insuranceValidity", width: 18 },
  { header: "FC Certificate Validity", key: "fcValidity", width: 22 },
  { header: "Status", key: "status", width: 10 },
];
sheet.getRow(1).font = { bold: true };
// Keep date columns as text so DD-MM-YYYY stays literal.
for (const key of ["rcValidity", "insuranceValidity", "fcValidity"]) {
  sheet.getColumn(key).numFmt = "@";
}
for (const truck of trucks) sheet.addRow(truck);

const dir = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(dir, "..", "public", "sample-trucks.xlsx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
await workbook.xlsx.writeFile(outPath);

const expiredCount = trucks.filter((t) =>
  [t.rcValidity, t.insuranceValidity, t.fcValidity].some((d) => {
    const [dd, mm, yyyy] = d.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd) < TODAY;
  }),
).length;
console.log(
  `Wrote ${trucks.length} trucks (${OWNERS.length} owners, ${expiredCount} with an expired date) to ${outPath}.`,
);
