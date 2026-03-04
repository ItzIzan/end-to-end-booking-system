import { Router } from "express";
import { getBookings, getBookingById } from "../controllers/bookings.controller";
import { createBooking } from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);

export default router;