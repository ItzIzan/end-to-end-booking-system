import type { UserRole } from "./user";

export interface AuditLog {
  id: number;
  bookingId: number;
  action: string;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  changedByUserId: number | null;
  changedByRole: UserRole | null;
  changedByName: string | null;
  createdAt: string;
}

export type CreateAuditLogInput = Omit<AuditLog, "id" | "createdAt">;