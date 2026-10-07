import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import {
  EVIDENCE_ROOT,
} from "./config/uploadPaths";

import {
  requireAuth,
} from "./middleware/requireAuth";

import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/bookings.routes";
import bookingSettingsRoutes from "./routes/bookingSettings.routes";
import customerAccountRoutes from "./routes/customerAccounts.routes";
import healthRoutes from "./routes/health.routes";
import siteRoutes from "./routes/sites.routes";
import stockImportRoutes from "./routes/stockImport.routes";
import userRoutes from "./routes/users.routes";
import vehicleRoutes from "./routes/vehicles.routes";

const app =
  express();

app.disable(
  "x-powered-by"
);

if (
  process.env.TRUST_PROXY ===
  "true"
) {
  app.set(
    "trust proxy",
    1
  );
}

const allowedOrigins =
  (
    process.env.CORS_ORIGINS ??
    "http://localhost:5173"
  )
    .split(",")
    .map(
      (
        value
      ) =>
        value.trim()
    )
    .filter(Boolean);

app.use(
  cors({
    credentials: true,

    origin(
      origin,
      callback
    ) {
      /*
       * No Origin header:
       * Postman, server-to-server,
       * native apps, curl, etc.
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "Origin is not allowed by CORS"
        )
      );
    },
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  cookieParser()
);

/*
 * Temporary local evidence serving.
 *
 * We will replace this with private
 * object storage during the storage
 * production pass.
 */
app.use(
  "/uploads/evidence",
  express.static(
    EVIDENCE_ROOT
  )
);

/*
 * Public.
 */
app.use(
  "/health",
  healthRoutes
);

app.use(
  "/auth",
  authRoutes
);

/*
 * Authenticated API.
 */
app.use(
  "/users",
  requireAuth,
  userRoutes
);

app.use(
  "/customer-accounts",
  requireAuth,
  customerAccountRoutes
);

app.use(
  "/sites",
  requireAuth,
  siteRoutes
);

app.use(
  "/vehicles",
  requireAuth,
  vehicleRoutes
);

app.use(
  "/stock-import",
  requireAuth,
  stockImportRoutes
);

/*
 * bookingRoutes handles authentication
 * internally because recipient
 * confirmation is intentionally public.
 */
app.use(
  "/bookings",
  bookingRoutes
);

app.use(
  "/booking-settings",
  requireAuth,
  bookingSettingsRoutes
);

app.use(
  (
    error: unknown,
    _req:
      express.Request,
    res:
      express.Response,
    _next:
      express.NextFunction
  ) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error";

    const name =
      error &&
      typeof error ===
        "object" &&
      "name" in error
        ? String(
            (
              error as {
                name?:
                  unknown;
              }
            ).name ??
              ""
          )
        : "";

    const isUploadError =
      name ===
        "MulterError" ||
      message.startsWith(
        "Only JPEG"
      ) ||
      message.startsWith(
        "Only .xlsx"
      );

    const isCorsError =
      message ===
      "Origin is not allowed by CORS";

    return res
      .status(
        isUploadError ||
          isCorsError
          ? 400
          : 500
      )
      .json({
        error:
          message,
      });
  }
);

const PORT =
  Number(
    process.env.PORT ??
      3000
  );

app.listen(
  PORT,
  () => {
    console.log(
      `Server is running on http://localhost:${PORT}`
    );
  }
);