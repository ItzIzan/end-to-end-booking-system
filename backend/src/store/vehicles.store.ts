const { prisma } = require("../lib/prisma");
import type {
  CreateVehicleInput,
  Vehicle,
  VehicleFilters,
} from "../types/vehicle";

export const vehiclesStore = {
  async getAll(filters?: VehicleFilters): Promise<Vehicle[]> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.id !== undefined) where.id = filters.id;
      if (filters.siteId !== undefined) where.siteId = filters.siteId;
      if (filters.fuelType !== undefined) where.fuelType = filters.fuelType;
      if (filters.vehicleStatus !== undefined)
        where.vehicleStatus = filters.vehicleStatus;

      const stringFields = ["reg", "vin", "make", "model", "colour"] as const;

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

    return prisma.vehicle.findMany({
      where,
      include: {
        site: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: number): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { id },
      include: {
        site: true,
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  },

  async create(data: CreateVehicleInput): Promise<Vehicle> {
    return prisma.vehicle.create({
      data: {
        ...data,
        registrationDate: new Date(data.registrationDate),
        motExpiryDate: new Date(data.motExpiryDate),
      },
    });
  },

  async updateById(
    id: number,
    updates: Partial<CreateVehicleInput>
  ): Promise<Vehicle | null> {
    const existing = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existing) return null;

    return prisma.vehicle.update({
      where: { id },
      data: {
        ...updates,
        registrationDate: updates.registrationDate
          ? new Date(updates.registrationDate)
          : undefined,
        motExpiryDate: updates.motExpiryDate
          ? new Date(updates.motExpiryDate)
          : undefined,
      },
    });
  },
};