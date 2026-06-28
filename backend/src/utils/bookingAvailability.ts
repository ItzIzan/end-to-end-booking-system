import type { BookingSettings } from "../types/bookingSettings";

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addWorkingDays(startDate: Date, workingDays: number): Date {
  let date = startOfDay(startDate);
  let addedDays = 0;

  while (addedDays < workingDays) {
    date = addDays(date, 1);

    if (isWorkingDay(date)) {
      addedDays++;
    }
  }

  return date;
}

export function getEarliestCollectionDate(
  now: Date,
  settings: BookingSettings
): Date {
  let startDate = startOfDay(now);

  if (now.getHours() >= settings.cutoffHour) {
    startDate = addWorkingDays(startDate, 1);
  }

  return addWorkingDays(startDate, settings.processingDays);
}

export function isCollectionDateAllowed(
  requestedDate: Date,
  now: Date,
  settings: BookingSettings
): boolean {
  if (!isWorkingDay(requestedDate)) {
    return false;
  }

  const earliestDate = getEarliestCollectionDate(now, settings);

  return startOfDay(requestedDate) >= startOfDay(earliestDate);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}