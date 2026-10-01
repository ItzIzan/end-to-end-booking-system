const { prisma } = require("../lib/prisma");

import type {
  CreateVehicleInput,
  Vehicle,
  VehicleFilters,
} from "../types/vehicle";
import {
  normaliseReg,
  normaliseVin,
} from "../utils/vehicleIdentifiers";

export const vehiclesStore = {
  async getAll(filters?: VehicleFilters): Promise<Vehicle[]> {
    const where: Record<string, unknown> = {};

    if (filters) {
      if (filters.id !== undefined) {
        where.id = filters.id;
      }

      if (filters.siteId !== undefined) {
        where.siteId = filters.siteId;
      }

      if (filters.customerAccountId !== undefined) {
        where.customerAccountId = filters.customerAccountId;
      }

      if (filters.fuelType !== undefined) {
        where.fuelType = filters.fuelType;
      }

      if (filters.vehicleStatus !== undefined) {
        where.vehicleStatus = filters.vehicleStatus;
      }

      if (filters.stockStage) {
        where.stockStage = {
          contains: filters.stockStage,
          mode: "insensitive",
        };
      }

      const stringFields = [
        "reg",
        "vin",
        "make",
        "model",
        "colour",
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

    return prisma.vehicle.findMany({
      where,
      include: {
        site: true,
        customerAccount: true,
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
        customerAccount: true,
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  },

  async getByExactVin(vin: string): Promise<Vehicle | null> {
    return prisma.vehicle.findFirst({
      where: {
        vin: {
          equals: normaliseVin(vin),
          mode: "insensitive",
        },
      },
      include: {
        site: true,
        customerAccount: true,
      },
    });
  },

  async getByIdentifier(identifier: string): Promise<Vehicle | null> {
    const vin = normaliseVin(identifier);
    const reg = normaliseReg(identifier);

    const matches = await prisma.vehicle.findMany({
      where: {
        OR: [
          {
            vin: {
              equals: vin,
              mode: "insensitive",
            },
          },
          {
            reg: {
              equals: reg,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        site: true,
        customerAccount: true,
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { id: "desc" },
      ],
    });

    if (matches.length === 0) {
      return null;
    }

    return (
      matches.find(
        (vehicle: Vehicle) =>
          vehicle.vehicleStatus !== "REMOVED"
      ) ?? matches[0]
    );
  },

  async create(data: CreateVehicleInput): Promise<Vehicle> {
    return prisma.vehicle.create({
      data: {
        ...data,
        vin: normaliseVin(data.vin),
        reg: normaliseReg(data.reg),
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
        vin:
          updates.vin !== undefined
            ? normaliseVin(updates.vin)
            : undefined,
        reg:
          updates.reg !== undefined
            ? normaliseReg(updates.reg)
            : undefined,
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