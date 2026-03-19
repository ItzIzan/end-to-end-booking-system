import type { Booking, BookingFilters } from "../types/booking";

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
    customerName: "John Smith",
    lastCounteredBy: null,
    assignedDriverName: null,
    driverDelivered: false,
    endUserDelivered: false,
  },
];

export const bookingsStore = {
  getAll(filters?: BookingFilters): Booking[] {
    let result = [...bookings];

    if (!filters) {
      return result;
    }

    const entries = Object.entries(filters) as [
      keyof BookingFilters,
      BookingFilters[keyof BookingFilters]
    ][];

    for (const [key, value] of entries) {
      if (value === undefined) {
        continue;
      }

      result = result.filter((booking) => {
        const bookingValue = booking[key];

        if (typeof bookingValue === "string" && typeof value === "string") {
          return bookingValue.toLowerCase() === value.toLowerCase();
        }

        return bookingValue === value;
      });
    }

    return result;
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

  updateById(
    id: number,
    updates: Partial<
      Pick<
        Booking,
        | "status"
        | "dispatchDate"
        | "lastCounteredBy"
        | "assignedDriverName"
        | "driverDelivered"
        | "endUserDelivered"
      >
    >
  ): Booking | undefined {
    const booking = bookings.find((b) => b.id === id);

    if (!booking) {
      return undefined;
    }

    if (updates.status !== undefined) {
      booking.status = updates.status;
    }

    if (updates.dispatchDate !== undefined) {
      booking.dispatchDate = updates.dispatchDate;
    }

    if (updates.lastCounteredBy !== undefined) {
      booking.lastCounteredBy = updates.lastCounteredBy;
    }

    if (updates.assignedDriverName !== undefined) {
      booking.assignedDriverName = updates.assignedDriverName;
    }

    if (updates.driverDelivered !== undefined) {
      booking.driverDelivered = updates.driverDelivered;
    }

    if (updates.endUserDelivered !== undefined) {
      booking.endUserDelivered = updates.endUserDelivered;
    }

    return booking;
  },

  deleteById(id: number): boolean {
    const index = bookings.findIndex((b) => b.id === id);

    if (index === -1) {
      return false;
    }

    bookings.splice(index, 1);
    return true;
  },
};