-- Truck owners become a master table; trucks reference it by FK instead of a
-- free-text owner string (invoices group trips per owner, so names must be
-- consistent). Backfill: every distinct owner already on a truck, with
-- deterministic md5 ids (same approach as the cargo-type backfill). Sample
-- owner names are seeded by prisma/seed-master-data.ts, not here.

-- CreateTable
CREATE TABLE "truck_owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_owners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "truck_owners_name_key" ON "truck_owners"("name");

-- Backfill the owner names already on trucks.
INSERT INTO "truck_owners" ("id", "name", "created_at", "updated_at")
SELECT md5('truck-owner:' || t."owner"), t."owner", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "owner" FROM "trucks") t
ON CONFLICT ("name") DO NOTHING;

-- Link trucks to their owner row, then drop the free-text column.
ALTER TABLE "trucks" ADD COLUMN "owner_id" TEXT;

UPDATE "trucks"
SET "owner_id" = o."id"
FROM "truck_owners" o
WHERE o."name" = "trucks"."owner";

ALTER TABLE "trucks" ALTER COLUMN "owner_id" SET NOT NULL;

ALTER TABLE "trucks" DROP COLUMN "owner";

-- CreateIndex
CREATE INDEX "trucks_owner_id_idx" ON "trucks"("owner_id");

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "truck_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
