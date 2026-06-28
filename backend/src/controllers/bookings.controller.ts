import { Request, Response } from "express";
import { auditLogsStore } from "../store/auditLogs.store";
import { bookingSettingsStore } from "../store/bookingSettings.store";
import { bookingsStore } from "../store/bookings.store";
import { usersStore } from "../store/users.store";
import { vehiclesStore } from "../store/vehicles.store";
import type { Booking, BookingFilters, BookingStatus } from "../types/booking";
import {
  canAcceptBookingDate,
  canComplete,
  canCounterBookingDate,
  canCustomerAcceptCounter,
  canDispatch,
  canMarkReady,
  canRejectAtSecurity,
  canReleaseFromSite,
  canStartTransit,
  getRoleFromHeader,
  requireRole,
} from "../utils/bookingPermissions";
import {
  formatDateOnly,
  getEarliestCollectionDate,
  isCollectionDateAllowed,
  parseDateOnly,
} from "../utils/bookingAvailability";

const ALLOWED_STATUSES: BookingStatus[] = [
  "BOOKING_PENDING",
  "BOOKING_COUNTER",
  "BOOKING_CONFIRMED",
  "READY_TO_COLLECT",
  "SITE_RELEASED",
  "SECURITY_REJECTED",
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

function getActor(req: Request) {
  const userIdHeader = req.header("x-user-id");
  const userId = userIdHeader ? Number(userIdHeader) : null;

  return {
    changedByUserId: userId && !Number.isNaN(userId) ? userId : null,
    changedByRole: getRequestRole(req),
    changedByName: req.header("x-user-name") || null,
  };
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

function toAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

async function createAuditLog(input: {
  bookingId: number;
  action: string;
  fieldName?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  req: Request;
}) {
  await auditLogsStore.create({
    entityType: "BOOKING",
    entityId: input.bookingId,
    action: input.action,
    fieldName: input.fieldName ?? null,
    previousValue: toAuditValue(input.previousValue),
    newValue: toAuditValue(input.newValue),
    ...getActor(input.req),
  });
}

async function validateCollectionDate(
  dateString: string,
  bookingIdToExclude?: number
): Promise<{ valid: true; date: Date } | { valid: false; error: string }> {
  const parsedDate = parseDateOnly(dateString);

  if (!parsedDate) {
    return {
      valid: false,
      error: "Date must be YYYY-MM-DD",
    };
  }

  const settings = await bookingSettingsStore.get();

  if (!isCollectionDateAllowed(parsedDate, new Date(), settings)) {
    return {
      valid: false,
      error: `Date is not available. Earliest allowed working day is ${formatDateOnly(
        getEarliestCollectionDate(new Date(), settings)
      )}`,
    };
  }

  const bookingsForDate =
    bookingIdToExclude !== undefined
      ? await bookingsStore.countByDispatchDateExcludingBooking(
          parsedDate,
          bookingIdToExclude
        )
      : await bookingsStore.countByDispatchDate(parsedDate);

  if (bookingsForDate >= settings.dailySlotLimit) {
    return {
      valid: false,
      error: `No slots available for ${dateString}. Daily limit is ${settings.dailySlotLimit}`,
    };
  }

  return {
    valid: true,
    date: parsedDate,
  };
}

async function updateStatusAndRespond(
  req: Request,
  res: Response,
  booking: Booking,
  nextStatus: BookingStatus,
  action: string
) {
  const updated = await bookingsStore.updateById(booking.id, {
    status: nextStatus,
  });

  await createAuditLog({
    bookingId: booking.id,
    action,
    fieldName: "status",
    previousValue: booking.status,
    newValue: nextStatus,
    req,
  });

  return res.json(updated);
}

export const getBookings = async (req: Request, res: Response) => {
  const {
    id,
    vehicleId,
    jobNumber,
    agreementRef,
    customerName,
    customerEmail,
    status,
    assignedDriverId,
  } = req.query;

  const filters: BookingFilters = {};

  if (id !== undefined) {
    const parsedId = Number(id);
    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: "id must be a number" });
    }
    filters.id = parsedId;
  }

  if (vehicleId !== undefined) {
    const parsedVehicleId = Number(vehicleId);
    if (Number.isNaN(parsedVehicleId)) {
      return res.status(400).json({ error: "vehicleId must be a number" });
    }
    filters.vehicleId = parsedVehicleId;
  }

  if (assignedDriverId !== undefined) {
    const parsedAssignedDriverId = Number(assignedDriverId);
    if (Number.isNaN(parsedAssignedDriverId)) {
      return res
        .status(400)
        .json({ error: "assignedDriverId must be a number" });
    }
    filters.assignedDriverId = parsedAssignedDriverId;
  }

  if (jobNumber !== undefined) filters.jobNumber = String(jobNumber);
  if (agreementRef !== undefined) filters.agreementRef = String(agreementRef);
  if (customerName !== undefined) filters.customerName = String(customerName);
  if (customerEmail !== undefined) filters.customerEmail = String(customerEmail);

  if (status !== undefined) {
    const parsedStatus = String(status).toUpperCase() as BookingStatus;

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

export const getBookingAuditLogs = async (req: Request, res: Response) => {
  const id = parseBookingId(req);

  if (id === null) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const booking = await getBookingOr404(id, res);

  if (!booking) return;

  const auditLogs = await auditLogsStore.getByEntity("BOOKING", id);

  return res.json(auditLogs);
};

export const createBooking = async (req: Request, res: Response) => {
  const role = getRequestRole(req);

  if (!handleRoleCheck(res, role, ["CUSTOMER", "TRANSPORT_ADMIN"])) return;

  const {
    vehicleId,
    jobNumber,
    agreementRef,
    customerName,
    customerContactName,
    customerEmail,
    customerPhone,
    customerAddress,
    requestedCollectionDate,
  } = req.body;

  if (
    !vehicleId ||
    !jobNumber ||
    !agreementRef ||
    !customerName ||
    !customerContactName ||
    !customerEmail ||
    !customerPhone ||
    !customerAddress ||
    !requestedCollectionDate
  ) {
    return res.status(400).json({
      error:
        "vehicleId, jobNumber, agreementRef, customerName, customerContactName, customerEmail, customerPhone, customerAddress and requestedCollectionDate are required",
    });
  }

  const parsedVehicleId = Number(vehicleId);

  if (Number.isNaN(parsedVehicleId)) {
    return res.status(400).json({ error: "vehicleId must be a number" });
  }

  const dateValidation = await validateCollectionDate(requestedCollectionDate);

  if (!dateValidation.valid) {
    return res.status(400).json({ error: dateValidation.error });
  }

  const vehicle = await vehiclesStore.getById(parsedVehicleId);

  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  if (vehicle.vehicleStatus === "HOLD" || vehicle.vehicleStatus === "REMOVED") {
    return res.status(400).json({
      error: `Cannot create booking for vehicle with status ${vehicle.vehicleStatus}`,
    });
  }

  const actorUserIdHeader = req.header("x-user-id");
  const createdByUserId = actorUserIdHeader ? Number(actorUserIdHeader) : null;

  const booking = await bookingsStore.create({
    vehicleId: parsedVehicleId,
    jobNumber,
    agreementRef,
    customerName,
    customerContactName,
    customerEmail,
    customerPhone,
    customerAddress,
    requestedCollectionDate,
    confirmedCollectionDate: null,
    counterProposedDate: null,
    dispatchDate: requestedCollectionDate,
    status: "BOOKING_PENDING",
    lastCounteredBy: null,
    assignedDriverId: null,
    createdByUserId:
      createdByUserId && !Number.isNaN(createdByUserId)
        ? createdByUserId
        : null,
    driverDelivered: false,
    endUserDelivered: false,
    securityRejectedReason: null,
  });

  await createAuditLog({
    bookingId: booking.id,
    action: "BOOKING_REQUEST_CREATED",
    fieldName: "requestedCollectionDate",
    previousValue: null,
    newValue: requestedCollectionDate,
    req,
  });

  if (
    vehicle.vehicleStatus === "AVAILABLE" ||
    vehicle.vehicleStatus === "RESERVED"
  ) {
    const updatedVehicle = await vehiclesStore.updateById(vehicle.id, {
      vehicleStatus: "SOLD",
    });

    await auditLogsStore.create({
      entityType: "VEHICLE",
      entityId: vehicle.id,
      action: "VEHICLE_MARKED_SOLD_FROM_BOOKING_REQUEST",
      fieldName: "vehicleStatus",
      previousValue: vehicle.vehicleStatus,
      newValue: updatedVehicle?.vehicleStatus ?? "SOLD",
      ...getActor(req),
    });
  }

  return res.status(201).json(booking);
};

export const acceptBookingDate = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canAcceptBookingDate(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  if (!booking.dispatchDate) {
    return res.status(400).json({
      error: "Booking has no requested dispatch date to accept",
    });
  }

  const updated = await bookingsStore.updateById(id, {
    status: "BOOKING_CONFIRMED",
    confirmedCollectionDate: booking.dispatchDate,
    counterProposedDate: null,
  });

  await createAuditLog({
    bookingId: id,
    action: "BOOKING_DATE_ACCEPTED",
    fieldName: "status",
    previousValue: booking.status,
    newValue: "BOOKING_CONFIRMED",
    req,
  });

  return res.json(updated);
};

export const counterBookingDate = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const { counterProposedDate } = req.body as {
    counterProposedDate?: string;
  };

  if (!counterProposedDate) {
    return res.status(400).json({
      error: "counterProposedDate is required",
    });
  }

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canCounterBookingDate(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  const dateValidation = await validateCollectionDate(counterProposedDate, id);

  if (!dateValidation.valid) {
    return res.status(400).json({ error: dateValidation.error });
  }

  const updated = await bookingsStore.updateById(id, {
    status: "BOOKING_COUNTER",
    lastCounteredBy: role,
    counterProposedDate,
    dispatchDate: counterProposedDate,
  });

  await createAuditLog({
    bookingId: id,
    action: "BOOKING_DATE_COUNTERED",
    fieldName: "dispatchDate",
    previousValue: booking.dispatchDate,
    newValue: counterProposedDate,
    req,
  });

  return res.json(updated);
};

export const acceptCounterDate = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["CUSTOMER"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canCustomerAcceptCounter(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  const updated = await bookingsStore.updateById(id, {
    status: "BOOKING_CONFIRMED",
    confirmedCollectionDate: booking.counterProposedDate,
  });

  await createAuditLog({
    bookingId: id,
    action: "CUSTOMER_ACCEPTED_COUNTER_DATE",
    fieldName: "status",
    previousValue: booking.status,
    newValue: "BOOKING_CONFIRMED",
    req,
  });

  return res.json(updated);
};

export const assignDriver = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const { assignedDriverId } = req.body as {
    assignedDriverId?: number;
  };

  const parsedDriverId = Number(assignedDriverId);

  if (!assignedDriverId || Number.isNaN(parsedDriverId)) {
    return res.status(400).json({
      error: "assignedDriverId is required and must be a number",
    });
  }

  const driver = await usersStore.getById(parsedDriverId);

  if (!driver || !driver.isActive || driver.role !== "DRIVER") {
    return res.status(400).json({
      error: "assignedDriverId must belong to an active DRIVER user",
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
    assignedDriverId: parsedDriverId,
  });

  await createAuditLog({
    bookingId: id,
    action: "DRIVER_ASSIGNED",
    fieldName: "assignedDriverId",
    previousValue: booking.assignedDriverId,
    newValue: parsedDriverId,
    req,
  });

  return res.json(updated);
};

export const markReady = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["OPS_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canMarkReady(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(
    req,
    res,
    booking,
    "READY_TO_COLLECT",
    "MARKED_READY_TO_COLLECT"
  );
};

export const releaseFromSite = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["SECURITY"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canReleaseFromSite(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(
    req,
    res,
    booking,
    "SITE_RELEASED",
    "SITE_RELEASED"
  );
};

export const rejectAtSecurity = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["SECURITY"])) return;

  const { reason } = req.body as {
    reason?: string;
  };

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      error: "reason is required",
    });
  }

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canRejectAtSecurity(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  const updated = await bookingsStore.updateById(id, {
    status: "SECURITY_REJECTED",
    securityRejectedReason: reason.trim(),
  });

  await createAuditLog({
    bookingId: id,
    action: "SECURITY_REJECTED_RELEASE",
    fieldName: "securityRejectedReason",
    previousValue: booking.securityRejectedReason,
    newValue: reason.trim(),
    req,
  });

  return res.json(updated);
};

