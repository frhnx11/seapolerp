-- CreateIndex
CREATE INDEX "vehicle_trips_work_order_id_seq_idx" ON "vehicle_trips"("work_order_id", "seq");

-- CreateIndex
CREATE INDEX "vehicle_trips_truck_id_idx" ON "vehicle_trips"("truck_id");

-- CreateIndex
CREATE INDEX "vehicle_trips_loading_site_id_idx" ON "vehicle_trips"("loading_site_id");

-- CreateIndex
CREATE INDEX "work_order_trucks_truck_id_idx" ON "work_order_trucks"("truck_id");

-- CreateIndex
CREATE INDEX "work_orders_vessel_id_idx" ON "work_orders"("vessel_id");

-- CreateIndex
CREATE INDEX "work_orders_supplier_id_idx" ON "work_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "work_orders_party_id_idx" ON "work_orders"("party_id");

-- CreateIndex
CREATE INDEX "work_orders_cargo_type_id_idx" ON "work_orders"("cargo_type_id");
