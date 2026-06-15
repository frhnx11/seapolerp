-- Each work order gets a Cargo Type from the cargo_types master. Existing rows
-- are backfilled with a random (deterministic per-row, via correlated hash)
-- cargo type, then the column is made required. Safe on fresh databases: with
-- no work orders the backfill is a no-op and SET NOT NULL succeeds trivially.
ALTER TABLE "work_orders" ADD COLUMN "cargo_type_id" TEXT;

UPDATE "work_orders"
SET "cargo_type_id" = (
    SELECT ct."id"
    FROM "cargo_types" ct
    ORDER BY md5("work_orders"."id" || ct."id")
    LIMIT 1
);

ALTER TABLE "work_orders" ALTER COLUMN "cargo_type_id" SET NOT NULL;

ALTER TABLE "work_orders"
    ADD CONSTRAINT "work_orders_cargo_type_id_fkey"
    FOREIGN KEY ("cargo_type_id") REFERENCES "cargo_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
