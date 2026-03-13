import { Request, Response } from "express";
import { bookingsStore } from "../store/bookings.store";
import { BookingStatus, BookingFilters } from "../types/booking";
import { isValidStatusTransition } from "../utils/bookingStatus";

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

    const allowedStatuses: BookingStatus[] = [
      "BOOKING_PENDING",
      "BOOKING_COUNTER",
      "BOOKING_CONFIRMED",
      "READY_TO_COLLECT",
      "COLLECTED",
      "IN_TRANSIT",
      "RELEASED",
    ];

    if (!allowedStatuses.includes(parsedStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    filters.status = parsedStatus;
  }

  const bookings = bookingsStore.getAll(filters);
  return res.json(bookings);
};

export const getBookingById = (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // Basic validation
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
  const { site, reg, agreementRef, make, model, colour } = req.body;

  if (!site || !reg || !agreementRef || !make || !model || !colour) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const booking = bookingsStore.create({
    site,
    reg,
    agreementRef,
    make,
    model,
    colour,
    dispatchDate: null,
    status: "BOOKING_PENDING"
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

  // Must provide at least one field
  if (status === undefined && dispatchDate === undefined) {
    return res.status(400).json({ error: "Provide status and/or dispatchDate" });
  }

  // Validate status if provided
  const allowedStatuses: BookingStatus[] = [
    "BOOKING_PENDING",
    "BOOKING_COUNTER",
    "BOOKING_CONFIRMED",
    "READY_TO_COLLECT",
    "COLLECTED",
    "IN_TRANSIT",
    "RELEASED",
  ];

  if (status !== undefined && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // (Light) validate dispatchDate format if provided and not null
  if (dispatchDate !== undefined && dispatchDate !== null) {
    // Accept YYYY-MM-DD for now (simple)
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
  const valid = isValidStatusTransition(booking.status, status);

  if (!valid) {
    return res.status(400).json({
      error: `Invalid status transition from ${booking.status} to ${status}`,
    });
  }
  }

  const updated = bookingsStore.updateById(id, { status, dispatchDate });

  if (!updated) {
    return res.status(404).json({ error: "Booking not found" });
  }

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

  // 204 = success, no response body
  return res.status(204).send();
};