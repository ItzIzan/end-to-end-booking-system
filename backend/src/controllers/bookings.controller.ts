import { Request, Response } from "express";
import bcrypt from "bcryptjs";

const {
  randomBytes,
  randomInt,
} = require("crypto");

import { auditLogsStore } from "../store/auditLogs.store";
import { bookingSettingsStore } from "../store/bookingSettings.store";
import { bookingsStore } from "../store/bookings.store";
import { customerAccountsStore } from "../store/customerAccounts.store";
import { usersStore } from "../store/users.store";
import { vehiclesStore } from "../store/vehicles.store";

import type {
  Booking,
  BookingFilters,
  BookingStatus,
} from "../types/booking";

import type { User } from "../types/user";

import {
  canAcceptBookingDate,
  canCounterBookingDate,
  canCustomerAcceptCounter,
  canMarkReady,
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
  "SECURITY_HOLD",
  "IN_TRANSIT",
  "DELIVERED_PENDING_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
];

function parseBookingId(
  req: Request
): number | null {
  const id = Number(req.params.id);

  return Number.isNaN(id) ? null : id;
}

async function getBookingOr404(
  id: number,
  res: Response
): Promise<Booking | null> {
  const booking =
    await bookingsStore.getById(id);

  if (!booking) {
    res.status(404).json({
      error: "Booking not found",
    });

    return null;
  }

  return booking;
}

async function getRequestUser(
  req: Request,
  res: Response
): Promise<User | null> {
  const header =
    req.header("x-user-id");

  if (!header) {
    res.status(401).json({
      error: "Missing x-user-id header",
    });

    return null;
  }

  const id = Number(header);

  if (Number.isNaN(id)) {
    res.status(400).json({
      error: "x-user-id must be a number",
    });

    return null;
  }

  const user =
    await usersStore.getById(id);

  if (!user || !user.isActive) {
    res.status(401).json({
      error:
        "User does not exist or is inactive",
    });

    return null;
  }

  return user;
}

function handleRoleCheck(
  res: Response,
  user: User,
  allowedRoles: Parameters<
    typeof requireRole
  >[1]
): boolean {
  const check = requireRole(
    user.role,
    allowedRoles
  );

  if (!check.allowed) {
    res.status(403).json({
      error: check.reason,
    });

    return false;
  }

  return true;
}

