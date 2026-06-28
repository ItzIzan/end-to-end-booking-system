export interface BookingSettings {
  id: number;
  processingDays: number;
  dailySlotLimit: number;
  cutoffHour: number;
  updatedByUserId: number | null;
  updatedAt: string;
}

export interface UpdateBookingSettingsInput {
  processingDays?: number;
  dailySlotLimit?: number;
  cutoffHour?: number;
  updatedByUserId?: number | null;
}