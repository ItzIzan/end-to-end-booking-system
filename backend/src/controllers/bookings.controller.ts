import { Request, Response } from "express";

export const getBookings = (_req: Request, res: Response) => {
  // Temporary mock data
  const bookings = [
    { id: 1, vehicle: "ABC123", status: "pending" },
    { id: 2, vehicle: "XYZ789", status: "approved" }
  ];

  res.json(bookings);
};