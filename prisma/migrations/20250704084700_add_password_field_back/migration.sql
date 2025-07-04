/*
  Warnings:

  - You are about to drop the column `leadId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `communications` table. All the data in the column will be lost.
  - You are about to alter the column `requestedAmount` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `approvedAmount` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `interestRate` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `monthlyPayment` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `downPayment` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `annualIncome` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `lastContactDate` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `preferredContact` on the `leads` table. All the data in the column will be lost.
  - The `status` column on the `leads` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `leads` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `newValue` on the `vehicle_history` table. All the data in the column will be lost.
  - You are about to drop the column `oldValue` on the `vehicle_history` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `vehicle_history` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `vehicle_history` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `vehicles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `msrp` on the `vehicles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `costBasis` on the `vehicles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - The `features` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `packages` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `options` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `images` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `videos` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `documents` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `highlights` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `keywords` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `soldPrice` on the `vehicles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - Made the column `source` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `leadScore` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `eventDate` to the `vehicle_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `vehicle_history` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `vehicle_history` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `condition` on the `vehicles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `vehicles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_leadId_fkey";

-- DropForeignKey
ALTER TABLE "communications" DROP CONSTRAINT "communications_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_history" DROP CONSTRAINT "vehicle_history_vehicleId_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "leadId";

-- AlterTable
ALTER TABLE "communications" DROP COLUMN "vehicleId",
ALTER COLUMN "direction" SET DEFAULT 'OUTBOUND';

-- AlterTable
ALTER TABLE "financing_applications" ALTER COLUMN "requestedAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "approvedAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "interestRate" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "monthlyPayment" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "downPayment" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "annualIncome" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "lastContactDate",
DROP COLUMN "preferredContact",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW',
ALTER COLUMN "source" SET NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ALTER COLUMN "leadScore" SET NOT NULL,
ALTER COLUMN "leadScore" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "vehicle_history" DROP COLUMN "newValue",
DROP COLUMN "oldValue",
DROP COLUMN "userEmail",
DROP COLUMN "userId",
ADD COLUMN     "eventDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "color" TEXT,
ALTER COLUMN "mileage" DROP NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "msrp" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "costBasis" SET DATA TYPE DECIMAL(65,30),
DROP COLUMN "condition",
ADD COLUMN     "condition" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
DROP COLUMN "features",
ADD COLUMN     "features" JSONB,
DROP COLUMN "packages",
ADD COLUMN     "packages" JSONB,
DROP COLUMN "options",
ADD COLUMN     "options" JSONB,
DROP COLUMN "images",
ADD COLUMN     "images" JSONB,
DROP COLUMN "videos",
ADD COLUMN     "videos" JSONB,
DROP COLUMN "documents",
ADD COLUMN     "documents" JSONB,
DROP COLUMN "highlights",
ADD COLUMN     "highlights" JSONB,
DROP COLUMN "keywords",
ADD COLUMN     "keywords" JSONB,
ALTER COLUMN "soldPrice" SET DATA TYPE DECIMAL(65,30);

-- DropEnum
DROP TYPE "LeadPriority";

-- DropEnum
DROP TYPE "LeadStatus";

-- DropEnum
DROP TYPE "VehicleCondition";

-- DropEnum
DROP TYPE "VehicleStatus";

-- AddForeignKey
ALTER TABLE "vehicle_history" ADD CONSTRAINT "vehicle_history_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
