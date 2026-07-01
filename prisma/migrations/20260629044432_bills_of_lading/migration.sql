-- CreateTable
CREATE TABLE "bills_of_lading" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "bl_number" INTEGER NOT NULL,
    "vessel_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "cargo_type_id" TEXT NOT NULL,
    "bl_quantity" DECIMAL(12,3) NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_of_lading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_lading_seq_key" ON "bills_of_lading"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "bills_of_lading_bl_number_key" ON "bills_of_lading"("bl_number");

-- CreateIndex
CREATE INDEX "bills_of_lading_vessel_id_idx" ON "bills_of_lading"("vessel_id");

-- CreateIndex
CREATE INDEX "bills_of_lading_party_id_idx" ON "bills_of_lading"("party_id");

-- CreateIndex
CREATE INDEX "bills_of_lading_cargo_type_id_idx" ON "bills_of_lading"("cargo_type_id");

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "do_vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills_of_lading" ADD CONSTRAINT "bills_of_lading_cargo_type_id_fkey" FOREIGN KEY ("cargo_type_id") REFERENCES "cargo_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
