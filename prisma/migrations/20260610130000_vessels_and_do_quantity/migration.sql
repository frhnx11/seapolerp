-- Vessel becomes master data: the BL quantity belongs to the vessel (total goods
-- in the ship) and each work order holds a DO quantity (its allocation of that
-- BL). Existing data is preserved: every distinct vessel name becomes a vessel
-- row whose BL equals the sum of its work orders' old quantities (i.e. fully
-- allocated to start), and each work order's old quantity becomes its DO.

-- CreateTable
CREATE TABLE "vessels" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bl_quantity" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vessels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vessels_seq_key" ON "vessels"("seq");
CREATE UNIQUE INDEX "vessels_name_key" ON "vessels"("name");

-- Backfill vessels from the existing work-order names (seq follows first
-- appearance order; ids are unique hex since cuid() isn't available in SQL).
INSERT INTO "vessels" ("id", "name", "bl_quantity", "created_at", "updated_at")
SELECT
    md5(random()::text || clock_timestamp()::text || "vessel_name"),
    "vessel_name",
    COALESCE(SUM("bl_quantity"), 0),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "work_orders"
GROUP BY "vessel_name"
ORDER BY MIN("seq");

-- Link work orders to their vessels.
ALTER TABLE "work_orders" ADD COLUMN "vessel_id" TEXT;

UPDATE "work_orders" wo
SET "vessel_id" = v."id"
FROM "vessels" v
WHERE v."name" = wo."vessel_name";

ALTER TABLE "work_orders" ALTER COLUMN "vessel_id" SET NOT NULL;

ALTER TABLE "work_orders"
    ADD CONSTRAINT "work_orders_vessel_id_fkey"
    FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- The work order's own quantity is the DO quantity now.
ALTER TABLE "work_orders" RENAME COLUMN "bl_quantity" TO "do_quantity";

ALTER TABLE "work_orders" DROP COLUMN "vessel_name";
