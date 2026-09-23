import type { BookingStatus } from "../types/booking";

const validTransitions: Record<
  BookingStatus,
  BookingStatus[]
> = {
  BOOKING_PENDING: [
    "BOOKING_COUNTER",
    "BOOKING_CONFIRMED",
    "CANCELLED",
  ],

  BOOKING_COUNTER: [
    "BOOKING_CONFIRMED",
    "CANCELLED",
  ],

  BOOKING_CONFIRMED: [
    "READY_TO_COLLECT",
    "CANCELLED",
  ],

  READY_TO_COLLECT: [
    "SECURITY_HOLD",
    "IN_TRANSIT",
    "CANCELLED",
  ],

  SECURITY_HOLD: [
    "READY_TO_COLLECT",
    "CANCELLED",
  ],

  IN_TRANSIT: [
    "DELIVERED_PENDING_CONFIRMATION",
  ],

  DELIVERED_PENDING_CONFIRMATION: [
    "COMPLETED",
  ],

  COMPLETED: [],

  CANCELLED: [],
};

export function isValidStatusTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  return validTransitions[
    currentStatus
  ].includes(nextStatus);
}