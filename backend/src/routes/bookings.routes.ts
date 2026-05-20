import { Router } from "express";
import {
  assignDriver,
  completeBooking,
  confirmBooking,
  confirmDriverDelivered,
  confirmEndUserDelivered,
  createBooking,
  deleteBooking,
  dispatchBooking,
  getBookingById,
  getBookings,
  markReady,
  releaseFromSite,
  startTransit,
  updateBooking,
} from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);

router.patch("/:id", updateBooking);

router.post("/:id/confirm-booking", confirmBooking);
router.post("/:id/assign-driver", assignDriver);
router.post("/:id/mark-ready", markReady);
router.post("/:id/release-from-site", releaseFromSite);
router.post("/:id/dispatch", dispatchBooking);
router.post("/:id/start-transit", startTransit);
router.post("/:id/driver-delivered", confirmDriverDelivered);
router.post("/:id/enduser-delivered", confirmEndUserDelivered);
router.post("/:id/complete", completeBooking);

router.delete("/:id", deleteBooking);

export default router;