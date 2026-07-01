-- DropIndex
DROP INDEX "bills_of_entry_be_number_key";

-- DropIndex
DROP INDEX "bills_of_lading_bl_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_entry_vessel_id_be_number_key" ON "bills_of_entry"("vessel_id", "be_number");

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_lading_vessel_id_bl_number_key" ON "bills_of_lading"("vessel_id", "bl_number");
