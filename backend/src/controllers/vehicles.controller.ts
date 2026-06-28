import { Request, Response } from "express";
import { auditLogsStore } from "../store/auditLogs.store";
import { sitesStore } from "../store/sites.store";
import { vehiclesStore } from "../store/vehicles.store";
import type {
  FuelType,
  VehicleFilters,
  VehicleSource,
  VehicleStatus,
} from "../types/vehicle";
import { getRoleFromHeader } from "../utils/bookingPermissions";

const VEHICLE_STATUSES: VehicleStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "HOLD",
  "REMOVED",
];

const FUEL_TYPES: FuelType[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"];

const VEHICLE_SOURCES: VehicleSource[] = ["MANUAL", "CSV_IMPORT"];

function getActor(req: Request) {
  const userIdHeader = req.header("x-user-id");
  const userId = userIdHeader ? Number(userIdHeader) : null;

  return {
    changedByUserId: userId && !Number.isNaN(userId) ? userId : null,
    changedByRole: getRoleFromHeader(req.header("x-user-role")),
    changedByName: req.header("x-user-name") || null,
  };
}

function isDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export const getVehicles = async (req: Request, res: Response) => {
  const {
    id,
    siteId,
    reg,
    vin,
    make,
    model,
    colour,
    fuelType,
    vehicleStatus,
  } = req.query;

  const filters: VehicleFilters = {};

  if (id !== undefined) {
    const parsedId = Number(id);
    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: "id must be a number" });
    }
    filters.id = parsedId;
  }

  if (siteId !== undefined) {
    const parsedSiteId = Number(siteId);
    if (Number.isNaN(parsedSiteId)) {
      return res.status(400).json({ error: "siteId must be a number" });
    }
    filters.siteId = parsedSiteId;
  }

  if (reg !== undefined) filters.reg = String(reg);
  if (vin !== undefined) filters.vin = String(vin);
  if (make !== undefined) filters.make = String(make);
  if (model !== undefined) filters.model = String(model);
  if (colour !== undefined) filters.colour = String(colour);

  if (fuelType !== undefined) {
    const parsedFuelType = String(fuelType).toUpperCase() as FuelType;

    if (!FUEL_TYPES.includes(parsedFuelType)) {
      return res.status(400).json({ error: "Invalid fuelType" });
    }

    filters.fuelType = parsedFuelType;
  }

  if (vehicleStatus !== undefined) {
    const parsedStatus = String(vehicleStatus).toUpperCase() as VehicleStatus;

    if (!VEHICLE_STATUSES.includes(parsedStatus)) {
      return res.status(400).json({ error: "Invalid vehicleStatus" });
    }

    filters.vehicleStatus = parsedStatus;
  }

  const vehicles = await vehiclesStore.getAll(filters);
  return res.json(vehicles);
};

export const getVehicleById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid vehicle id" });
  }

  const vehicle = await vehiclesStore.getById(id);

  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  return res.json(vehicle);
};

export const createVehicle = async (req: Request, res: Response) => {
  const {
    siteId,
    vin,
    reg,
    make,
    model,
    colour,
    fuelType,
    mileage,
    registrationDate,
    motExpiryDate,
    vehicleStatus = "AVAILABLE",
    source = "MANUAL",
  } = req.body;

  if (
    !siteId ||
    !vin ||
    !reg ||
    !make ||
    !model ||
    !colour ||
    !fuelType ||
    mileage === undefined ||
    !registrationDate ||
    !motExpiryDate
  ) {
    return res.status(400).json({
      error:
        "siteId, vin, reg, make, model, colour, fuelType, mileage, registrationDate and motExpiryDate are required",
    });
  }

  const parsedSiteId = Number(siteId);
  const parsedMileage = Number(mileage);

  if (Number.isNaN(parsedSiteId)) {
    return res.status(400).json({ error: "siteId must be a number" });
  }

  if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
    return res.status(400).json({ error: "mileage must be 0 or more" });
  }

  const parsedFuelType = String(fuelType).toUpperCase() as FuelType;
  const parsedVehicleStatus = String(vehicleStatus).toUpperCase() as VehicleStatus;
  const parsedSource = String(source).toUpperCase() as VehicleSource;

  if (!FUEL_TYPES.includes(parsedFuelType)) {
    return res.status(400).json({ error: "Invalid fuelType" });
  }

  if (!VEHICLE_STATUSES.includes(parsedVehicleStatus)) {
    return res.status(400).json({ error: "Invalid vehicleStatus" });
  }

  if (!VEHICLE_SOURCES.includes(parsedSource)) {
    return res.status(400).json({ error: "Invalid source" });
  }

  if (!isDateString(registrationDate) || !isDateString(motExpiryDate)) {
    return res.status(400).json({
      error: "registrationDate and motExpiryDate must be valid dates",
    });
  }

  const site = await sitesStore.getById(parsedSiteId);

  if (!site || !site.isActive) {
    return res.status(400).json({
      error: "Site does not exist or is inactive",
    });
  }

  const vehicle = await vehiclesStore.create({
    siteId: parsedSiteId,
    vin,
    reg,
    make,
    model,
    colour,
    fuelType: parsedFuelType,
    mileage: parsedMileage,
    registrationDate,
    motExpiryDate,
    vehicleStatus: parsedVehicleStatus,
    source: parsedSource,
  });

  await auditLogsStore.create({
    entityType: "VEHICLE",
    entityId: vehicle.id,
    action: "VEHICLE_CREATED",
    fieldName: "vehicleStatus",
    previousValue: null,
    newValue: vehicle.vehicleStatus,
    ...getActor(req),
  });

  return res.status(201).json(vehicle);
};

export const updateVehicle = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid vehicle id" });
  }

  const existing = await vehiclesStore.getById(id);

  if (!existing) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  const updates = { ...req.body };

  if (updates.mileage !== undefined) {
    updates.mileage = Number(updates.mileage);

    if (Number.isNaN(updates.mileage) || updates.mileage < 0) {
      return res.status(400).json({ error: "mileage must be 0 or more" });
    }
  }

  if (updates.siteId !== undefined) {
    updates.siteId = Number(updates.siteId);

    if (Number.isNaN(updates.siteId)) {
      return res.status(400).json({ error: "siteId must be a number" });
    }
  }

  if (updates.fuelType !== undefined) {
    updates.fuelType = String(updates.fuelType).toUpperCase();

    if (!FUEL_TYPES.includes(updates.fuelType)) {
      return res.status(400).json({ error: "Invalid fuelType" });
    }
  }

  if (updates.vehicleStatus !== undefined) {
    updates.vehicleStatus = String(updates.vehicleStatus).toUpperCase();

    if (!VEHICLE_STATUSES.includes(updates.vehicleStatus)) {
      return res.status(400).json({ error: "Invalid vehicleStatus" });
    }
  }

  if (updates.source !== undefined) {
    updates.source = String(updates.source).toUpperCase();

    if (!VEHICLE_SOURCES.includes(updates.source)) {
      return res.status(400).json({ error: "Invalid source" });
    }
  }

  const updated = await vehiclesStore.updateById(id, updates);

  await auditLogsStore.create({
    entityType: "VEHICLE",
    entityId: id,
    action: "VEHICLE_UPDATED",
    fieldName: null,
    previousValue: JSON.stringify(existing),
    newValue: JSON.stringify(updated),
    ...getActor(req),
  });

  return res.json(updated);
};