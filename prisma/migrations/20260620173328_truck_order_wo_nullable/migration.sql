/*
  Warnings:

  - You are about to drop the `work_order_trucks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "work_order_trucks" DROP CONSTRAINT "work_order_trucks_truck_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_trucks" DROP CONSTRAINT "work_order_trucks_work_order_id_fkey";

-- AlterTable
ALTER TABLE "truck_orders" ALTER COLUMN "work_order_id" DROP NOT NULL;

-- DropTable
DROP TABLE "work_order_trucks";
