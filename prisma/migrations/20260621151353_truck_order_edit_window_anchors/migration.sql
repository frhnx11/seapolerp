-- AlterTable
ALTER TABLE "truck_orders" ADD COLUMN     "gross_first_at" TIMESTAMP(3),
ADD COLUMN     "loading_slip_first_at" TIMESTAMP(3),
ADD COLUMN     "net_received_first_at" TIMESTAMP(3);

-- Backfill the immutable first-entry anchors for rows that already recorded a
-- value, using the existing stamp as the best available first-entry time. New
-- edits keep the anchor; the stamps continue to track the latest editor.
UPDATE "truck_orders" SET "loading_slip_first_at" = "loading_slip_at" WHERE "loading_slip_at" IS NOT NULL;
UPDATE "truck_orders" SET "gross_first_at"        = "completed_at"     WHERE "completed_at"     IS NOT NULL;
UPDATE "truck_orders" SET "net_received_first_at" = "net_received_at"  WHERE "net_received_at"  IS NOT NULL;
