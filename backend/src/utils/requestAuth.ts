import type {
  Request,
} from "express";

import type {
  User,
} from "../types/user";

export function getAuthUser(
  req: Request
): User {
  if (!req.authUser) {
    throw new Error(
      "Authenticated user missing from request"
    );
  }

  return req.authUser;
}

export function getAuditActor(
  req: Request
) {
  const user =
    getAuthUser(req);

  return {
    changedByUserId:
      user.id,

    changedByRole:
      user.role,

    changedByName:
      user.name,
  };
}