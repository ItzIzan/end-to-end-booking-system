import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  authSessionsStore,
} from "../store/authSessions.store";

import {
  verifyAccessToken,
} from "../services/auth.service";

import type {
  User,
} from "../types/user";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization =
    req.header(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return res
      .status(401)
      .json({
        error:
          "Authentication required",
      });
  }

  const token =
    authorization
      .slice(
        "Bearer ".length
      )
      .trim();

  if (!token) {
    return res
      .status(401)
      .json({
        error:
          "Authentication required",
      });
  }

  try {
    const verified =
      verifyAccessToken(
        token
      );

    const session =
      await authSessionsStore
        .getByIdWithUser(
          verified.sessionId
        );

    if (
      !session ||
      session.userId !==
        verified.userId ||
      session.revokedAt ||
      session.expiresAt <=
        new Date()
    ) {
      return res
        .status(401)
        .json({
          error:
            "Session is no longer valid",
        });
    }

    if (
      !session.user ||
      !session.user.isActive
    ) {
      return res
        .status(401)
        .json({
          error:
            "User is inactive",
        });
    }

    req.authUser =
      session.user as User;

    req.authSessionId =
      session.id;

    return next();
  } catch {
    return res
      .status(401)
      .json({
        error:
          "Invalid or expired access token",
      });
  }
}