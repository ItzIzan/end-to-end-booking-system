import type {
  Request,
  Response,
} from "express";

import bcrypt from "bcryptjs";

import {
  auditLogsStore,
} from "../store/auditLogs.store";

import {
  authSessionsStore,
} from "../store/authSessions.store";

import {
  customerAccountsStore,
} from "../store/customerAccounts.store";

import {
  usersStore,
} from "../store/users.store";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  generateRefreshToken,
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
  getRefreshExpiry,
  hashRefreshToken,
  signAccessToken,
} from "../services/auth.service";

import type {
  User,
  UserRole,
  UserWithPassword,
} from "../types/user";

import {
  isUserRole,
} from "../utils/bookingPermissions";

function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidUsername(
  username: string
): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(
    username
  );
}

function publicUser(
  user: UserWithPassword
): User {
  return {
    id: user.id,
    name: user.name,
    username:
      user.username,
    email: user.email,
    role: user.role,
    isActive:
      user.isActive,
    customerAccountId:
      user.customerAccountId,
    createdAt:
      user.createdAt,
    updatedAt:
      user.updatedAt,
  };
}

function clearRefreshCookie(
  res: Response
) {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    getRefreshCookieClearOptions()
  );
}

export const register =
  async (
    req: Request,
    res: Response
  ) => {
    const actor =
      req.authUser;

    if (!actor) {
      return res
        .status(401)
        .json({
          error:
            "Authentication required",
        });
    }

    const {
      name,
      username,
      email,
      password,
      role,
      customerAccountId,
    } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      customerAccountId?:
        number;
    };

    if (
      !name ||
      !username ||
      !email ||
      !password ||
      !role
    ) {
      return res
        .status(400)
        .json({
          error:
            "name, username, email, password and role are required",
        });
    }

    const cleanName =
      name.trim();

    const cleanUsername =
      username.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanName) {
      return res
        .status(400)
        .json({
          error:
            "name is required",
        });
    }

    if (
      !isValidUsername(
        cleanUsername
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "username must be 3-30 characters and only contain letters, numbers and underscores",
        });
    }

    if (
      !isValidEmail(
        cleanEmail
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "email must be valid",
        });
    }

    if (
      password.length < 10
    ) {
      return res
        .status(400)
        .json({
          error:
            "password must be at least 10 characters",
        });
    }

    if (
      !isUserRole(role)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid role",
        });
    }

    let parsedCustomerAccountId:
      number | null =
      null;

    if (
      role ===
      "CUSTOMER"
    ) {
      parsedCustomerAccountId =
        Number(
          customerAccountId
        );

      if (
        !Number.isInteger(
          parsedCustomerAccountId
        ) ||
        parsedCustomerAccountId <
          1
      ) {
        return res
          .status(400)
          .json({
            error:
              "customerAccountId is required for CUSTOMER users",
          });
      }

      const account =
        await customerAccountsStore
          .getById(
            parsedCustomerAccountId
          );

      if (
        !account ||
        !account.isActive
      ) {
        return res
          .status(400)
          .json({
            error:
              "Customer account does not exist or is inactive",
          });
      }
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    try {
      const user =
        await usersStore
          .create({
            name:
              cleanName,

            username:
              cleanUsername,

            email:
              cleanEmail,

            passwordHash,

            role,

            customerAccountId:
              role ===
              "CUSTOMER"
                ? parsedCustomerAccountId
                : null,
          });

      await auditLogsStore
        .create({
          entityType:
            "USER",

          entityId:
            user.id,

          action:
            "USER_CREATED",

          fieldName:
            "role",

          previousValue:
            null,

          newValue:
            user.role,

          changedByUserId:
            actor.id,

          changedByRole:
            actor.role,

          changedByName:
            actor.name,
        });

      return res
        .status(201)
        .json({
          user,
        });
    } catch (
      error: any
    ) {
      if (
        error?.code ===
        "P2002"
      ) {
        return res
          .status(409)
          .json({
            error:
              "email or username already exists",
          });
      }

      console.error(
        "Failed to create user:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to create user",
        });
    }
  };

