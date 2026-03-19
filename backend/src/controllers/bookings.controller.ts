import { Request, Response } from "express";
import { bookingsStore } from "../store/bookings.store";
import type { BookingStatus, BookingFilters } from "../types/booking";
import { isValidStatusTransition } from "../utils/bookingStatus";
import {
  canRoleMakeTransition,
  getRoleFromHeader,
  requireRole,
} from "../utils/bookingPermissions";

const ALLOWED_STATUSES: BookingStatus[] = [
  "BOOKING_PENDING",
  "BOOKING_COUNTER",
  "BOOKING_CONFIRMED",
  "READY_TO_COLLECT",
  "COLLECTED",
  "IN_TRANSIT",
  "RELEASED",
];

export const getBookings = (req: Request, res: Response) => {
  const {
    id,
    site,
    reg,
    agreementRef,
    make,
    model,
    colour,
    dispatchDate,
    status,
  } = req.query;

  const filters: BookingFilters = {};

  if (id !== undefined) {
    const parsedId = Number(id);

    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: "id must be a number" });
    }

    filters.id = parsedId;
  }

  if (site !== undefined) filters.site = String(site);
  if (reg !== undefined) filters.reg = String(reg);
  if (agreementRef !== undefined) filters.agreementRef = String(agreementRef);
  if (make !== undefined) filters.make = String(make);
  if (model !== undefined) filters.model = String(model);
  if (colour !== undefined) filters.colour = String(colour);

  if (dispatchDate !== undefined) {
    const parsedDispatchDate = String(dispatchDate);

    if (parsedDispatchDate !== "null") {
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(parsedDispatchDate);

      if (!isValid) {
        return res.status(400).json({
          error: "dispatchDate must be YYYY-MM-DD or null",
        });
      }

      filters.dispatchDate = parsedDispatchDate;
    } else {
      filters.dispatchDate = null;
    }
  }

  if (status !== undefined) {
    const parsedStatus = String(status) as BookingStatus;

    if (!ALLOWED_STATUSES.includes(parsedStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    filters.status = parsedStatus;
  }

  const bookings = bookingsStore.getAll(filters);
  return res.json(bookings);
};

export const getBookingById = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const booking = bookingsStore.getById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json(booking);
};

export const createBooking = (req: Request, res: Response) => {
  const { site, reg, agreementRef, make, model, colour, customerName } = req.body;

  if (!site || !reg || !agreementRef || !make || !model || !colour || !customerName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const booking = bookingsStore.create({
    site,
    reg,
    agreementRef,
    make,
    model,
    colour,
    customerName,
    dispatchDate: null,
    status: "BOOKING_PENDING",
    lastCounteredBy: null,
    assignedDriverName: null,
    driverDelivered: false,
    endUserDelivered: false,
  });

  return res.status(201).json(booking);
};

export const updateBooking = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const { status, dispatchDate } = req.body as {
    status?: BookingStatus;
    dispatchDate?: string | null;
  };

  if (status === undefined && dispatchDate === undefined) {
    return res.status(400).json({ error: "Provide status and/or dispatchDate" });
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (dispatchDate !== undefined && dispatchDate !== null) {
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(dispatchDate);

    if (!isValid) {
      return res.status(400).json({ error: "dispatchDate must be YYYY-MM-DD or null" });
    }
  }

  const booking = bookingsStore.getById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (status !== undefined) {
    const role = getRoleFromHeader(req.header("x-user-role"));

    if (!role) {
      return res.status(400).json({
        error:
          "Missing or invalid x-user-role header. Allowed roles: CUSTOMER, DRIVER_ADMIN, OPS_ADMIN, SECURITY, DRIVER, END_USER",
      });
    }

    const validTransition = isValidStatusTransition(booking.status, status);

    if (!validTransition) {
      return res.status(400).json({
        error: `Invalid status transition from ${booking.status} to ${status}`,
      });
    }

    const permissionCheck = canRoleMakeTransition(role, booking, status);

    if (!permissionCheck.allowed) {
      return res.status(403).json({
        error: permissionCheck.reason ?? "You are not allowed to make this status change",
      });
    }
  }

  const updated = bookingsStore.updateById(id, {
    status,
    dispatchDate,
  });

  if (!updated) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json(updated);
};

export const assignDriver = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRoleFromHeader(req.header("x-user-role"));
  const roleCheck = requireRole(role, ["DRIVER_ADMIN"]);

  if (!roleCheck.allowed) {
    return res.status(role ? 403 : 400).json({
      error: roleCheck.reason,
    });
  }

  const { assignedDriverName } = req.body as {
    assignedDriverName?: string;
  };

  if (!assignedDriverName || !assignedDriverName.trim()) {
    return res.status(400).json({
      error: "assignedDriverName is required",
    });
  }

  const booking = bookingsStore.getById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status !== "BOOKING_CONFIRMED" && booking.status !== "READY_TO_COLLECT") {
    return res.status(400).json({
      error: "Driver can only be assigned when booking is BOOKING_CONFIRMED or READY_TO_COLLECT",
    });
  }

  const updated = bookingsStore.updateById(id, {
    assignedDriverName: assignedDriverName.trim(),
  });

  return res.json(updated);
};

export const confirmDriverDelivered = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRoleFromHeader(req.header("x-user-role"));
  const roleCheck = requireRole(role, ["DRIVER"]);

  if (!roleCheck.allowed) {
    return res.status(role ? 403 : 400).json({
      error: roleCheck.reason,
    });
  }

  const booking = bookingsStore.getById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status !== "IN_TRANSIT") {
    return res.status(400).json({
      error: "Driver delivery can only be confirmed when booking is IN_TRANSIT",
    });
  }

  if (!booking.assignedDriverName) {
    return res.status(400).json({
      error: "Cannot confirm driver delivery before a driver has been assigned",
    });
  }

  if (booking.driverDelivered) {
    return res.status(400).json({
      error: "Driver delivery has already been confirmed",
    });
  }

  const updated = bookingsStore.updateById(id, {
    driverDelivered: true,
  });

  return res.json(updated);
};

export const confirmEndUserDelivered = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRoleFromHeader(req.header("x-user-role"));
  const roleCheck = requireRole(role, ["END_USER"]);

  if (!roleCheck.allowed) {
    return res.status(role ? 403 : 400).json({
      error: roleCheck.reason,
    });
  }

  const booking = bookingsStore.getById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status !== "IN_TRANSIT") {
    return res.status(400).json({
      error: "End user delivery can only be confirmed when booking is IN_TRANSIT",
    });
  }

  if (!booking.driverDelivered) {
    return res.status(400).json({
      error: "End user delivery cannot be confirmed before driver delivery is confirmed",
    });
  }

  if (booking.endUserDelivered) {
    return res.status(400).json({
      error: "End user delivery has already been confirmed",
    });
  }

  const updated = bookingsStore.updateById(id, {
    endUserDelivered: true,
  });

  return res.json(updated);
};

export const deleteBooking = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const deleted = bookingsStore.deleteById(id);

  if (!deleted) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.status(204).send();
};