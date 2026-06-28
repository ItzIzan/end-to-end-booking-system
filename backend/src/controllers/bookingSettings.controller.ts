import { Request, Response } from "express";
import { auditLogsStore } from "../store/auditLogs.store";
import { bookingSettingsStore } from "../store/bookingSettings.store";
import { bookingsStore } from "../store/bookings.store";
import { getRoleFromHeader, requireRole } from "../utils/bookingPermissions";
import {
  formatDateOnly,
  getEarliestCollectionDate,
  isCollectionDateAllowed,
  isWorkingDay,
  parseDateOnly,
} from "../utils/bookingAvailability";

function getActor(req: Request) {
  const userIdHeader = req.header("x-user-id");
  const userId = userIdHeader ? Number(userIdHeader) : null;

  return {
    changedByUserId: userId && !Number.isNaN(userId) ? userId : null,
    changedByRole: getRoleFromHeader(req.header("x-user-role")),
    changedByName: req.header("x-user-name") || null,
  };
}

export const getBookingSettings = async (_req: Request, res: Response) => {
  const settings = await bookingSettingsStore.get();
  return res.json(settings);
};

export const updateBookingSettings = async (req: Request, res: Response) => {
  const role = getRoleFromHeader(req.header("x-user-role"));
  const roleCheck = requireRole(role, ["OPS_ADMIN"]);

  if (!roleCheck.allowed) {
    return res.status(role ? 403 : 400).json({
      error: roleCheck.reason,
    });
  }

  const { processingDays, dailySlotLimit, cutoffHour } = req.body as {
    processingDays?: number;
    dailySlotLimit?: number;
    cutoffHour?: number;
  };

  if (
    processingDays === undefined &&
    dailySlotLimit === undefined &&
    cutoffHour === undefined
  ) {
    return res.status(400).json({
      error: "At least one setting must be provided",
    });
  }

  if (
    processingDays !== undefined &&
    (!Number.isInteger(processingDays) || processingDays < 0)
  ) {
    return res.status(400).json({
      error: "processingDays must be 0 or more",
    });
  }

  if (
    dailySlotLimit !== undefined &&
    (!Number.isInteger(dailySlotLimit) || dailySlotLimit < 1)
  ) {
    return res.status(400).json({
      error: "dailySlotLimit must be at least 1",
    });
  }

  if (
    cutoffHour !== undefined &&
    (!Number.isInteger(cutoffHour) || cutoffHour < 0 || cutoffHour > 23)
  ) {
    return res.status(400).json({
      error: "cutoffHour must be between 0 and 23",
    });
  }

  const existing = await bookingSettingsStore.get();
  const actor = getActor(req);

  const updated = await bookingSettingsStore.update({
    processingDays,
    dailySlotLimit,
    cutoffHour,
    updatedByUserId: actor.changedByUserId,
  });

  await auditLogsStore.create({
    entityType: "BOOKING_SETTINGS",
    entityId: 1,
    action: "BOOKING_SETTINGS_UPDATED",
    fieldName: null,
    previousValue: JSON.stringify(existing),
    newValue: JSON.stringify(updated),
    ...actor,
  });

  return res.json(updated);
};

export const getBookingAvailability = async (req: Request, res: Response) => {
  const dateQuery = req.query.date;

  if (!dateQuery) {
    return res.status(400).json({
      error: "date query is required in YYYY-MM-DD format",
    });
  }

  const requestedDate = parseDateOnly(String(dateQuery));

  if (!requestedDate) {
    return res.status(400).json({
      error: "date must be YYYY-MM-DD",
    });
  }

  const settings = await bookingSettingsStore.get();
  const earliestDate = getEarliestCollectionDate(new Date(), settings);

  const bookingsForDate = await bookingsStore.countByDispatchDate(
    requestedDate
  );

  const remainingSlots = Math.max(
    settings.dailySlotLimit - bookingsForDate,
    0
  );

  const isDateAllowed = isCollectionDateAllowed(
    requestedDate,
    new Date(),
    settings
  );

  return res.json({
    date: formatDateOnly(requestedDate),
    earliestCollectionDate: formatDateOnly(earliestDate),
    dailySlotLimit: settings.dailySlotLimit,
    bookedSlots: bookingsForDate,
    remainingSlots,
    isWorkingDay: isWorkingDay(requestedDate),
    isDateAllowed,
    isSlotAvailable: remainingSlots > 0,
    isAvailable: isDateAllowed && remainingSlots > 0,
  });
};