function toAuditValue(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

async function createAuditLog(input: {
  bookingId: number;
  action: string;
  fieldName?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  actor: User;
}) {
  await auditLogsStore.create({
    entityType: "BOOKING",
    entityId: input.bookingId,
    action: input.action,

    fieldName:
      input.fieldName ?? null,

    previousValue: toAuditValue(
      input.previousValue
    ),

    newValue: toAuditValue(
      input.newValue
    ),

    changedByUserId:
      input.actor.id,

    changedByRole:
      input.actor.role,

    changedByName:
      input.actor.name,
  });
}

async function validateCollectionDate(
  dateString: string,
  bookingIdToExclude?: number
): Promise<
  | {
      valid: true;
      date: Date;
    }
  | {
      valid: false;
      error: string;
    }
> {
  const parsedDate =
    parseDateOnly(dateString);

  if (!parsedDate) {
    return {
      valid: false,
      error: "Date must be YYYY-MM-DD",
    };
  }

  const settings =
    await bookingSettingsStore.get();

  if (
    !isCollectionDateAllowed(
      parsedDate,
      new Date(),
      settings
    )
  ) {
    return {
      valid: false,
      error:
        `Date is not available. Earliest allowed working day is ` +
        `${formatDateOnly(
          getEarliestCollectionDate(
            new Date(),
            settings
          )
        )}`,
    };
  }

  const count =
    bookingIdToExclude !== undefined
      ? await bookingsStore
          .countByScheduledCollectionDateExcludingBooking(
            parsedDate,
            bookingIdToExclude
          )
      : await bookingsStore
          .countByScheduledCollectionDate(
            parsedDate
          );

  if (
    count >= settings.dailySlotLimit
  ) {
    return {
      valid: false,
      error:
        `No slots are available for ${dateString}. ` +
        `Daily limit is ${settings.dailySlotLimit}`,
    };
  }

  return {
    valid: true,
    date: parsedDate,
  };
}

function customerOwnsBooking(
  user: User,
  booking: Booking
) {
  return (
    user.role !== "CUSTOMER" ||
    user.customerAccountId ===
      booking.customerAccountId
  );
}

export const getBookings =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      id,
      vehicleId,
      customerAccountId,
      jobNumber,
      agreementRef,
      recipientName,
      recipientEmail,
      status,
      assignedDriverId,
    } = req.query;

    const filters: BookingFilters = {};

    if (id !== undefined) {
      const parsed = Number(id);

      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          error:
            "id must be a number",
        });
      }

      filters.id = parsed;
    }

    if (vehicleId !== undefined) {
      const parsed =
        Number(vehicleId);

      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          error:
            "vehicleId must be a number",
        });
      }

      filters.vehicleId = parsed;
    }

    if (
      customerAccountId !== undefined
    ) {
      const parsed =
        Number(customerAccountId);

      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          error:
            "customerAccountId must be a number",
        });
      }

      filters.customerAccountId =
        parsed;
    }

    if (
      assignedDriverId !== undefined
    ) {
      const parsed =
        Number(assignedDriverId);

      if (Number.isNaN(parsed)) {
        return res.status(400).json({
          error:
            "assignedDriverId must be a number",
        });
      }

      filters.assignedDriverId =
        parsed;
    }

    if (jobNumber !== undefined) {
      filters.jobNumber =
        String(jobNumber);
    }

    if (
      agreementRef !== undefined
    ) {
      filters.agreementRef =
        String(agreementRef);
    }

    if (
      recipientName !== undefined
    ) {
      filters.recipientName =
        String(recipientName);
    }

    if (
      recipientEmail !== undefined
    ) {
      filters.recipientEmail =
        String(recipientEmail);
    }

    if (status !== undefined) {
      const parsed =
        String(status)
          .toUpperCase() as BookingStatus;

      if (
        !ALLOWED_STATUSES.includes(
          parsed
        )
      ) {
        return res.status(400).json({
          error: "Invalid status",
        });
      }

      filters.status = parsed;
    }

    const bookings =
      await bookingsStore.getAll(
        filters
      );

    return res.json(bookings);
  };

export const getBookingById =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    return res.json(booking);
  };

export const getBookingAuditLogs =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    const logs =
      await auditLogsStore.getByEntity(
        "BOOKING",
        id
      );

    return res.json(logs);
  };

