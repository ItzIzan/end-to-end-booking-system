const { prisma } = require("../lib/prisma");
import type { Booking, BookingFilters } from "../types/booking";

export const bookingsStore = {
  async getAll(filters?: BookingFilters): Promise<Booking[]> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.id !== undefined) where.id = filters.id;
      if (filters.status !== undefined) where.status = filters.status;
      if (filters.dispatchDate !== undefined)
        where.dispatchDate = filters.dispatchDate;

      const stringFields = [
        "site",
        "reg",
        "agreementRef",
        "make",
        "model",
        "colour",
      ] as const;

      for (const field of stringFields) {
        const value = filters[field];

        if (value) {
          where[field] = {
            equals: value,
            mode: "insensitive",
          };
        }
      }
    }

    return prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: number): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
    });
  },

  async create(
    data: Omit<Booking, "id" | "createdAt">
  ): Promise<Booking> {
    return prisma.booking.create({
      data,
    });
  },

  async updateById(
    id: number,
    updates: Partial<
      Pick<
        Booking,
        | "status"
        | "dispatchDate"
        | "lastCounteredBy"
        | "assignedDriverName"
        | "driverDelivered"
        | "endUserDelivered"
      >
    >
  ): Promise<Booking | null> {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    return prisma.booking.update({
      where: { id },
      data: updates,
    });
  },

  async deleteById(id: number): Promise<boolean> {
    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return false;
    }

    await prisma.booking.delete({
      where: { id },
    });

    return true;
  },
};