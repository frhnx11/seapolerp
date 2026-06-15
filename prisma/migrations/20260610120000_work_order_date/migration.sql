-- Add the manually-entered work-order date ("YYYY-MM-DD" string). Existing rows
-- are backfilled with mixed dates spread across the past week (seq-based, so the
-- spread is deterministic), then the column is made required.
ALTER TABLE "work_orders" ADD COLUMN "wo_date" TEXT;

UPDATE "work_orders"
SET "wo_date" = to_char(CURRENT_DATE - ("seq" % 7), 'YYYY-MM-DD');

ALTER TABLE "work_orders" ALTER COLUMN "wo_date" SET NOT NULL;