export const createBooking =
  async (
    req: Request,
    res: Response
  ) => {
    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        [
          "CUSTOMER",
          "TRANSPORT_ADMIN",
        ]
      )
    ) {
      return;
    }

    const {
      vehicleId,
      customerAccountId,

      jobNumber,
      agreementRef,

      recipientName,
      recipientEmail,
      recipientPhone,
      recipientAddress,

      requestedCollectionDate,
    } = req.body;

    if (
      !vehicleId ||
      !jobNumber ||
      !agreementRef ||
      !recipientName ||
      !recipientEmail ||
      !recipientPhone ||
      !recipientAddress ||
      !requestedCollectionDate
    ) {
      return res.status(400).json({
        error:
          "vehicleId, jobNumber, agreementRef, recipientName, recipientEmail, recipientPhone, recipientAddress and requestedCollectionDate are required",
      });
    }

    const parsedVehicleId =
      Number(vehicleId);

    if (
      Number.isNaN(
        parsedVehicleId
      )
    ) {
      return res.status(400).json({
        error:
          "vehicleId must be a number",
      });
    }

    let accountId: number;

    if (
      actor.role === "CUSTOMER"
    ) {
      if (
        !actor.customerAccountId
      ) {
        return res
          .status(400)
          .json({
            error:
              "Customer user is not linked to a customer account",
          });
      }

      accountId =
        actor.customerAccountId;
    } else {
      const parsed =
        Number(customerAccountId);

      if (
        !customerAccountId ||
        Number.isNaN(parsed)
      ) {
        return res
          .status(400)
          .json({
            error:
              "customerAccountId is required when an admin creates a booking",
          });
      }

      accountId = parsed;
    }

    const account =
      await customerAccountsStore.getById(
        accountId
      );

    if (
      !account ||
      !account.isActive
    ) {
      return res
        .status(400)
        .json({
          error:
            "Customer account does not exist or is inactive",
        });
    }

    const vehicle =
      await vehiclesStore.getById(
        parsedVehicleId
      );

    if (!vehicle) {
      return res
        .status(404)
        .json({
          error:
            "Vehicle not found",
        });
    }

    if (
      vehicle.customerAccountId !==
      accountId
    ) {
      return res
        .status(403)
        .json({
          error:
            "Vehicle does not belong to this customer account",
        });
    }

    if (
      vehicle.vehicleStatus !==
      "SOLD"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Only SOLD vehicles can have a delivery move created",
        });
    }

    const existing =
      await bookingsStore
        .hasActiveBookingForVehicle(
          vehicle.id
        );

    if (existing) {
      return res
        .status(409)
        .json({
          error:
            "Vehicle already has an active move",
        });
    }

    const dateValidation =
      await validateCollectionDate(
        requestedCollectionDate
      );

    if (
      !dateValidation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            dateValidation.error,
        });
    }

    const booking =
      await bookingsStore.create({
        vehicleId:
          parsedVehicleId,

        customerAccountId:
          accountId,

        jobNumber,
        agreementRef,

        recipientName,
        recipientEmail,
        recipientPhone,
        recipientAddress,

        requestedCollectionDate,

        confirmedCollectionDate:
          null,

        counterProposedDate:
          null,

        scheduledCollectionDate:
          requestedCollectionDate,

        pendingDateChange: null,
        dateChangeRequestedAt:
          null,
        dateChangeRequestedByUserId:
          null,

        status:
          "BOOKING_PENDING",

        lastCounteredBy: null,

        assignedDriverId: null,

        createdByUserId:
          actor.id,

        readyToCollectAt: null,
        readyToCollectSource:
          null,
        readyToCollectByUserId:
          null,

        securityDriverVerifiedAt:
          null,

        securityVerifiedDriverId:
          null,

        driverCollectedAt: null,
        securityReleasedAt: null,

        securityHoldReason: null,
        securityHoldAt: null,
        securityHoldResolvedAt:
          null,

        driverDeliveredAt: null,

        deliveryConfirmationToken:
          null,

        deliveryOtpHash: null,
        deliveryOtpExpiresAt:
          null,

        deliveryOtpAttempts: 0,

        deliveryOtpVerifiedAt:
          null,

        cancelledAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
      });

    await createAuditLog({
      bookingId: booking.id,
      action:
        "BOOKING_REQUEST_CREATED",
      fieldName:
        "requestedCollectionDate",
      previousValue: null,
      newValue:
        requestedCollectionDate,
      actor,
    });

    return res
      .status(201)
      .json(booking);
  };

export const acceptBookingDate =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["TRANSPORT_ADMIN"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    const check =
      canAcceptBookingDate(
        actor.role,
        booking
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "BOOKING_CONFIRMED",

          confirmedCollectionDate:
            booking.scheduledCollectionDate,

          counterProposedDate:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,
      action:
        "BOOKING_DATE_ACCEPTED",
      fieldName: "status",
      previousValue:
        booking.status,
      newValue:
        "BOOKING_CONFIRMED",
      actor,
    });

    return res.json(updated);
  };

