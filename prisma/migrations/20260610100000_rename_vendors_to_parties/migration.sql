-- Rename the `vendors` table to `parties` (Vendor model → Party). Data is
-- preserved via RENAME rather than drop/create. Constraint and index are renamed
-- to match what Prisma expects for the `parties` table.
ALTER TABLE "vendors" RENAME TO "parties";
ALTER TABLE "parties" RENAME CONSTRAINT "vendors_pkey" TO "parties_pkey";
ALTER INDEX "vendors_name_key" RENAME TO "parties_name_key";
