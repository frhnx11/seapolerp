-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "vessel_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "cargo_type_id" TEXT NOT NULL,
    "do_quantity" DECIMAL(12,3) NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_seq_key" ON "delivery_orders"("seq");

-- CreateIndex
CREATE INDEX "delivery_orders_vessel_id_idx" ON "delivery_orders"("vessel_id");

-- CreateIndex
CREATE INDEX "delivery_orders_party_id_idx" ON "delivery_orders"("party_id");

-- CreateIndex
CREATE INDEX "delivery_orders_cargo_type_id_idx" ON "delivery_orders"("cargo_type_id");

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_vessel_id_fkey" FOREIGN KEY ("vessel_id") REFERENCES "do_vessels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_cargo_type_id_fkey" FOREIGN KEY ("cargo_type_id") REFERENCES "cargo_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