export const counterBookingDate =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["TRANSPORT_ADMIN"]
      )
    ) {
      return;
    }

    const {
      counterProposedDate,
    } = req.body;

    if (!counterProposedDate) {
      return res
        .status(400)
        .json({
          error:
            "counterProposedDate is required",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    const check =
      canCounterBookingDate(
        actor.role,
        booking
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const validation =
      await validateCollectionDate(
        counterProposedDate,
        id
      );

    if (!validation.valid) {
      return res
        .status(400)
        .json({
          error:
            validation.error,
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "BOOKING_COUNTER",

          lastCounteredBy:
            actor.role,

          counterProposedDate,

          scheduledCollectionDate:
            counterProposedDate,
        }
      );

    await createAuditLog({
      bookingId: id,
      action:
        "BOOKING_DATE_COUNTERED",

      fieldName:
        "scheduledCollectionDate",

      previousValue:
        booking.scheduledCollectionDate,

      newValue:
        counterProposedDate,

      actor,
    });

    return res.json(updated);
  };

export const acceptCounterDate =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["CUSTOMER"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      !customerOwnsBooking(
        actor,
        booking
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "Booking belongs to another customer account",
        });
    }

    const check =
      canCustomerAcceptCounter(
        actor.role,
        booking
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "BOOKING_CONFIRMED",

          confirmedCollectionDate:
            booking.counterProposedDate,
        }
      );

    await createAuditLog({
      bookingId: id,
      action:
        "CUSTOMER_ACCEPTED_COUNTER_DATE",

      fieldName: "status",

      previousValue:
        booking.status,

      newValue:
        "BOOKING_CONFIRMED",

      actor,
    });

    return res.json(updated);
  };

export const requestDateChange =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        [
          "CUSTOMER",
          "OPS_ADMIN",
        ]
      )
    ) {
      return;
    }

    const { requestedDate } =
      req.body;

    if (!requestedDate) {
      return res
        .status(400)
        .json({
          error:
            "requestedDate is required",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      !customerOwnsBooking(
        actor,
        booking
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "Booking belongs to another customer account",
        });
    }

    if (
      booking.status !==
        "BOOKING_CONFIRMED" &&
      booking.status !==
        "READY_TO_COLLECT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Date changes can only be requested after confirmation and before collection",
        });
    }

    if (
      booking.driverCollectedAt ||
      booking.securityReleasedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Date cannot be changed once collection has begun",
        });
    }

    const validation =
      await validateCollectionDate(
        requestedDate,
        id
      );

    if (!validation.valid) {
      return res
        .status(400)
        .json({
          error:
            validation.error,
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          pendingDateChange:
            requestedDate,

          dateChangeRequestedAt:
            new Date() as any,

          dateChangeRequestedByUserId:
            actor.id,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "DATE_CHANGE_REQUESTED",

      fieldName:
        "pendingDateChange",

      previousValue:
        booking.pendingDateChange,

      newValue:
        requestedDate,

      actor,
    });

    return res.json(updated);
  };

export const confirmDateChange =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["TRANSPORT_ADMIN"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      !booking.pendingDateChange
    ) {
      return res
        .status(400)
        .json({
          error:
            "No date change is waiting for confirmation",
        });
    }

    if (
      booking.driverCollectedAt ||
      booking.securityReleasedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Date cannot be changed once collection has begun",
        });
    }

    const newDate =
      formatDateOnly(
        new Date(
          booking.pendingDateChange
        )
      );

    const validation =
      await validateCollectionDate(
        newDate,
        id
      );

    if (!validation.valid) {
      return res
        .status(400)
        .json({
          error:
            validation.error,
        });
    }

    const previousDate =
      booking.confirmedCollectionDate;

    const updated =
      await bookingsStore.updateById(
        id,
        {
          confirmedCollectionDate:
            newDate,

          scheduledCollectionDate:
            newDate,

          pendingDateChange: null,
          dateChangeRequestedAt:
            null,

          dateChangeRequestedByUserId:
            null,

          securityDriverVerifiedAt:
            null,

          securityVerifiedDriverId:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "DATE_CHANGE_CONFIRMED",

      fieldName:
        "confirmedCollectionDate",

      previousValue:
        previousDate,

      newValue: newDate,

      actor,
    });

    return res.json(updated);
  };