export const dispatchBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canDispatch(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(
    req,
    res,
    booking,
    "ADMIN_DISPATCHED",
    "BOOKING_DISPATCHED"
  );
};

export const startTransit = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["DRIVER"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canStartTransit(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(
    req,
    res,
    booking,
    "IN_TRANSIT",
    "TRANSIT_STARTED"
  );
};

export const confirmDriverDelivered = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["DRIVER"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  if (booking.status !== "IN_TRANSIT") {
    return res.status(400).json({
      error: "Driver delivery can only be confirmed when booking is IN_TRANSIT",
    });
  }

  if (!booking.assignedDriverId) {
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

  await createAuditLog({
    bookingId: id,
    action: "DRIVER_DELIVERY_CONFIRMED",
    fieldName: "driverDelivered",
    previousValue: booking.driverDelivered,
    newValue: true,
    req,
  });

  return res.json(updated);
};

export const confirmEndUserDelivered = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

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

  await createAuditLog({
    bookingId: id,
    action: "END_USER_DELIVERY_CONFIRMED",
    fieldName: "endUserDelivered",
    previousValue: booking.endUserDelivered,
    newValue: true,
    req,
  });

  return res.json(updated);
};

export const completeBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const role = getRequestRole(req);
  if (!handleRoleCheck(res, role, ["TRANSPORT_ADMIN"])) return;

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  const permissionCheck = canComplete(role!, booking);
  if (!permissionCheck.allowed) {
    return res.status(403).json({ error: permissionCheck.reason });
  }

  return updateStatusAndRespond(
    req,
    res,
    booking,
    "COMPLETED",
    "BOOKING_COMPLETED"
  );
};

export const deleteBooking = async (req: Request, res: Response) => {
  const id = parseBookingId(req);
  if (id === null) return res.status(400).json({ error: "Invalid booking id" });

  const booking = await getBookingOr404(id, res);
  if (!booking) return;

  await createAuditLog({
    bookingId: id,
    action: "BOOKING_DELETED",
    fieldName: "status",
    previousValue: booking.status,
    newValue: null,
    req,
  });

  const deleted = await bookingsStore.deleteById(id);

  if (!deleted) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.status(204).send();
};