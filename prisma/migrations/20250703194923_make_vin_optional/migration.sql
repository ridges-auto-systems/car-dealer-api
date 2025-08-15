/*
  Warnings:

  - The values [SALES_MANAGER,FINANCE_MANAGER,SUPER_ADMIN] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `location` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `meetingRoom` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `outcome` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `reminderSent` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `salesRepId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `specialRequests` on the `appointments` table. All the data in the column will be lost.
  - The `type` column on the `appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `attachments` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `emailAddress` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `responseTime` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `salesRepId` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `communications` table. All the data in the column will be lost.
  - You are about to drop the column `contractNumber` on the `financing_applications` table. All the data in the column will be lost.
  - The `status` column on the `financing_applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `yearsEmployed` on the `financing_applications` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `appointmentCount` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `bestTimeToCall` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `conversionLikelihood` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `nextFollowUpDate` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `preferredContact` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `testDriveCount` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `customerNotes` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `driverLicense` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceVerified` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `leadToSale` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `licenseVerified` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `plannedRoute` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `salesRepId` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `salesRepNotes` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `test_drives` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleFeedback` on the `test_drives` table. All the data in the column will be lost.
  - The `status` column on the `test_drives` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `marketingOptIn` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferredContact` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `users` table. All the data in the column will be lost.
  - Made the column `vehicleId` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerId` on table `communications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `leadId` on table `communications` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `communications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `leadId` on table `financing_applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vehicleId` on table `financing_applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stockNumber` on table `vehicles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'SALES_REP', 'CUSTOMER', 'MANAGER', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_salesRepId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "communications" DROP CONSTRAINT "communications_customerId_fkey";

-- DropForeignKey
ALTER TABLE "communications" DROP CONSTRAINT "communications_leadId_fkey";

-- DropForeignKey
ALTER TABLE "communications" DROP CONSTRAINT "communications_salesRepId_fkey";

-- DropForeignKey
ALTER TABLE "financing_applications" DROP CONSTRAINT "financing_applications_leadId_fkey";

-- DropForeignKey
ALTER TABLE "financing_applications" DROP CONSTRAINT "financing_applications_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "test_drives" DROP CONSTRAINT "test_drives_salesRepId_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "location",
DROP COLUMN "meetingRoom",
DROP COLUMN "outcome",
DROP COLUMN "rating",
DROP COLUMN "reminderSent",
DROP COLUMN "salesRepId",
DROP COLUMN "specialRequests",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "vehicleId" SET NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'SHOWROOM_VISIT',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "communications" DROP COLUMN "attachments",
DROP COLUMN "emailAddress",
DROP COLUMN "isRead",
DROP COLUMN "phoneNumber",
DROP COLUMN "platform",
DROP COLUMN "readAt",
DROP COLUMN "responseTime",
DROP COLUMN "salesRepId",
DROP COLUMN "sentAt",
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "outcome" TEXT,
ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "leadId" SET NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "financing_applications" DROP COLUMN "contractNumber",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "leadId" SET NOT NULL,
ALTER COLUMN "vehicleId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "yearsEmployed" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "appointmentCount",
DROP COLUMN "bestTimeToCall",
DROP COLUMN "conversionLikelihood",
DROP COLUMN "nextFollowUpDate",
DROP COLUMN "testDriveCount",
ALTER COLUMN "financingNeeded" SET DEFAULT false;

-- AlterTable
ALTER TABLE "test_drives" DROP COLUMN "customerNotes",
DROP COLUMN "driverLicense",
DROP COLUMN "endTime",
DROP COLUMN "insuranceVerified",
DROP COLUMN "leadToSale",
DROP COLUMN "licenseVerified",
DROP COLUMN "plannedRoute",
DROP COLUMN "salesRepId",
DROP COLUMN "salesRepNotes",
DROP COLUMN "startTime",
DROP COLUMN "vehicleFeedback",
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "address",
DROP COLUMN "city",
DROP COLUMN "dateOfBirth",
DROP COLUMN "marketingOptIn",
DROP COLUMN "password",
DROP COLUMN "profileImage",
DROP COLUMN "state",
DROP COLUMN "zipCode";

-- AlterTable
ALTER TABLE "vehicle_history" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "stockNumber" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "AppointmentType";

-- DropEnum
DROP TYPE "CommunicationType";

-- DropEnum
DROP TYPE "FinancingStatus";

-- DropEnum
DROP TYPE "TestDriveStatus";

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
