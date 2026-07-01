-- DropForeignKey
ALTER TABLE "do_truck_orders" DROP CONSTRAINT "do_truck_orders_truck_id_fkey";

-- CreateTable
CREATE TABLE "do_trucks" (
    "id" TEXT NOT NULL,
    "vehicle_no" TEXT NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "do_trucks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "do_trucks_vehicle_no_key" ON "do_trucks"("vehicle_no");

-- AddForeignKey
ALTER TABLE "do_truck_orders" ADD CONSTRAINT "do_truck_orders_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "do_trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
