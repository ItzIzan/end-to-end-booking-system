import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  getMe,
  login,
  logout,
  logoutAll,
  refresh,
  register,
} from "../controllers/auth.controller";

import {
  requireAuth,
} from "../middleware/requireAuth";

import {
  requireRoles,
} from "../middleware/requireRoles";

const router =
  Router();

const loginLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      error:
        "Too many login attempts. Please try again later.",
    },
  });

router.post(
  "/login",
  loginLimiter,
  login
);

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  logout
);

router.get(
  "/me",
  requireAuth,
  getMe
);

router.post(
  "/logout-all",
  requireAuth,
  logoutAll
);

router.post(
  "/register",
  requireAuth,
  requireRoles(
    "SYSTEM_ADMIN"
  ),
  register
);

export default router;