-- CreateTable
CREATE TABLE "vehicle_trips" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TARE_RECORDED',
    "tare_weight" DECIMAL(12,3) NOT NULL,
    "weighbridge_slip_no" TEXT,
    "tare_by_name" TEXT NOT NULL,
    "tare_at" TIMESTAMP(3) NOT NULL,
    "loading_site_id" TEXT,
    "loading_slip_no" TEXT,
    "loading_slip_by_name" TEXT,
    "loading_slip_at" TIMESTAMP(3),
    "loading_chit_no" TEXT,
    "shift" TEXT,
    "chit_by_name" TEXT,
    "chit_at" TIMESTAMP(3),
    "loaded_remarks" TEXT,
    "loaded_by_name" TEXT,
    "loaded_at" TIMESTAMP(3),
    "vt_sheet_no" TEXT,
    "vt_sheet_by_name" TEXT,
    "vt_sheet_at" TIMESTAMP(3),
    "gross_weight" DECIMAL(12,3),
    "net_weight" DECIMAL(12,3),
    "eway_bill_no" TEXT,
    "completed_by_name" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_trips_seq_key" ON "vehicle_trips"("seq");

-- AddForeignKey
ALTER TABLE "vehicle_trips" ADD CONSTRAINT "vehicle_trips_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_trips" ADD CONSTRAINT "vehicle_trips_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_trips" ADD CONSTRAINT "vehicle_trips_loading_site_id_fkey" FOREIGN KEY ("loading_site_id") REFERENCES "loading_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
