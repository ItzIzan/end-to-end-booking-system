import type { Booking } from "../types/booking";
import type { UserRole } from "../types/user";

const ALL_USER_ROLES: UserRole[] = [
  "SYSTEM_ADMIN",
  "CUSTOMER",
  "TRANSPORT_ADMIN",
  "OPS_ADMIN",
  "SECURITY",
  "DRIVER",
];

export function isUserRole(
  value: string
): value is UserRole {
  return ALL_USER_ROLES.includes(
    value as UserRole
  );
}

export function getRoleFromHeader(
  roleHeader: unknown
): UserRole | null {
  if (typeof roleHeader !== "string") {
    return null;
  }

  const normalisedRole =
    roleHeader.trim().toUpperCase();

  if (!isUserRole(normalisedRole)) {
    return null;
  }

  return normalisedRole;
}

export function requireRole(
  role: UserRole | null,
  allowedRoles: UserRole[]
): {
  allowed: boolean;
  reason?: string;
} {
  if (!role) {
    return {
      allowed: false,
      reason: "Missing or invalid user role",
    };
  }

  if (role === "SYSTEM_ADMIN") {
    return {
      allowed: true,
    };
  }

  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role ${role} is not allowed to perform this action`,
    };
  }

  return {
    allowed: true,
  };
}

export function canAcceptBookingDate(
  role: UserRole,
  booking: Booking
) {
  if (role === "SYSTEM_ADMIN") {
    return { allowed: true };
  }

  if (role !== "TRANSPORT_ADMIN") {
    return {
      allowed: false,
      reason:
        "Only TRANSPORT_ADMIN can accept booking dates",
    };
  }

  if (booking.status !== "BOOKING_PENDING") {
    return {
      allowed: false,
      reason:
        `Can only accept a date from BOOKING_PENDING. ` +
        `Current status is ${booking.status}`,
    };
  }

  return { allowed: true };
}

export function canCounterBookingDate(
  role: UserRole,
  booking: Booking
) {
  if (role === "SYSTEM_ADMIN") {
    return { allowed: true };
  }

  if (role !== "TRANSPORT_ADMIN") {
    return {
      allowed: false,
      reason:
        "Only TRANSPORT_ADMIN can counter booking dates",
    };
  }

  if (
    booking.status !== "BOOKING_PENDING" &&
    booking.status !== "BOOKING_COUNTER"
  ) {
    return {
      allowed: false,
      reason:
        `Can only counter from BOOKING_PENDING or BOOKING_COUNTER. ` +
        `Current status is ${booking.status}`,
    };
  }

  return { allowed: true };
}

export function canCustomerAcceptCounter(
  role: UserRole,
  booking: Booking
) {
  if (role === "SYSTEM_ADMIN") {
    return { allowed: true };
  }

  if (role !== "CUSTOMER") {
    return {
      allowed: false,
      reason:
        "Only CUSTOMER can accept the counter date",
    };
  }

  if (booking.status !== "BOOKING_COUNTER") {
    return {
      allowed: false,
      reason:
        `Can only accept counter from BOOKING_COUNTER. ` +
        `Current status is ${booking.status}`,
    };
  }

  if (!booking.counterProposedDate) {
    return {
      allowed: false,
      reason: "No counter date exists",
    };
  }

  return { allowed: true };
}

export function canMarkReady(
  role: UserRole,
  booking: Booking
) {
  if (role === "SYSTEM_ADMIN") {
    return { allowed: true };
  }

  if (role !== "OPS_ADMIN") {
    return {
      allowed: false,
      reason:
        "Only OPS_ADMIN can mark a vehicle ready",
    };
  }

  if (booking.status !== "BOOKING_CONFIRMED") {
    return {
      allowed: false,
      reason:
        `Can only mark ready from BOOKING_CONFIRMED. ` +
        `Current status is ${booking.status}`,
    };
  }

  return { allowed: true };
}