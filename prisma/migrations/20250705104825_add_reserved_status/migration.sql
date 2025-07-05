-- AlterTable
ALTER TABLE "users" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "VehicleStatus";
