export type UserRole =
  | "CUSTOMER"
  | "TRANSPORT_ADMIN"
  | "OPS_ADMIN"
  | "SECURITY"
  | "DRIVER"
  | "END_USER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}