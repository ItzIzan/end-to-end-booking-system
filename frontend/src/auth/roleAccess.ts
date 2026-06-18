import type { UserRole } from "../types";

export const routeAccess: Record<string, UserRole[]> = {
  "/": [
    "TRANSPORT_ADMIN",
    "OPS_ADMIN",
    "SECURITY",
    "DRIVER",
    "CUSTOMER",
    "END_USER",
  ],
  "/bookings": ["TRANSPORT_ADMIN", "OPS_ADMIN", "SECURITY", "CUSTOMER"],
  "/users": ["TRANSPORT_ADMIN"],
  "/driver": ["DRIVER"],
  "/customer": ["CUSTOMER"],
  "/security": ["SECURITY"],
  "/ops": ["OPS_ADMIN"],
};

export function canAccess(path: string, role: UserRole): boolean {
  const allowedRoles = routeAccess[path];

  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.includes(role);
}

export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case "TRANSPORT_ADMIN":
      return "/bookings";
    case "OPS_ADMIN":
      return "/ops";
    case "SECURITY":
      return "/security";
    case "DRIVER":
      return "/driver";
    case "CUSTOMER":
      return "/customer";
    case "END_USER":
      return "/customer";
    default:
      return "/";
  }
}