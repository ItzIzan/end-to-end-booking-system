import { apiRequest } from "./client";
import type { AuditLog, Booking, User } from "../types";

export function getBookings(currentUser: User) {
  return apiRequest<Booking[]>("/bookings", {}, currentUser);
}

export function getBooking(id: string, currentUser: User) {
  return apiRequest<Booking>(`/bookings/${id}`, {}, currentUser);
}

export function getBookingAudit(id: string, currentUser: User) {
  return apiRequest<AuditLog[]>(`/bookings/${id}/audit`, {}, currentUser);
}