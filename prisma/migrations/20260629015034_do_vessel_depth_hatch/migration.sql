-- Add required `depth` and `hatch` to do_vessels. Backfill any existing rows
-- with 0 via a temporary default, then drop the default so future inserts must
-- supply a value (the create/edit form always does).
ALTER TABLE "do_vessels" ADD COLUMN "depth" DECIMAL(8,3) NOT NULL DEFAULT 0,
ADD COLUMN "hatch" DECIMAL(8,3) NOT NULL DEFAULT 0;

ALTER TABLE "do_vessels" ALTER COLUMN "depth" DROP DEFAULT,
ALTER COLUMN "hatch" DROP DEFAULT;
