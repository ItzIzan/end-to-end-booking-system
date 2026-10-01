import express from "express";

import {
  EVIDENCE_ROOT,
} from "./config/uploadPaths";

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

app.use(
  express.json()
);

/*
 * Development evidence serving.
 *
 * Only the evidence folder is exposed.
 * Temporary Excel uploads are not.
 *
 * Replace with private cloud storage
 * before production.
 */
app.use(
  "/uploads/evidence",
  express.static(
    EVIDENCE_ROOT
  )
);

app.use(
  "/health",
  healthRoutes
);

app.use(
  "/auth",
  authRoutes
);

app.use(
  "/users",
  userRoutes
);

app.use(
  "/customer-accounts",
  customerAccountRoutes
);

app.use(
  "/sites",
  siteRoutes
);

app.use(
  "/vehicles",
  vehicleRoutes
);

app.use(
  "/stock-import",
  stockImportRoutes
);

app.use(
  "/bookings",
  bookingRoutes
);

app.use(
  "/booking-settings",
  bookingSettingsRoutes
);

/*
 * Final error handler.
 * Includes upload errors.
 */
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
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
                name?: unknown;
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

    return res
      .status(
        isUploadError
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
  3000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server is running on http://localhost:${PORT}`
    );
  }
);