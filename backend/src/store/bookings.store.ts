const { prisma } = require("../lib/prisma");
import type { Booking, BookingFilters } from "../types/booking";

export const bookingsStore = {
  async getAll(filters?: BookingFilters): Promise<Booking[]> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.id !== undefined) where.id = filters.id;
      if (filters.vehicleId !== undefined) where.vehicleId = filters.vehicleId;
      if (filters.status !== undefined) where.status = filters.status;
      if (filters.assignedDriverId !== undefined)
        where.assignedDriverId = filters.assignedDriverId;

      const stringFields = [
        "jobNumber",
        "agreementRef",
        "customerName",
        "customerEmail",
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

    return prisma.booking.findMany({
      where,
      include: {
        vehicle: {
          include: {
            site: true,
          },
        },
        assignedDriver: true,
        createdByUser: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: number): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            site: true,
          },
        },
        assignedDriver: true,
        createdByUser: true,
      },
    });
  },

  async countByDispatchDate(dispatchDate: Date): Promise<number> {
    const start = new Date(dispatchDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dispatchDate);
    end.setHours(23, 59, 59, 999);

    return prisma.booking.count({
      where: {
        dispatchDate: {
          gte: start,
          lte: end,
        },
      },
    });
  },

  async countByDispatchDateExcludingBooking(
    dispatchDate: Date,
    bookingId: number
  ): Promise<number> {
    const start = new Date(dispatchDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dispatchDate);
    end.setHours(23, 59, 59, 999);

    return prisma.booking.count({
      where: {
        id: {
          not: bookingId,
        },
        dispatchDate: {
          gte: start,
          lte: end,
        },
      },
    });
  },

  async create(
    data: Omit<Booking, "id" | "createdAt" | "updatedAt">
  ): Promise<Booking> {
    return prisma.booking.create({
      data: {
        ...data,
        requestedCollectionDate: new Date(data.requestedCollectionDate),
        confirmedCollectionDate: data.confirmedCollectionDate
          ? new Date(data.confirmedCollectionDate)
          : null,
        counterProposedDate: data.counterProposedDate
          ? new Date(data.counterProposedDate)
          : null,
        dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : null,
      },
    });
  },

  async updateById(
    id: number,
    updates: Partial<
      Pick<
        Booking,
        | "status"
        | "requestedCollectionDate"
        | "confirmedCollectionDate"
        | "counterProposedDate"
        | "dispatchDate"
        | "lastCounteredBy"
        | "assignedDriverId"
        | "driverDelivered"
        | "endUserDelivered"
        | "securityRejectedReason"
      >
    >
  ): Promise<Booking | null> {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) return null;

    return prisma.booking.update({
      where: { id },
      data: {
        ...updates,
        requestedCollectionDate: updates.requestedCollectionDate
          ? new Date(updates.requestedCollectionDate)
          : undefined,
        confirmedCollectionDate: updates.confirmedCollectionDate
          ? new Date(updates.confirmedCollectionDate)
          : updates.confirmedCollectionDate,
        counterProposedDate: updates.counterProposedDate
          ? new Date(updates.counterProposedDate)
          : updates.counterProposedDate,
        dispatchDate: updates.dispatchDate
          ? new Date(updates.dispatchDate)
          : updates.dispatchDate,
      },
    });
  },

  async deleteById(id: number): Promise<boolean> {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) return false;

    await prisma.booking.delete({
      where: { id },
    });

    return true;
  },
};