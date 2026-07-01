/*
  Warnings:

  - You are about to drop the column `party_id` on the `bills_of_entry` table. All the data in the column will be lost.
  - You are about to drop the column `party_id` on the `bills_of_lading` table. All the data in the column will be lost.
  - You are about to drop the column `party_id` on the `delivery_orders` table. All the data in the column will be lost.
  - Added the required column `importer_id` to the `bills_of_entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importer_id` to the `bills_of_lading` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importer_id` to the `delivery_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bills_of_entry" DROP CONSTRAINT "bills_of_entry_party_id_fkey";

-- DropForeignKey
ALTER TABLE "bills_of_lading" DROP CONSTRAINT "bills_of_lading_party_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_orders" DROP CONSTRAINT "delivery_orders_party_id_fkey";

-- DropIndex
DROP INDEX "bills_of_entry_party_id_idx";

-- DropIndex
DROP INDEX "bills_of_lading_party_id_idx";

-- DropIndex
DROP INDEX "delivery_orders_party_id_idx";

-- AlterTable
ALTER TABLE "bills_of_entry" DROP COLUMN "party_id",
ADD COLUMN     "importer_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bills_of_lading" DROP COLUMN "party_id",
ADD COLUMN     "importer_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "delivery_orders" DROP COLUMN "party_id",
ADD COLUMN     "importer_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "importers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "importers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "importers_name_key" ON "importers"("name");

-- CreateIndex
CREATE INDEX "bills_of_entry_importer_id_idx" ON "bills_of_entry"("importer_id");

-- CreateIndex
CREATE INDEX "bills_of_lading_importer_id_idx" ON "bills_of_lading"("importer_id");

-- CreateIndex
CREATE INDEX "delivery_orders_importer_id_idx" ON "delivery_orders"("importer_id");

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_importer_id_fkey" FOREIGN KEY ("importer_id") REFERENCES "importers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_entry" ADD CONSTRAINT "bills_of_entry_importer_id_fkey" FOREIGN KEY ("importer_id") REFERENCES "importers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_importer_id_fkey" FOREIGN KEY ("importer_id") REFERENCES "importers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
