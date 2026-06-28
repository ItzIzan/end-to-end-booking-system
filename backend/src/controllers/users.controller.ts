import { Request, Response } from "express";
import { usersStore } from "../store/users.store";

export const getUsers = async (_req: Request, res: Response) => {
  const users = await usersStore.getAll();
  return res.json(users);
};

export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      error: "Invalid user id",
    });
  }

  const user = await usersStore.getById(id);

  if (!user || !user.isActive) {
    return res.status(404).json({
      error: "User not found",
    });
  }

  return res.json(user);
};