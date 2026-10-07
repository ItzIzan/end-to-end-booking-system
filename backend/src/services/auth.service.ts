import crypto from "crypto";

import type {
  CookieOptions,
} from "express";

import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

export const REFRESH_COOKIE_NAME =
  "booking_refresh_token";

export const ACCESS_TOKEN_TTL_SECONDS =
  15 * 60;

const REFRESH_TOKEN_TTL_DAYS =
  30;

const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS *
  24 *
  60 *
  60 *
  1000;

function getAccessTokenSecret(): string {
  const secret =
    process.env.ACCESS_TOKEN_SECRET;

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "ACCESS_TOKEN_SECRET must be configured and at least 32 characters long"
    );
  }

  return secret;
}

function getIssuer(): string {
  return (
    process.env.JWT_ISSUER ||
    "booking-api"
  );
}

function getAudience(): string {
  return (
    process.env.JWT_AUDIENCE ||
    "booking-web"
  );
}

export function generateRefreshToken(): string {
  return crypto
    .randomBytes(64)
    .toString("base64url");
}

export function hashRefreshToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getRefreshExpiry(): Date {
  return new Date(
    Date.now() +
      REFRESH_TOKEN_TTL_MS
  );
}

export function signAccessToken(
  userId: number,
  sessionId: string
): string {
  return jwt.sign(
    {
      sessionId,
      tokenType: "access",
    },
    getAccessTokenSecret(),
    {
      algorithm: "HS256",

      subject:
        String(userId),

      issuer:
        getIssuer(),

      audience:
        getAudience(),

      expiresIn:
        ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

export interface VerifiedAccessToken {
  userId: number;
  sessionId: string;
}

export function verifyAccessToken(
  token: string
): VerifiedAccessToken {
  const decoded =
    jwt.verify(
      token,
      getAccessTokenSecret(),
      {
        algorithms: [
          "HS256",
        ],

        issuer:
          getIssuer(),

        audience:
          getAudience(),
      }
    );

  if (
    typeof decoded ===
      "string"
  ) {
    throw new Error(
      "Invalid access token"
    );
  }

  const payload =
    decoded as JwtPayload & {
      sessionId?: unknown;
      tokenType?: unknown;
    };

  if (
    payload.tokenType !==
      "access"
  ) {
    throw new Error(
      "Invalid token type"
    );
  }

  const userId =
    Number(payload.sub);

  if (
    !Number.isInteger(
      userId
    ) ||
    userId < 1
  ) {
    throw new Error(
      "Invalid token subject"
    );
  }

  if (
    typeof payload.sessionId !==
      "string" ||
    !payload.sessionId
  ) {
    throw new Error(
      "Invalid session"
    );
  }

  return {
    userId,
    sessionId:
      payload.sessionId,
  };
}

export function getRefreshCookieOptions():
  CookieOptions {
  return {
    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax",

    path: "/auth",

    maxAge:
      REFRESH_TOKEN_TTL_MS,
  };
}

export function getRefreshCookieClearOptions():
  CookieOptions {
  return {
    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax",

    path: "/auth",
  };
}