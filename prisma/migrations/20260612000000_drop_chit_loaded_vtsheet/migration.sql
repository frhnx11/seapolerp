-- Collapse the truck-order flow from 6 stages to 3: drop the Loading Chit,
-- Loaded, and VT Sheet stages. Flow becomes TARE_RECORDED -> LOADING_SLIP_ISSUED
-- -> COMPLETED. Re-home any in-flight rows sitting in a removed status so they
-- land ready for Gross, then drop the now-unused columns.

UPDATE "truck_orders"
SET "status" = 'LOADING_SLIP_ISSUED'
WHERE "status" IN ('LOADING_CHIT_ISSUED', 'LOADED', 'VT_ISSUED');

ALTER TABLE "truck_orders"
  DROP COLUMN "loading_chit_no",
  DROP COLUMN "shift",
  DROP COLUMN "chit_by_name",
  DROP COLUMN "chit_at",
  DROP COLUMN "loaded_remarks",
  DROP COLUMN "loaded_by_name",
  DROP COLUMN "loaded_at",
  DROP COLUMN "vt_sheet_no",
  DROP COLUMN "vt_sheet_by_name",
  DROP COLUMN "vt_sheet_at";
