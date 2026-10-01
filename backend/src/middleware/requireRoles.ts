import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { usersStore } from "../store/users.store";
import type { UserRole } from "../types/user";

export function requireRoles(
  ...allowedRoles: UserRole[]
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userIdHeader =
      req.header("x-user-id");

    if (!userIdHeader) {
      return res.status(401).json({
        error: "Missing x-user-id header",
      });
    }

    const userId =
      Number(userIdHeader);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        error:
          "x-user-id must be a number",
      });
    }

    const user =
      await usersStore.getById(
        userId
      );

    if (
      !user ||
      !user.isActive
    ) {
      return res.status(401).json({
        error:
          "User does not exist or is inactive",
      });
    }

    if (
      !allowedRoles.includes(
        user.role
      )
    ) {
      return res.status(403).json({
        error:
          "You do not have permission to perform this action",
      });
    }

    next();
  };
}