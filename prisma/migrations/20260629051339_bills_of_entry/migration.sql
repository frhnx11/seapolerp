-- AlterTable
ALTER TABLE "bills_of_lading" ADD COLUMN     "bill_of_entry_id" TEXT;

-- CreateTable
CREATE TABLE "bills_of_entry" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "be_number" INTEGER NOT NULL,
    "vessel_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "cargo_type_id" TEXT NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_of_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_entry_seq_key" ON "bills_of_entry"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_entry_be_number_key" ON "bills_of_entry"("be_number");

-- CreateIndex
CREATE INDEX "bills_of_entry_vessel_id_idx" ON "bills_of_entry"("vessel_id");

-- CreateIndex
CREATE INDEX "bills_of_entry_party_id_idx" ON "bills_of_entry"("party_id");

-- CreateIndex
CREATE INDEX "bills_of_entry_cargo_type_id_idx" ON "bills_of_entry"("cargo_type_id");

-- CreateIndex
CREATE INDEX "bills_of_lading_bill_of_entry_id_idx" ON "bills_of_lading"("bill_of_entry_id");

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_bill_of_entry_id_fkey" FOREIGN KEY ("bill_of_entry_id") REFERENCES "bills_of_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_entry" ADD CONSTRAINT "bills_of_entry_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "do_vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_entry" ADD CONSTRAINT "bills_of_entry_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_entry" ADD CONSTRAINT "bills_of_entry_cargo_type_id_fkey" FOREIGN KEY ("cargo_type_id") REFERENCES "cargo_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
