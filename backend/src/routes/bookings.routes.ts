import { Router } from "express";
import {
  acceptBookingDate,
  acceptCounterDate,
  assignDriver,
  completeBooking,
  counterBookingDate,
  createBooking,
  deleteBooking,
  dispatchBooking,
  getBookingAuditLogs,
  getBookingById,
  getBookings,
  markReady,
  rejectAtSecurity,
  releaseFromSite,
  startTransit,
  confirmDriverDelivered,
  confirmEndUserDelivered,
} from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.get("/:id/audit", getBookingAuditLogs);

router.post("/", createBooking);

router.post("/:id/accept-date", acceptBookingDate);
router.post("/:id/counter-date", counterBookingDate);
router.post("/:id/accept-counter", acceptCounterDate);

router.post("/:id/assign-driver", assignDriver);
router.post("/:id/mark-ready", markReady);
router.post("/:id/release-from-site", releaseFromSite);
router.post("/:id/security-reject", rejectAtSecurity);
router.post("/:id/dispatch", dispatchBooking);
router.post("/:id/start-transit", startTransit);
router.post("/:id/driver-delivered", confirmDriverDelivered);
router.post("/:id/enduser-delivered", confirmEndUserDelivered);
router.post("/:id/complete", completeBooking);

router.delete("/:id", deleteBooking);

export default router;