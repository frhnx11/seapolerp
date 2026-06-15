-- The E-way Bill No field is no longer needed on truck orders. Drop the column.

ALTER TABLE "truck_orders" DROP COLUMN "eway_bill_no";
