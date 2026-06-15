-- The weighbridge slip number is no longer captured on the tare step.
ALTER TABLE "truck_orders" DROP COLUMN "weighbridge_slip_no";
