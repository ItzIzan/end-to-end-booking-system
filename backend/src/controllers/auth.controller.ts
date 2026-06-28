import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { auditLogsStore } from "../store/auditLogs.store";
import { usersStore } from "../store/users.store";
import type { UserRole } from "../types/user";
import { isUserRole } from "../utils/bookingPermissions";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

function publicUser(user: {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const register = async (req: Request, res: Response) => {
  const { name, username, email, password, role } = req.body as {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  };

  if (!name || !username || !email || !password || !role) {
    return res.status(400).json({
      error: "name, username, email, password and role are required",
    });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({
      error:
        "username must be 3-30 characters and only contain letters, numbers and underscores",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: "email must be valid",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "password must be at least 8 characters",
    });
  }

  if (!isUserRole(role)) {
    return res.status(400).json({
      error:
        "Invalid role. Allowed roles: SYSTEM_ADMIN, CUSTOMER, TRANSPORT_ADMIN, OPS_ADMIN, SECURITY, DRIVER, END_USER",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await usersStore.create({
      name,
      username,
      email,
      passwordHash,
      role,
    });

    await auditLogsStore.create({
      entityType: "USER",
      entityId: user.id,
      action: "USER_REGISTERED",
      fieldName: "role",
      previousValue: null,
      newValue: user.role,
      changedByUserId: user.id,
      changedByRole: user.role,
      changedByName: user.name,
    });

    return res.status(201).json({
      user,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: "email or username already exists",
      });
    }

    return res.status(500).json({
      error: "Failed to register user",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body as {
    emailOrUsername?: string;
    password?: string;
  };

  if (!emailOrUsername || !password) {
    return res.status(400).json({
      error: "emailOrUsername and password are required",
    });
  }

  const user = await usersStore.findByEmailOrUsername(emailOrUsername);

  if (!user || !user.isActive) {
    return res.status(401).json({
      error: "Invalid login details",
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Invalid login details",
    });
  }

  return res.json({
    user: publicUser(user),
  });
};

export const getMe = async (req: Request, res: Response) => {
  const userIdHeader = req.header("x-user-id");

  if (!userIdHeader) {
    return res.status(401).json({
      error: "Missing x-user-id header",
    });
  }

  const userId = Number(userIdHeader);

  if (Number.isNaN(userId)) {
    return res.status(400).json({
      error: "x-user-id must be a number",
    });
  }

  const user = await usersStore.getById(userId);

  if (!user || !user.isActive) {
    return res.status(401).json({
      error: "User not found or inactive",
    });
  }

  return res.json({
    user,
  });
};