-- VT Number: an identifier captured at the Gross/Exit stage that other staff
-- search trips by later. Nullable until a trip completes (Postgres allows many
-- NULLs under a unique index); unique so one VT# maps to exactly one trip.

ALTER TABLE "truck_orders" ADD COLUMN "vt_number" TEXT;
CREATE UNIQUE INDEX "truck_orders_vt_number_key" ON "truck_orders" ("vt_number");