export const assignDriver =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["TRANSPORT_ADMIN"]
      )
    ) {
      return;
    }

    const {
      assignedDriverId,
    } = req.body;

    const driverId =
      Number(assignedDriverId);

    if (
      !assignedDriverId ||
      Number.isNaN(driverId)
    ) {
      return res
        .status(400)
        .json({
          error:
            "assignedDriverId must be a number",
        });
    }

    const driver =
      await usersStore.getById(
        driverId
      );

    if (
      !driver ||
      !driver.isActive ||
      driver.role !== "DRIVER"
    ) {
      return res
        .status(400)
        .json({
          error:
            "assignedDriverId must belong to an active DRIVER user",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      ![
        "BOOKING_CONFIRMED",
        "READY_TO_COLLECT",
        "SECURITY_HOLD",
      ].includes(
        booking.status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Driver can only be assigned before the vehicle leaves site",
        });
    }

    if (
      booking.driverCollectedAt ||
      booking.securityReleasedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Driver cannot be reassigned once collection has started",
        });
    }

    const oldDriver =
      booking.assignedDriverId;

    const updated =
      await bookingsStore.updateById(
        id,
        {
          assignedDriverId:
            driverId,

          // A previously verified driver is no longer valid.
          securityDriverVerifiedAt:
            null,

          securityVerifiedDriverId:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        oldDriver
          ? "DRIVER_REASSIGNED"
          : "DRIVER_ASSIGNED",

      fieldName:
        "assignedDriverId",

      previousValue:
        oldDriver,

      newValue:
        driverId,

      actor,
    });

    return res.json(updated);
  };

export const markReady =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["OPS_ADMIN"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    const check =
      canMarkReady(
        actor.role,
        booking
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const now = new Date();

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "READY_TO_COLLECT",

          readyToCollectAt:
            now as any,

          readyToCollectSource:
            "OPS_MANUAL",

          readyToCollectByUserId:
            actor.id,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "MARKED_READY_TO_COLLECT",

      fieldName: "status",

      previousValue:
        booking.status,

      newValue:
        "READY_TO_COLLECT",

      actor,
    });

    return res.json(updated);
  };

export const verifyDriverAtSecurity =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["SECURITY"]
      )
    ) {
      return;
    }

    const {
      driverId,
    } = req.body;

    const parsedDriverId =
      Number(driverId);

    if (
      !driverId ||
      Number.isNaN(
        parsedDriverId
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "driverId is required",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "READY_TO_COLLECT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Security can only verify a driver when the vehicle is READY_TO_COLLECT",
        });
    }

    if (
      !booking.assignedDriverId
    ) {
      return res
        .status(400)
        .json({
          error:
            "No driver has been assigned",
        });
    }

    if (
      parsedDriverId !==
      booking.assignedDriverId
    ) {
      return res
        .status(409)
        .json({
          error:
            "Driver does not match the assigned driver",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          securityDriverVerifiedAt:
            new Date() as any,

          securityVerifiedDriverId:
            parsedDriverId,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "SECURITY_DRIVER_VERIFIED",

      fieldName:
        "securityVerifiedDriverId",

      previousValue:
        booking.securityVerifiedDriverId,

      newValue:
        parsedDriverId,

      actor,
    });

    return res.json(updated);
  };

export const confirmDriverCollection =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["DRIVER"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "READY_TO_COLLECT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Vehicle must be READY_TO_COLLECT",
        });
    }

    if (
      booking.assignedDriverId !==
      actor.id
    ) {
      return res
        .status(403)
        .json({
          error:
            "Only the assigned driver can confirm collection",
        });
    }

    if (
      booking.securityVerifiedDriverId !==
        actor.id ||
      !booking.securityDriverVerifiedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Security must verify the assigned driver first",
        });
    }

    if (
      booking.driverCollectedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Collection has already been confirmed",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          driverCollectedAt:
            new Date() as any,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "DRIVER_COLLECTION_CONFIRMED",

      fieldName:
        "driverCollectedAt",

      previousValue: null,

      newValue:
        new Date(),

      actor,
    });

    return res.json(updated);
  };

export const placeSecurityHold =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["SECURITY"]
      )
    ) {
      return;
    }

    const { reason } = req.body;

    if (
      !reason ||
      !String(reason).trim()
    ) {
      return res
        .status(400)
        .json({
          error:
            "reason is required",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "READY_TO_COLLECT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Security hold can only be placed before release",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "SECURITY_HOLD",

          securityHoldReason:
            String(reason).trim(),

          securityHoldAt:
            new Date() as any,

          securityHoldResolvedAt:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "SECURITY_HOLD_PLACED",

      fieldName:
        "securityHoldReason",

      previousValue: null,

      newValue:
        String(reason).trim(),

      actor,
    });

    return res.json(updated);
  };

