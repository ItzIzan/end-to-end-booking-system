import {
  Router,
} from "express";

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
} from "../controllers/bookings.controller";

import {
  deleteBookingEvidence,
  getBookingEvidence,
  preflightPocEvidence,
  preflightPodEvidence,
  uploadPocEvidence,
  uploadPodEvidence,
} from "../controllers/bookingEvidence.controller";

import {
  evidenceUpload,
} from "../middleware/uploads";

import {
  requireAuth,
} from "../middleware/requireAuth";

import {
  MAX_EVIDENCE_IMAGES_PER_UPLOAD,
} from "../constants/bookingEvidence";

const router =
  Router();

/*
 * Public recipient confirmation.
 *
 * Authentication is the delivery
 * token + OTP rather than a user
 * account.
 */
router.post(
  "/delivery-confirm/:token",
  verifyDeliveryOtp
);

/*
 * Everything below this line
 * requires an authenticated user.
 */
router.use(
  requireAuth
);

router.get(
  "/",
  getBookings
);

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

router.post(
  "/:id/request-date-change",
  requestDateChange
);

router.post(
  "/:id/confirm-date-change",
  confirmDateChange
);

router.post(
  "/:id/assign-driver",
  assignDriver
);

router.post(
  "/:id/mark-ready",
  markReady
);

router.get(
  "/:id/evidence",
  getBookingEvidence
);

router.post(
  "/:id/evidence/poc",
  preflightPocEvidence,

  evidenceUpload.array(
    "images",
    MAX_EVIDENCE_IMAGES_PER_UPLOAD
  ),

  uploadPocEvidence
);

router.post(
  "/:id/evidence/pod",
  preflightPodEvidence,

  evidenceUpload.array(
    "images",
    MAX_EVIDENCE_IMAGES_PER_UPLOAD
  ),

  uploadPodEvidence
);

router.delete(
  "/:id/evidence/:evidenceId",
  deleteBookingEvidence
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

router.post(
  "/:id/driver-delivered",
  confirmDriverDelivered
);

router.post(
  "/:id/cancel",
  cancelBooking
);

export default router;