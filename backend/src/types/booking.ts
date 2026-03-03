export type BookingStatus =
  | "BOOKING_PENDING"
  | "BOOKING_COUNTER"
  | "BOOKING_CONFIRMED"
  | "READY_TO_COLLECT"
  | "COLLECTED"
  | "IN_TRANSIT"
  | "RELEASED";

export interface Booking {
  id: number;
  site: string;
  reg: string;
  agreementRef: string;
  make: string;
  model: string;
  colour: string;
  dispatchDate: string | null; // ISO date string later, null until set
  status: BookingStatus;
  createdAt: string; // ISO timestamp
}