export const login =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      emailOrUsername,
      password,
    } = req.body as {
      emailOrUsername?:
        string;
      password?: string;
    };

    if (
      !emailOrUsername ||
      !password
    ) {
      return res
        .status(400)
        .json({
          error:
            "emailOrUsername and password are required",
        });
    }

    const user =
      await usersStore
        .findByEmailOrUsername(
          emailOrUsername
            .trim()
        );

    if (
      !user ||
      !user.isActive
    ) {
      return res
        .status(401)
        .json({
          error:
            "Invalid login details",
        });
    }

    const matches =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!matches) {
      return res
        .status(401)
        .json({
          error:
            "Invalid login details",
        });
    }

    const refreshToken =
      generateRefreshToken();

    const refreshTokenHash =
      hashRefreshToken(
        refreshToken
      );

    const session =
      await authSessionsStore
        .create(
          user.id,
          refreshTokenHash,
          getRefreshExpiry()
        );

    const accessToken =
      signAccessToken(
        user.id,
        session.id
      );

    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      getRefreshCookieOptions()
    );

    return res.json({
      accessToken,

      expiresIn:
        ACCESS_TOKEN_TTL_SECONDS,

      user:
        publicUser(user),
    });
  };

export const refresh =
  async (
    req: Request,
    res: Response
  ) => {
    const refreshToken =
      req.cookies?.[
        REFRESH_COOKIE_NAME
      ];

    if (
      typeof refreshToken !==
        "string" ||
      !refreshToken
    ) {
      clearRefreshCookie(
        res
      );

      return res
        .status(401)
        .json({
          error:
            "Refresh session required",
        });
    }

    const currentHash =
      hashRefreshToken(
        refreshToken
      );

    const currentSession =
      await authSessionsStore
        .getByRefreshTokenHash(
          currentHash
        );

    if (
      !currentSession ||
      currentSession.revokedAt ||
      currentSession.expiresAt <=
        new Date() ||
      !currentSession.user ||
      !currentSession.user
        .isActive
    ) {
      clearRefreshCookie(
        res
      );

      return res
        .status(401)
        .json({
          error:
            "Refresh session is invalid or expired",
        });
    }

    const newRefreshToken =
      generateRefreshToken();

    const newHash =
      hashRefreshToken(
        newRefreshToken
      );

    const newSession =
      await authSessionsStore
        .rotate(
          currentSession.id,
          currentSession.userId,
          newHash,
          getRefreshExpiry()
        );

    if (!newSession) {
      clearRefreshCookie(
        res
      );

      return res
        .status(401)
        .json({
          error:
            "Refresh session is no longer valid",
        });
    }

    const accessToken =
      signAccessToken(
        currentSession.userId,
        newSession.id
      );

    res.cookie(
      REFRESH_COOKIE_NAME,
      newRefreshToken,
      getRefreshCookieOptions()
    );

    return res.json({
      accessToken,

      expiresIn:
        ACCESS_TOKEN_TTL_SECONDS,

      user:
        currentSession.user,
    });
  };

export const logout =
  async (
    req: Request,
    res: Response
  ) => {
    const refreshToken =
      req.cookies?.[
        REFRESH_COOKIE_NAME
      ];

    if (
      typeof refreshToken ===
        "string" &&
      refreshToken
    ) {
      await authSessionsStore
        .revokeByRefreshTokenHash(
          hashRefreshToken(
            refreshToken
          )
        );
    }

    clearRefreshCookie(
      res
    );

    return res
      .status(204)
      .send();
  };

export const logoutAll =
  async (
    req: Request,
    res: Response
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

    await authSessionsStore
      .revokeAllForUser(
        user.id
      );

    clearRefreshCookie(
      res
    );

    return res
      .status(204)
      .send();
  };

export const getMe =
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.authUser) {
      return res
        .status(401)
        .json({
          error:
            "Authentication required",
        });
    }

    return res.json({
      user:
        req.authUser,
    });
  };