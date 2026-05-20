-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'TRANSPORT_ADMIN', 'OPS_ADMIN', 'SECURITY', 'DRIVER', 'END_USER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKING_PENDING', 'BOOKING_COUNTER', 'BOOKING_CONFIRMED', 'READY_TO_COLLECT', 'SITE_RELEASED', 'ADMIN_DISPATCHED', 'IN_TRANSIT', 'COMPLETED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "site" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "agreementRef" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "dispatchDate" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKING_PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "lastCounteredBy" "UserRole",
    "assignedDriverName" TEXT,
    "driverDelivered" BOOLEAN NOT NULL DEFAULT false,
    "endUserDelivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
