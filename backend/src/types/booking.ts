import type { UserRole } from "./user";

export type BookingStatus =
  | "BOOKING_PENDING"
  | "BOOKING_COUNTER"
  | "BOOKING_CONFIRMED"
  | "READY_TO_COLLECT"
  | "SECURITY_HOLD"
  | "IN_TRANSIT"
  | "DELIVERED_PENDING_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

export type ReadyToCollectSource =
  | "OPS_MANUAL"
  | "STOCK_IMPORT";

export interface Booking {
  id: number;

  vehicleId: number;
  customerAccountId: number;

  jobNumber: string;
  agreementRef: string;

  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientAddress: string;

  requestedCollectionDate: string;
  confirmedCollectionDate: string | null;
  counterProposedDate: string | null;
  scheduledCollectionDate: string;

  pendingDateChange: string | null;
  dateChangeRequestedAt: string | null;
  dateChangeRequestedByUserId: number | null;

  status: BookingStatus;

  lastCounteredBy: UserRole | null;

  assignedDriverId: number | null;
  createdByUserId: number | null;

  readyToCollectAt: string | null;
  readyToCollectSource: ReadyToCollectSource | null;
  readyToCollectByUserId: number | null;

  securityDriverVerifiedAt: string | null;
  securityVerifiedDriverId: number | null;

  driverCollectedAt: string | null;
  securityReleasedAt: string | null;

  securityHoldReason: string | null;
  securityHoldAt: string | null;
  securityHoldResolvedAt: string | null;

  driverDeliveredAt: string | null;

  deliveryOtpExpiresAt: string | null;
  deliveryOtpAttempts: number;
  deliveryOtpVerifiedAt: string | null;

  cancelledAt: string | null;
  cancelledByUserId: number | null;
  cancellationReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export type BookingFilters = {
  id?: number;
  vehicleId?: number;
  customerAccountId?: number;

  jobNumber?: string;
  agreementRef?: string;

  recipientName?: string;
  recipientEmail?: string;

  status?: BookingStatus;
  assignedDriverId?: number;
};

export type CreateBookingInput = Omit<
  Booking,
  "id" | "createdAt" | "updatedAt"
> & {
  deliveryOtpHash: string | null;
  deliveryConfirmationToken: string | null;
};

export type BookingUpdateInput =
  Partial<CreateBookingInput>;