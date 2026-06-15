-- AlterTable
ALTER TABLE "user" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "dateOfBirth" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rollNo" INTEGER;
