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
  MAX_EVIDENCE_IMAGES_PER_UPLOAD,
} from "../constants/bookingEvidence";

const router = Router();

/*
 * Public recipient confirmation.
 */
router.post(
  "/delivery-confirm/:token",
  verifyDeliveryOtp
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
 * Evidence.
 */
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

/*
 * Collection day.
 */
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

/*
 * Security verifies the assigned
 * driver and releases in one action.
 */
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