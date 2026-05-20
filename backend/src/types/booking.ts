import type { UserRole } from "./user";

export type BookingStatus =
  | "BOOKING_PENDING"
  | "BOOKING_COUNTER"
  | "BOOKING_CONFIRMED"
  | "READY_TO_COLLECT"
  | "SITE_RELEASED"
  | "ADMIN_DISPATCHED"
  | "IN_TRANSIT"
  | "COMPLETED";

export interface Booking {
  id: number;
  site: string;
  reg: string;
  agreementRef: string;
  make: string;
  model: string;
  colour: string;
  dispatchDate: string | null;
  status: BookingStatus;
  createdAt: string;
  customerName: string;
  lastCounteredBy: Extract<UserRole, "CUSTOMER" | "TRANSPORT_ADMIN"> | null;
  assignedDriverName: string | null;
  driverDelivered: boolean;
  endUserDelivered: boolean;
}

export type BookingFilters = {
  id?: number;
  site?: string;
  reg?: string;
  agreementRef?: string;
  make?: string;
  model?: string;
  colour?: string;
  dispatchDate?: string | null;
  status?: BookingStatus;
};