export const resolveSecurityHold =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        [
          "OPS_ADMIN",
          "TRANSPORT_ADMIN",
        ]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "SECURITY_HOLD"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Booking is not on security hold",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "READY_TO_COLLECT",

          securityHoldResolvedAt:
            new Date() as any,

          // Security must verify again.
          securityDriverVerifiedAt:
            null,

          securityVerifiedDriverId:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "SECURITY_HOLD_RESOLVED",

      fieldName: "status",

      previousValue:
        "SECURITY_HOLD",

      newValue:
        "READY_TO_COLLECT",

      actor,
    });

    return res.json(updated);
  };

export const releaseFromSite =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["SECURITY"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "READY_TO_COLLECT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Vehicle must be READY_TO_COLLECT",
        });
    }

    if (
      !booking.assignedDriverId
    ) {
      return res
        .status(400)
        .json({
          error:
            "A driver must be assigned first",
        });
    }

    if (
      booking.securityVerifiedDriverId !==
        booking.assignedDriverId ||
      !booking.securityDriverVerifiedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Assigned driver has not been verified by security",
        });
    }

    if (
      !booking.driverCollectedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Driver must confirm collection first",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "IN_TRANSIT",

          securityReleasedAt:
            new Date() as any,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "SECURITY_RELEASED_VEHICLE",

      fieldName: "status",

      previousValue:
        booking.status,

      newValue:
        "IN_TRANSIT",

      actor,
    });

    return res.json(updated);
  };

export const confirmDriverDelivered =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        ["DRIVER"]
      )
    ) {
      return;
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      booking.status !==
      "IN_TRANSIT"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Vehicle must be IN_TRANSIT before delivery can be confirmed",
        });
    }

    if (
      booking.assignedDriverId !==
      actor.id
    ) {
      return res
        .status(403)
        .json({
          error:
            "Only the assigned driver can confirm delivery",
        });
    }

    const otp = String(
      randomInt(
        100000,
        1000000
      )
    );

    const token =
      randomBytes(32)
        .toString("hex");

    const otpHash =
      await bcrypt.hash(
        otp,
        10
      );

    const expiresAt =
      new Date(
        Date.now() +
          15 * 60 * 1000
      );

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "DELIVERED_PENDING_CONFIRMATION",

          driverDeliveredAt:
            new Date() as any,

          deliveryConfirmationToken:
            token,

          deliveryOtpHash:
            otpHash,

          deliveryOtpExpiresAt:
            expiresAt as any,

          deliveryOtpAttempts: 0,

          deliveryOtpVerifiedAt:
            null,
        }
      );

    await createAuditLog({
      bookingId: id,

      action:
        "DRIVER_DELIVERY_CONFIRMED",

      fieldName: "status",

      previousValue:
        booking.status,

      newValue:
        "DELIVERED_PENDING_CONFIRMATION",

      actor,
    });

    /*
      Later:
      send OTP + confirmation URL to:
      booking.recipientEmail
      booking.recipientPhone
    */

    const isProduction =
      (globalThis as any)
        .process?.env?.NODE_ENV ===
      "production";

    if (isProduction) {
      return res.json({
        booking: updated,
        message:
          "Delivery confirmation created. OTP provider still needs to be configured.",
      });
    }

    // Development only, so you can test before email/SMS is wired in.
    return res.json({
      booking: updated,

      developmentConfirmation: {
        token,
        otp,
        expiresAt,
      },
    });
  };

