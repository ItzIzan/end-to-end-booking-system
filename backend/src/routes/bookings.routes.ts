import { Router } from "express";
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  assignDriver,
  confirmDriverDelivered,
  confirmEndUserDelivered,
  deleteBooking,
} from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);
router.patch("/:id", updateBooking);

router.post("/:id/assign-driver", assignDriver);
router.post("/:id/driver-delivered", confirmDriverDelivered);
router.post("/:id/enduser-delivered", confirmEndUserDelivered);

router.delete("/:id", deleteBooking);

export default router;