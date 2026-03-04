import { Booking } from "../types/booking";

let nextId = 1;

const bookings: Booking[] = [
  {
    id: nextId++,
    site: "Site A",
    reg: "AB12CDE",
    agreementRef: "AGR-001",
    make: "BMW",
    model: "320d",
    colour: "Black",
    dispatchDate: null,
    status: "BOOKING_PENDING",
    createdAt: new Date().toISOString(),
  },
];

export const bookingsStore = {
  getAll(): Booking[] {
    return bookings;
  },

  getById(id: number): Booking | undefined {
    return bookings.find((b) => b.id === id);
  },

  create(data: Omit<Booking, "id" | "createdAt">): Booking {
    const newBooking: Booking = {
      id: nextId++,
      createdAt: new Date().toISOString(),
      ...data,
    };

    bookings.push(newBooking);
    return newBooking;
  },
};