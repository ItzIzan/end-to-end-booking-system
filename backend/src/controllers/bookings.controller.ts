import { Request, Response } from "express";
import { bookingsStore } from "../store/bookings.store";

export const getBookings = (_req: Request, res: Response) => {
  const bookings = bookingsStore.getAll();
  res.json(bookings);
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