/*
  Warnings:

  - Added the required column `party_id` to the `delivery_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN     "party_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "delivery_orders_party_id_idx" ON "delivery_orders"("party_id");

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
