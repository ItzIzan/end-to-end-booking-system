import { Router } from "express";
import { getBookings, getBookingById } from "../controllers/bookings.controller";
import { createBooking } from "../controllers/bookings.controller";
import { updateBooking } from "../controllers/bookings.controller";
import { deleteBooking } from "../controllers/bookings.controller";


const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);
router.patch("/:id", updateBooking);
router.delete("/:id", deleteBooking);

export default router;