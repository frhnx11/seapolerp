-- CreateTable
CREATE TABLE "work_order_trucks" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_trucks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_order_trucks_work_order_id_truck_id_key" ON "work_order_trucks"("work_order_id", "truck_id");

-- AddForeignKey
ALTER TABLE "work_order_trucks" ADD CONSTRAINT "work_order_trucks_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_trucks" ADD CONSTRAINT "work_order_trucks_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
