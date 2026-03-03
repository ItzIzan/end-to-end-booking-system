import { Booking } from "../types/booking";

let nextId = 1;

// Seed data so GET endpoints return something immediately.
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
  {
    id: nextId++,
    site: "Site B",
    reg: "XY98ZTR",
    agreementRef: "AGR-002",
    make: "Ford",
    model: "Fiesta",
    colour: "Blue",
    dispatchDate: null,
    status: "READY_TO_COLLECT",
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
};