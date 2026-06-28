export type VehicleStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "HOLD"
  | "REMOVED";

export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";

export type VehicleSource = "MANUAL" | "CSV_IMPORT";

export interface Vehicle {
  id: number;
  siteId: number;
  vin: string;
  reg: string;
  make: string;
  model: string;
  colour: string;
  fuelType: FuelType;
  mileage: number;
  registrationDate: string;
  motExpiryDate: string;
  vehicleStatus: VehicleStatus;
  source: VehicleSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  siteId: number;
  vin: string;
  reg: string;
  make: string;
  model: string;
  colour: string;
  fuelType: FuelType;
  mileage: number;
  registrationDate: string;
  motExpiryDate: string;
  vehicleStatus?: VehicleStatus;
  source?: VehicleSource;
}

export type VehicleFilters = {
  id?: number;
  siteId?: number;
  reg?: string;
  vin?: string;
  make?: string;
  model?: string;
  colour?: string;
  fuelType?: FuelType;
  vehicleStatus?: VehicleStatus;
};