export const verifyDeliveryOtp =
  async (
    req: Request,
    res: Response
  ) => {
    const token = String(
      req.params.token
  );

    const { otp } =
      req.body;

    if (!token || !otp) {
      return res
        .status(400)
        .json({
          error:
            "token and otp are required",
        });
    }

    const booking =
      await bookingsStore
        .getByDeliveryToken(
          token
        );

    if (!booking) {
      return res
        .status(404)
        .json({
          error:
            "Delivery confirmation not found",
        });
    }

    if (
      booking.status !==
      "DELIVERED_PENDING_CONFIRMATION"
    ) {
      return res
        .status(400)
        .json({
          error:
            "Delivery is not awaiting recipient confirmation",
        });
    }

    if (
      !booking.deliveryOtpHash ||
      !booking.deliveryOtpExpiresAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "No active OTP exists",
        });
    }

    if (
      booking.deliveryOtpAttempts >=
      5
    ) {
      return res
        .status(429)
        .json({
          error:
            "Maximum OTP attempts reached",
        });
    }

    if (
      new Date(
        booking.deliveryOtpExpiresAt
      ) < new Date()
    ) {
      return res
        .status(410)
        .json({
          error:
            "OTP has expired",
        });
    }

    const matches =
      await bcrypt.compare(
        String(otp),
        booking.deliveryOtpHash
      );

    if (!matches) {
      await bookingsStore.updateById(
        booking.id,
        {
          deliveryOtpAttempts:
            booking.deliveryOtpAttempts +
            1,
        }
      );

      return res
        .status(400)
        .json({
          error:
            "Incorrect OTP",
        });
    }

    const verifiedAt =
      new Date();

    const updated =
      await bookingsStore.updateById(
        booking.id,
        {
          status: "COMPLETED",

          deliveryOtpVerifiedAt:
            verifiedAt as any,

          deliveryOtpHash: null,

          deliveryConfirmationToken:
            null,
        }
      );

    await auditLogsStore.create({
      entityType: "BOOKING",

      entityId:
        booking.id,

      action:
        "RECIPIENT_DELIVERY_CONFIRMED",

      fieldName:
        "status",

      previousValue:
        "DELIVERED_PENDING_CONFIRMATION",

      newValue:
        "COMPLETED",

      changedByUserId: null,
      changedByRole: null,

      changedByName:
        "Recipient OTP",
    });

    return res.json({
      bookingId:
        booking.id,

      status:
        updated?.status,

      confirmedAt:
        verifiedAt,
    });
  };

export const cancelBooking =
  async (
    req: Request,
    res: Response
  ) => {
    const id = parseBookingId(req);

    if (id === null) {
      return res.status(400).json({
        error:
          "Invalid booking id",
      });
    }

    const actor =
      await getRequestUser(
        req,
        res
      );

    if (!actor) return;

    if (
      !handleRoleCheck(
        res,
        actor,
        [
          "CUSTOMER",
          "TRANSPORT_ADMIN",
        ]
      )
    ) {
      return;
    }

    const {
      reason,
    } = req.body;

    if (
      !reason ||
      !String(reason).trim()
    ) {
      return res
        .status(400)
        .json({
          error:
            "Cancellation reason is required",
        });
    }

    const booking =
      await getBookingOr404(
        id,
        res
      );

    if (!booking) return;

    if (
      !customerOwnsBooking(
        actor,
        booking
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "Booking belongs to another customer account",
        });
    }

    if (
      ![
        "BOOKING_PENDING",
        "BOOKING_COUNTER",
        "BOOKING_CONFIRMED",
        "READY_TO_COLLECT",
        "SECURITY_HOLD",
      ].includes(
        booking.status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Booking can no longer be cancelled",
        });
    }

    if (
      booking.driverCollectedAt
    ) {
      return res
        .status(400)
        .json({
          error:
            "Booking cannot be cancelled after the driver has collected the vehicle",
        });
    }

    const updated =
      await bookingsStore.updateById(
        id,
        {
          status:
            "CANCELLED",

          cancelledAt:
            new Date() as any,

          cancelledByUserId:
            actor.id,

          cancellationReason:
            String(reason).trim(),
        }
      );

    /*
      No vehicle status change.

      Booking creation no longer changes stock state,
      so cancellation naturally leaves the vehicle
      in the same imported stock state it had before.
    */

    await createAuditLog({
      bookingId: id,

      action:
        "BOOKING_CANCELLED",

      fieldName:
        "status",

      previousValue:
        booking.status,

      newValue:
        "CANCELLED",

      actor,
    });

    return res.json(updated);
  };