export type UserRole =
  | "CUSTOMER"
  | "TRANSPORT_ADMIN"
  | "OPS_ADMIN"
  | "SECURITY"
  | "DRIVER"
  | "END_USER";

export type BookingStatus =
  | "BOOKING_PENDING"
  | "BOOKING_COUNTER"
  | "BOOKING_CONFIRMED"
  | "READY_TO_COLLECT"
  | "SITE_RELEASED"
  | "ADMIN_DISPATCHED"
  | "IN_TRANSIT"
  | "COMPLETED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

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
  lastCounteredBy: UserRole | null;
  assignedDriverName: string | null;
  driverDelivered: boolean;
  endUserDelivered: boolean;
}

export interface AuditLog {
  id: number;
  bookingId: number;
  action: string;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  changedByUserId: number | null;
  changedByRole: UserRole | null;
  changedByName: string | null;
  createdAt: string;
}