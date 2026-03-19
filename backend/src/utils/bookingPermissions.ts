import type { Booking, BookingStatus } from "../types/booking";
import type { UserRole } from "../types/user";

const ALL_USER_ROLES: UserRole[] = [
  "CUSTOMER",
  "DRIVER_ADMIN",
  "OPS_ADMIN",
  "SECURITY",
  "DRIVER",
  "END_USER",
];

const STATUS_ROLE_RULES: Record<BookingStatus, UserRole[]> = {
  BOOKING_PENDING: ["CUSTOMER"],
  BOOKING_COUNTER: ["CUSTOMER", "DRIVER_ADMIN"],
  BOOKING_CONFIRMED: ["CUSTOMER", "DRIVER_ADMIN"],
  READY_TO_COLLECT: ["OPS_ADMIN"],
  COLLECTED: ["SECURITY"],
  IN_TRANSIT: ["DRIVER"],
  RELEASED: ["SECURITY"],
};

export function isUserRole(value: string): value is UserRole {
  return ALL_USER_ROLES.includes(value as UserRole);
}

export function getRoleFromHeader(roleHeader: unknown): UserRole | null {
  if (typeof roleHeader !== "string") {
    return null;
  }

  const normalisedRole = roleHeader.trim().toUpperCase();

  if (!isUserRole(normalisedRole)) {
    return null;
  }

  return normalisedRole;
}

export function canRoleMoveToStatus(role: UserRole, nextStatus: BookingStatus): boolean {
  return STATUS_ROLE_RULES[nextStatus].includes(role);
}

export function canRoleMakeTransition(
  role: UserRole,
  booking: Booking,
  nextStatus: BookingStatus
): { allowed: boolean; reason?: string } {
  if (!canRoleMoveToStatus(role, nextStatus)) {
    return {
      allowed: false,
      reason: `${role} is not allowed to move a booking to ${nextStatus}`,
    };
  }

  if (nextStatus === "BOOKING_COUNTER") {
    if (role !== "CUSTOMER" && role !== "DRIVER_ADMIN") {
      return {
        allowed: false,
        reason: "Only CUSTOMER or DRIVER_ADMIN can counter a booking",
      };
    }
  }

  if (nextStatus === "BOOKING_CONFIRMED") {
    if (booking.status === "BOOKING_PENDING" && role !== "DRIVER_ADMIN") {
      return {
        allowed: false,
        reason: "Only DRIVER_ADMIN can confirm directly from BOOKING_PENDING",
      };
    }

    if (booking.status === "BOOKING_COUNTER" && role !== "CUSTOMER") {
      return {
        allowed: false,
        reason: "Only CUSTOMER can confirm after a booking has been countered",
      };
    }
  }

  if (nextStatus === "RELEASED") {
    if (!booking.driverDelivered || !booking.endUserDelivered) {
      return {
        allowed: false,
        reason: "Booking cannot be RELEASED until driver and end user delivery are both confirmed",
      };
    }
  }

  return { allowed: true };
}

export function requireRole(
  role: UserRole | null,
  allowedRoles: UserRole[]
): { allowed: boolean; reason?: string } {
  if (!role) {
    return {
      allowed: false,
      reason:
        "Missing or invalid x-user-role header. Allowed roles: CUSTOMER, DRIVER_ADMIN, OPS_ADMIN, SECURITY, DRIVER, END_USER",
    };
  }

  if (!allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role ${role} is not allowed to perform this action`,
    };
  }

  return { allowed: true };
}