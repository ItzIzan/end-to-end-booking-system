const { prisma } = require("../lib/prisma");

import type {
  Booking,
  BookingFilters,
  BookingUpdateInput,
  CreateBookingInput,
} from "../types/booking";

const DATE_FIELDS = [
  "requestedCollectionDate",
  "confirmedCollectionDate",
  "counterProposedDate",
  "scheduledCollectionDate",
  "pendingDateChange",
  "dateChangeRequestedAt",
  "readyToCollectAt",
  "securityDriverVerifiedAt",
  "driverCollectedAt",
  "securityReleasedAt",
  "securityHoldAt",
  "securityHoldResolvedAt",
  "driverDeliveredAt",
  "deliveryOtpExpiresAt",
  "deliveryOtpVerifiedAt",
  "cancelledAt",
] as const;

function normaliseDates(data: Record<string, any>) {
  const result = { ...data };

  for (const field of DATE_FIELDS) {
    if (!(field in result)) continue;

    const value = result[field];

    if (value === null) {
      result[field] = null;
    } else if (value !== undefined) {
      result[field] =
        value instanceof Date ? value : new Date(value);
    }
  }

  return result;
}

function safeBooking(record: any): Booking {
  const {
    deliveryOtpHash,
    deliveryConfirmationToken,
    ...safe
  } = record;

  return safe;
}

const include = {
  vehicle: {
    include: {
      site: true,
      customerAccount: true,
    },
  },

  customerAccount: true,
  assignedDriver: true,
  createdByUser: true,
};

export const bookingsStore = {
  async getAll(filters?: BookingFilters): Promise<Booking[]> {
    const where: Record<string, any> = {};

    if (filters) {
      if (filters.id !== undefined) {
        where.id = filters.id;
      }

      if (filters.vehicleId !== undefined) {
        where.vehicleId = filters.vehicleId;
      }

      if (filters.customerAccountId !== undefined) {
        where.customerAccountId =
          filters.customerAccountId;
      }

      if (filters.status !== undefined) {
        where.status = filters.status;
      }

      if (filters.assignedDriverId !== undefined) {
        where.assignedDriverId =
          filters.assignedDriverId;
      }

      const stringFields = [
        "jobNumber",
        "agreementRef",
        "recipientName",
        "recipientEmail",
      ] as const;

      for (const field of stringFields) {
        const value = filters[field];

        if (value) {
          where[field] = {
            contains: value,
            mode: "insensitive",
          };
        }
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      include,
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map(safeBooking);
  },

  async getById(id: number): Promise<Booking | null> {
    const row = await prisma.booking.findUnique({
      where: { id },
      include,
    });

    return row ? safeBooking(row) : null;
  },

  async getByDeliveryToken(token: string) {
    return prisma.booking.findUnique({
      where: {
        deliveryConfirmationToken: token,
      },
    });
  },

  async hasActiveBookingForVehicle(
    vehicleId: number
  ): Promise<boolean> {
    const count = await prisma.booking.count({
      where: {
        vehicleId,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    return count > 0;
  },

  async countByScheduledCollectionDate(
    date: Date
  ): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return prisma.booking.count({
      where: {
        scheduledCollectionDate: {
          gte: start,
          lte: end,
        },

        status: {
          not: "CANCELLED",
        },
      },
    });
  },

  async countByScheduledCollectionDateExcludingBooking(
    date: Date,
    bookingId: number
  ): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return prisma.booking.count({
      where: {
        id: {
          not: bookingId,
        },

        scheduledCollectionDate: {
          gte: start,
          lte: end,
        },

        status: {
          not: "CANCELLED",
        },
      },
    });
  },

  async create(
    data: CreateBookingInput
  ): Promise<Booking> {
    const row = await prisma.booking.create({
      data: normaliseDates(data),
      include,
    });

    return safeBooking(row);
  },

  async updateById(
    id: number,
    updates: BookingUpdateInput
  ): Promise<Booking | null> {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) return null;

    const row = await prisma.booking.update({
      where: { id },
      data: normaliseDates(updates),
      include,
    });

    return safeBooking(row);
  },
};