-- AlterTable
ALTER TABLE "do_truck_orders" ADD COLUMN     "gross_at" TIMESTAMP(3),
ADD COLUMN     "gross_by_name" TEXT,
ADD COLUMN     "gross_first_at" TIMESTAMP(3),
ADD COLUMN     "gross_first_by_name" TEXT,
ADD COLUMN     "tare_at" TIMESTAMP(3),
ADD COLUMN     "tare_by_name" TEXT;
