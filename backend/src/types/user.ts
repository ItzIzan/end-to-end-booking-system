export type UserRole =
  | "SYSTEM_ADMIN"
  | "CUSTOMER"
  | "TRANSPORT_ADMIN"
  | "OPS_ADMIN"
  | "SECURITY"
  | "DRIVER";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  customerAccountId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface RegisterUserInput {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  customerAccountId?: number | null;
