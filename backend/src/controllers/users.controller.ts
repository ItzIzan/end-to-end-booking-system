import { Request, Response } from "express";
import { usersStore } from "../store/users.store";
import type { UserRole } from "../types/user";
import { isUserRole } from "../utils/bookingPermissions";

export const getUsers = async (_req: Request, res: Response) => {
  const users = await usersStore.getAll();
  return res.json(users);
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const userIdHeader = req.header("x-user-id");

  if (!userIdHeader) {
    return res.status(400).json({
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

  return res.json(user);
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, role } = req.body as {
    name?: string;
    email?: string;
    role?: UserRole;
  };

  if (!name || !email || !role) {
    return res.status(400).json({
      error: "name, email and role are required",
    });
  }

  if (!isUserRole(role)) {
    return res.status(400).json({
      error:
        "Invalid role. Allowed roles: CUSTOMER, TRANSPORT_ADMIN, OPS_ADMIN, SECURITY, DRIVER, END_USER",
    });
  }

  const user = await usersStore.create({
    name,
    email,
    role,
  });

  return res.status(201).json(user);
};