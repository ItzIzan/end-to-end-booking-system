import type { UserRole } from "./user";

export type BookingStatus =
  | "BOOKING_PENDING"
  | "BOOKING_COUNTER"
  | "BOOKING_CONFIRMED"
  | "READY_TO_COLLECT"
  | "SITE_RELEASED"
  | "SECURITY_REJECTED"
  | "ADMIN_DISPATCHED"
  | "IN_TRANSIT"
  | "COMPLETED";

export interface Booking {
  id: number;
  vehicleId: number;
  jobNumber: string;
  agreementRef: string;

  customerName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;

  requestedCollectionDate: string;
  confirmedCollectionDate: string | null;
  counterProposedDate: string | null;
  dispatchDate: string | null;

  status: BookingStatus;
  lastCounteredBy: UserRole | null;
  assignedDriverId: number | null;
  createdByUserId: number | null;
  driverDelivered: boolean;
  endUserDelivered: boolean;
  securityRejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BookingFilters = {
  id?: number;
  vehicleId?: number;
  jobNumber?: string;
  agreementRef?: string;
  customerName?: string;
  customerEmail?: string;
  status?: BookingStatus;
  assignedDriverId?: number;
};