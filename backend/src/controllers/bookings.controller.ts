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