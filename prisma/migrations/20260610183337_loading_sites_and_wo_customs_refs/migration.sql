-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "be_permission_no" TEXT,
ADD COLUMN     "ea_ia_date" TEXT,
ADD COLUMN     "ea_ia_no" TEXT,
ADD COLUMN     "sb_be_date" TEXT,
ADD COLUMN     "sb_be_no" TEXT;

-- CreateTable
CREATE TABLE "loading_sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loading_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loading_sites_name_key" ON "loading_sites"("name");
