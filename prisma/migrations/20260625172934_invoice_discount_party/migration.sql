/*
  Warnings:

  - You are about to drop the column `truck_owner` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "truck_owner",
ADD COLUMN     "discount_party_id" TEXT;

-- CreateIndex
CREATE INDEX "invoices_discount_party_id_idx" ON "invoices"("discount_party_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_discount_party_id_fkey" FOREIGN KEY ("discount_party_id") REFERENCES "discount_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
