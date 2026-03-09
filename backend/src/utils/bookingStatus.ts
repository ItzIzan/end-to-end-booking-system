import type { BookingStatus } from "../types/booking";

const validTransitions: Record<BookingStatus, BookingStatus[]> = {
  BOOKING_PENDING: ["BOOKING_COUNTER", "BOOKING_CONFIRMED"],
  BOOKING_COUNTER: ["BOOKING_CONFIRMED"],
  BOOKING_CONFIRMED: ["READY_TO_COLLECT"],
  READY_TO_COLLECT: ["COLLECTED"],
  COLLECTED: ["IN_TRANSIT"],
  IN_TRANSIT: ["RELEASED"],
  RELEASED: []
};

export function isValidStatusTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedNextStatuses = validTransitions[currentStatus];

  return allowedNextStatuses.includes(nextStatus);
}