-- Net Weight Received: recorded by the party's weighbridge when the truck
-- arrives at the destination (only after the trip is COMPLETED at the port).
-- Who/when stamps follow the same convention as the port-side stages.

ALTER TABLE "truck_orders"
  ADD COLUMN "net_weight_received" DECIMAL(12,3),
  ADD COLUMN "net_received_by_name" TEXT,
  ADD COLUMN "net_received_at" TIMESTAMP(3);
