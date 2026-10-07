import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type {
  UserRole,
} from "../types/user";

export function requireRoles(
  ...allowedRoles: UserRole[]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user =
      req.authUser;

    if (!user) {
      return res
        .status(401)
        .json({
          error:
            "Authentication required",
        });
    }

    if (
      !allowedRoles.includes(
        user.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "You do not have permission to perform this action",
        });
    }

    return next();
  };
}