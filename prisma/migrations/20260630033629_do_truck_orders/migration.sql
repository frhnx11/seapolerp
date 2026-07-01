-- CreateTable
CREATE TABLE "do_truck_orders" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "delivery_order_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "tare_weight" DECIMAL(12,3) NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "do_truck_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "do_truck_orders_seq_key" ON "do_truck_orders"("seq");

-- CreateIndex
CREATE INDEX "do_truck_orders_delivery_order_id_idx" ON "do_truck_orders"("delivery_order_id");

-- CreateIndex
CREATE INDEX "do_truck_orders_truck_id_idx" ON "do_truck_orders"("truck_id");

-- AddForeignKey
ALTER TABLE "do_truck_orders" ADD CONSTRAINT "do_truck_orders_delivery_order_id_fkey" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "do_truck_orders" ADD CONSTRAINT "do_truck_orders_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
