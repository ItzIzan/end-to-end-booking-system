const { prisma } = require("../lib/prisma");
import type {
  BookingSettings,
  UpdateBookingSettingsInput,
} from "../types/bookingSettings";

export const bookingSettingsStore = {
  async get(): Promise<BookingSettings> {
    return prisma.bookingSettings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        processingDays: 3,
        dailySlotLimit: 60,
        cutoffHour: 12,
      },
    });
  },

  async update(updates: UpdateBookingSettingsInput): Promise<BookingSettings> {
    await this.get();

    return prisma.bookingSettings.update({
      where: { id: 1 },
      data: updates,
    });
  },
};