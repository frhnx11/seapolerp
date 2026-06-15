-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "vessel_name" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "bl_quantity" DECIMAL(12,3) NOT NULL,
    "delivered" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_seq_key" ON "work_orders"("seq");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
