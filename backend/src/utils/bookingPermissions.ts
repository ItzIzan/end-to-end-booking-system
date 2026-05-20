import type { Booking } from "../types/booking";
import type { UserRole } from "../types/user";

const ALL_USER_ROLES: UserRole[] = [
  "CUSTOMER",
  "TRANSPORT_ADMIN",
  "OPS_ADMIN",
  "SECURITY",
  "DRIVER",
  "END_USER",
];

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

export function requireRole(
  role: UserRole | null,
  allowedRoles: UserRole[]
): { allowed: boolean; reason?: string } {
  if (!role) {
    return {
      allowed: false,
      reason:
        "Missing or invalid x-user-role header. Allowed roles: CUSTOMER, TRANSPORT_ADMIN, OPS_ADMIN, SECURITY, DRIVER, END_USER",
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

export function canConfirmBooking(role: UserRole, booking: Booking) {
  if (booking.status === "BOOKING_PENDING") {
    return role === "TRANSPORT_ADMIN"
      ? { allowed: true }
      : {
          allowed: false,
          reason: "Only TRANSPORT_ADMIN can confirm from BOOKING_PENDING",
        };
  }

  if (booking.status === "BOOKING_COUNTER") {
    return role === "CUSTOMER"
      ? { allowed: true }
      : {
          allowed: false,
          reason: "Only CUSTOMER can confirm from BOOKING_COUNTER",
        };
  }

  return {
    allowed: false,
    reason: `Cannot confirm booking from ${booking.status}`,
  };
}

export function canMarkReady(role: UserRole, booking: Booking) {
  if (role !== "OPS_ADMIN") {
    return { allowed: false, reason: "Only OPS_ADMIN can mark ready" };
  }

  if (booking.status !== "BOOKING_CONFIRMED") {
    return {
      allowed: false,
      reason: `Can only mark ready from BOOKING_CONFIRMED, current status is ${booking.status}`,
    };
  }

  return { allowed: true };
}

export function canReleaseFromSite(role: UserRole, booking: Booking) {
  if (role !== "SECURITY") {
    return {
      allowed: false,
      reason: "Only SECURITY can release vehicle from site",
    };
  }

  if (booking.status !== "READY_TO_COLLECT") {
    return {
      allowed: false,
      reason: `Can only release from site from READY_TO_COLLECT, current status is ${booking.status}`,
    };
  }

  return { allowed: true };
}

export function canDispatch(role: UserRole, booking: Booking) {
  if (role !== "TRANSPORT_ADMIN") {
    return {
      allowed: false,
      reason: "Only TRANSPORT_ADMIN can dispatch booking",
    };
  }

  if (booking.status !== "SITE_RELEASED") {
    return {
      allowed: false,
      reason: `Can only dispatch from SITE_RELEASED, current status is ${booking.status}`,
    };
  }

  if (!booking.assignedDriverName) {
    return {
      allowed: false,
      reason: "Cannot dispatch before a driver has been assigned",
    };
  }

  return { allowed: true };
}

export function canStartTransit(role: UserRole, booking: Booking) {
  if (role !== "DRIVER") {
    return { allowed: false, reason: "Only DRIVER can start transit" };
  }

  if (booking.status !== "ADMIN_DISPATCHED") {
    return {
      allowed: false,
      reason: `Can only start transit from ADMIN_DISPATCHED, current status is ${booking.status}`,
    };
  }

  if (!booking.assignedDriverName) {
    return {
      allowed: false,
      reason: "Cannot start transit before a driver has been assigned",
    };
  }

  return { allowed: true };
}

export function canComplete(role: UserRole, booking: Booking) {
  if (role !== "TRANSPORT_ADMIN") {
    return {
      allowed: false,
      reason: "Only TRANSPORT_ADMIN can complete booking",
    };
  }

  if (booking.status !== "IN_TRANSIT") {
    return {
      allowed: false,
      reason: `Can only complete from IN_TRANSIT, current status is ${booking.status}`,
    };
  }

  if (!booking.driverDelivered || !booking.endUserDelivered) {
    return {
      allowed: false,
      reason:
        "Booking cannot be COMPLETED until driver and end user delivery are both confirmed",
    };
  }

  return { allowed: true };
}