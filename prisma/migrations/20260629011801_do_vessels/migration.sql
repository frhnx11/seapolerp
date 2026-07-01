-- CreateTable
CREATE TABLE "do_vessels" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_quantity" DECIMAL(12,3) NOT NULL,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "do_vessels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "do_vessels_seq_key" ON "do_vessels"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "do_vessels_name_key" ON "do_vessels"("name");
