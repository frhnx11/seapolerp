-- Work-order-specific truck block: a truck can be blocked for one work order
-- (no new trips under it) while still usable by other work orders. Separate
-- from the universal Truck.status = BLOCKED. Existing rows default to allowed.
ALTER TABLE "work_order_trucks" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false;
