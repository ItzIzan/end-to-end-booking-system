import { Router } from "express";

import {
  acceptBookingDate,
  acceptCounterDate,
  assignDriver,
  cancelBooking,
  confirmDateChange,
  confirmDriverCollection,
  confirmDriverDelivered,
  counterBookingDate,
  createBooking,
  getBookingAuditLogs,
  getBookingById,
  getBookings,
  markReady,
  placeSecurityHold,
  releaseFromSite,
  requestDateChange,
  resolveSecurityHold,
  verifyDeliveryOtp,
  verifyDriverAtSecurity,
} from "../controllers/bookings.controller";

const router = Router();

/*
 * Public recipient confirmation.
 * No account required.
 */
router.post(
  "/delivery-confirm/:token",
  verifyDeliveryOtp
);

router.get("/", getBookings);

router.get(
  "/:id",
  getBookingById
);

router.get(
  "/:id/audit",
  getBookingAuditLogs
);

router.post(
  "/",
  createBooking
);

/*
 * Initial date negotiation.
 */
router.post(
  "/:id/accept-date",
  acceptBookingDate
);

router.post(
  "/:id/counter-date",
  counterBookingDate
);

router.post(
  "/:id/accept-counter",
  acceptCounterDate
);

/*
 * Date changes after confirmation.
 */
router.post(
  "/:id/request-date-change",
  requestDateChange
);

router.post(
  "/:id/confirm-date-change",
  confirmDateChange
);

/*
 * Driver Admin.
 */
router.post(
  "/:id/assign-driver",
  assignDriver
);

/*
 * Ops.
 */
router.post(
  "/:id/mark-ready",
  markReady
);

/*
 * Collection day.
 */
router.post(
  "/:id/security-verify-driver",
  verifyDriverAtSecurity
);

router.post(
  "/:id/driver-collected",
  confirmDriverCollection
);

router.post(
  "/:id/security-hold",
  placeSecurityHold
);

router.post(
  "/:id/resolve-security-hold",
  resolveSecurityHold
);

router.post(
  "/:id/security-release",
  releaseFromSite
);

/*
 * Delivery.
 */
router.post(
  "/:id/driver-delivered",
  confirmDriverDelivered
);

/*
 * Cancellation.
 */
router.post(
  "/:id/cancel",
  cancelBooking
);

export default router;