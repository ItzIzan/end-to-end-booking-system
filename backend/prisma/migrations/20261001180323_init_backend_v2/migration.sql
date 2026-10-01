-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'CUSTOMER', 'TRANSPORT_ADMIN', 'OPS_ADMIN', 'SECURITY', 'DRIVER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKING_PENDING', 'BOOKING_COUNTER', 'BOOKING_CONFIRMED', 'READY_TO_COLLECT', 'SECURITY_HOLD', 'IN_TRANSIT', 'DELIVERED_PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'HOLD', 'REMOVED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "VehicleSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'EXCEL_IMPORT');

-- CreateEnum
CREATE TYPE "ReadyToCollectSource" AS ENUM ('OPS_MANUAL', 'STOCK_IMPORT');

-- CreateEnum
CREATE TYPE "BookingEvidenceType" AS ENUM ('POC', 'POD');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'CUSTOMER_ACCOUNT', 'SITE', 'VEHICLE', 'BOOKING', 'BOOKING_SETTINGS', 'STOCK_IMPORT_PROFILE', 'STOCK_IMPORT_BATCH');

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customerAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "siteId" INTEGER NOT NULL,
    "customerAccountId" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "mileage" INTEGER NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "motExpiryDate" TIMESTAMP(3) NOT NULL,
    "vehicleStatus" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "stockStage" TEXT,
    "source" "VehicleSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "customerAccountId" INTEGER NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "agreementRef" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "requestedCollectionDate" TIMESTAMP(3) NOT NULL,
    "confirmedCollectionDate" TIMESTAMP(3),
    "counterProposedDate" TIMESTAMP(3),
    "scheduledCollectionDate" TIMESTAMP(3) NOT NULL,
    "pendingDateChange" TIMESTAMP(3),
    "dateChangeRequestedAt" TIMESTAMP(3),
    "dateChangeRequestedByUserId" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKING_PENDING',
    "lastCounteredBy" "UserRole",
    "assignedDriverId" INTEGER,
    "createdByUserId" INTEGER,
    "readyToCollectAt" TIMESTAMP(3),
    "readyToCollectSource" "ReadyToCollectSource",
    "readyToCollectByUserId" INTEGER,
    "securityDriverVerifiedAt" TIMESTAMP(3),
    "securityVerifiedDriverId" INTEGER,
    "driverCollectedAt" TIMESTAMP(3),
    "securityReleasedAt" TIMESTAMP(3),
    "securityHoldReason" TEXT,
    "securityHoldAt" TIMESTAMP(3),
    "securityHoldResolvedAt" TIMESTAMP(3),
    "driverDeliveredAt" TIMESTAMP(3),
    "deliveryConfirmationToken" TEXT,
    "deliveryOtpHash" TEXT,
    "deliveryOtpExpiresAt" TIMESTAMP(3),
    "deliveryOtpAttempts" INTEGER NOT NULL DEFAULT 0,
    "deliveryOtpVerifiedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" INTEGER,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvidence" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "type" "BookingEvidenceType" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedByUserId" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockImportProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sheetName" TEXT,
    "headerRowNumber" INTEGER NOT NULL DEFAULT 1,
    "columnMapping" JSONB NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockImportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockImportBatch" (
    "id" SERIAL NOT NULL,
    "customerAccountId" INTEGER NOT NULL,
    "profileId" INTEGER,
    "originalFileName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "headerRowNumber" INTEGER NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "rowsProcessed" INTEGER NOT NULL,
    "rowsCreated" INTEGER NOT NULL,
    "rowsUpdated" INTEGER NOT NULL,
    "rowsUnchanged" INTEGER NOT NULL,
    "rowsFailed" INTEGER NOT NULL,
    "errors" JSONB,
    "uploadedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "processingDays" INTEGER NOT NULL DEFAULT 3,
    "dailySlotLimit" INTEGER NOT NULL DEFAULT 60,
    "cutoffHour" INTEGER NOT NULL DEFAULT 12,
    "updatedByUserId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "changedByUserId" INTEGER,
    "changedByRole" "UserRole",
    "changedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_email_key" ON "CustomerAccount"("email");

-- CreateIndex
CREATE INDEX "CustomerAccount_companyName_idx" ON "CustomerAccount"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_customerAccountId_idx" ON "User"("customerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_reg_idx" ON "Vehicle"("reg");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleStatus_idx" ON "Vehicle"("vehicleStatus");

-- CreateIndex
CREATE INDEX "Vehicle_stockStage_idx" ON "Vehicle"("stockStage");

-- CreateIndex
CREATE INDEX "Vehicle_siteId_idx" ON "Vehicle"("siteId");

-- CreateIndex
CREATE INDEX "Vehicle_customerAccountId_idx" ON "Vehicle"("customerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_jobNumber_key" ON "Booking"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_deliveryConfirmationToken_key" ON "Booking"("deliveryConfirmationToken");

-- CreateIndex
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");

-- CreateIndex
CREATE INDEX "Booking_customerAccountId_idx" ON "Booking"("customerAccountId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_assignedDriverId_idx" ON "Booking"("assignedDriverId");

-- CreateIndex
CREATE INDEX "Booking_scheduledCollectionDate_idx" ON "Booking"("scheduledCollectionDate");

-- CreateIndex
CREATE INDEX "Booking_requestedCollectionDate_idx" ON "Booking"("requestedCollectionDate");

-- CreateIndex
CREATE INDEX "BookingEvidence_bookingId_idx" ON "BookingEvidence"("bookingId");

-- CreateIndex
CREATE INDEX "BookingEvidence_bookingId_type_idx" ON "BookingEvidence"("bookingId", "type");

-- CreateIndex
CREATE INDEX "BookingEvidence_uploadedByUserId_idx" ON "BookingEvidence"("uploadedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StockImportProfile_name_key" ON "StockImportProfile"("name");

-- CreateIndex
CREATE INDEX "StockImportBatch_customerAccountId_idx" ON "StockImportBatch"("customerAccountId");

-- CreateIndex
CREATE INDEX "StockImportBatch_profileId_idx" ON "StockImportBatch"("profileId");

-- CreateIndex
CREATE INDEX "StockImportBatch_createdAt_idx" ON "StockImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_changedByUserId_idx" ON "AuditLog"("changedByUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_readyToCollectByUserId_fkey" FOREIGN KEY ("readyToCollectByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dateChangeRequestedByUserId_fkey" FOREIGN KEY ("dateChangeRequestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_securityVerifiedDriverId_fkey" FOREIGN KEY ("securityVerifiedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvidence" ADD CONSTRAINT "BookingEvidence_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvidence" ADD CONSTRAINT "BookingEvidence_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportProfile" ADD CONSTRAINT "StockImportProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportBatch" ADD CONSTRAINT "StockImportBatch_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportBatch" ADD CONSTRAINT "StockImportBatch_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StockImportProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportBatch" ADD CONSTRAINT "StockImportBatch_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSettings" ADD CONSTRAINT "BookingSettings_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
