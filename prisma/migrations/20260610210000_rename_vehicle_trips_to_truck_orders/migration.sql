-- The trip entity is called a "Truck Order" (client terminology). Rename the
-- table and every attached object; data is preserved via RENAME.
ALTER TABLE "vehicle_trips" RENAME TO "truck_orders";

ALTER TABLE "truck_orders" RENAME CONSTRAINT "vehicle_trips_pkey" TO "truck_orders_pkey";
ALTER TABLE "truck_orders" RENAME CONSTRAINT "vehicle_trips_work_order_id_fkey" TO "truck_orders_work_order_id_fkey";
ALTER TABLE "truck_orders" RENAME CONSTRAINT "vehicle_trips_truck_id_fkey" TO "truck_orders_truck_id_fkey";
ALTER TABLE "truck_orders" RENAME CONSTRAINT "vehicle_trips_loading_site_id_fkey" TO "truck_orders_loading_site_id_fkey";

ALTER INDEX "vehicle_trips_seq_key" RENAME TO "truck_orders_seq_key";
ALTER INDEX "vehicle_trips_work_order_id_seq_idx" RENAME TO "truck_orders_work_order_id_seq_idx";
ALTER INDEX "vehicle_trips_truck_id_idx" RENAME TO "truck_orders_truck_id_idx";
ALTER INDEX "vehicle_trips_loading_site_id_idx" RENAME TO "truck_orders_loading_site_id_idx";

ALTER SEQUENCE "vehicle_trips_seq_seq" RENAME TO "truck_orders_seq_seq";
