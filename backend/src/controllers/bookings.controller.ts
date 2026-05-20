import { Request, Response } from "express";
import { bookingsStore } from "../store/bookings.store";
import type { Booking, BookingFilters, BookingStatus } from "../types/booking";
import {
  canComplete,
  canConfirmBooking,
  canDispatch,
  canMarkReady,
  canReleaseFromSite,
  canStartTransit,
  getRoleFromHeader,
  requireRole,
} from "../utils/bookingPermissions";

const ALLOWED_STATUSES: BookingStatus[] = [
  "BOOKING_PENDING",
  "BOOKING_COUNTER",
  "BOOKING_CONFIRMED",
  "READY_TO_COLLECT",
  "SITE_RELEASED",
  "ADMIN_DISPATCHED",
  "IN_TRANSIT",
  "COMPLETED",
];

function parseBookingId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isNaN(id) ? null : id;
}

async function getBookingOr404(
  id: number,
  res: Response
): Promise<Booking | null> {
  const booking = await bookingsStore.getById(id);

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return null;
  }

  return booking;
}

function getRequestRole(req: Request) {
  return getRoleFromHeader(req.header("x-user-role"));
}

function handleRoleCheck(
  res: Response,
  role: ReturnType<typeof getRoleFromHeader>,
  allowedRoles: Parameters<typeof requireRole>[1]
): boolean {
  const roleCheck = requireRole(role, allowedRoles);

  if (!roleCheck.allowed) {
    res.status(role ? 403 : 400).json({
      error: roleCheck.reason,
    });
    return false;
  }

  return true;
}

async function updateStatusAndRespond(
  res: Response,
  bookingId: number,
  nextStatus: BookingStatus
) {
  const updated = await bookingsStore.updateById(bookingId, {
    status: nextStatus,
  });

  return res.json(updated);
}

export const getBookings = async (req: Request, res: Response) => {
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

  const bookings = await bookingsStore.getAll(filters);
  return res.json(bookings);
};

export const getBookingById = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  return res.json(booking);
};

export const createBooking = async (req: Request, res: Response) => {
  const { site, reg, agreementRef, make, model, colour, customerName } =
    req.body;

  if (
    !site ||
    !reg ||
    !agreementRef ||
    !make ||
    !model ||
    !colour ||
    !customerName
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const booking = await bookingsStore.create({
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

export const updateBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const { dispatchDate } = req.body as {
    dispatchDate?: string | null;
  };

  if (dispatchDate === undefined) {
    return res.status(400).json({
      error:
        "PATCH /bookings/:id only supports dispatchDate updates. Use action endpoints for workflow changes.",
    });
  }

  if (dispatchDate !== null) {
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(dispatchDate);

    if (!isValid) {
      return res.status(400).json({
        error: "dispatchDate must be YYYY-MM-DD or null",
      });
    }
  }

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const updated = await bookingsStore.updateById(id, {
    dispatchDate,
  });

  return res.json(updated);
};

export const confirmBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["CUSTOMER", "TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canConfirmBooking(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  const updated = await bookingsStore.updateById(id, {
    status: "BOOKING_CONFIRMED",
  });

  return res.json(updated);
};

export const assignDriver = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const { assignedDriverName } = req.body as {
    assignedDriverName?: string;
  };

  if (!assignedDriverName || !assignedDriverName.trim()) {
    return res.status(400).json({
      error: "assignedDriverName is required",
    });
  }

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  if (
    booking.status !== "BOOKING_CONFIRMED" &&
    booking.status !== "READY_TO_COLLECT" &&
    booking.status !== "SITE_RELEASED"
  ) {
    return res.status(400).json({
      error:
        "Driver can only be assigned when booking is BOOKING_CONFIRMED, READY_TO_COLLECT or SITE_RELEASED",
    });
  }

  const updated = await bookingsStore.updateById(id, {
    assignedDriverName: assignedDriverName.trim(),
  });

  return res.json(updated);
};

export const markReady = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["OPS_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canMarkReady(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(res, id, "READY_TO_COLLECT");
};

export const releaseFromSite = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["SECURITY"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canReleaseFromSite(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(res, id, "SITE_RELEASED");
};

export const dispatchBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canDispatch(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(res, id, "ADMIN_DISPATCHED");
};

export const startTransit = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["DRIVER"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canStartTransit(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(res, id, "IN_TRANSIT");
};

export const confirmDriverDelivered = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["DRIVER"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

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

  const updated = await bookingsStore.updateById(id, {
    driverDelivered: true,
  });

  return res.json(updated);
};

export const confirmEndUserDelivered = async (
  req: Request,
  res: Response
) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["END_USER"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  if (booking.status !== "IN_TRANSIT") {
    return res.status(400).json({
      error: "End user delivery can only be confirmed when booking is IN_TRANSIT",
    });
  }

  if (!booking.driverDelivered) {
    return res.status(400).json({
      error:
        "End user delivery cannot be confirmed before driver delivery is confirmed",
    });
  }

  if (booking.endUserDelivered) {
    return res.status(400).json({
      error: "End user delivery has already been confirmed",
    });
  }

  const updated = await bookingsStore.updateById(id, {
    endUserDelivered: true,
  });

  return res.json(updated);
};

export const completeBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const permissionCheck = canComplete(role!, booking);

  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(res, id, "COMPLETED");
};

export const deleteBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const deleted = await bookingsStore.deleteById(id);

  if (!deleted) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.status(204).send();
};