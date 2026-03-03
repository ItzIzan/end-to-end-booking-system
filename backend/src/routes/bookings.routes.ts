import { Router } from "express";
import { getBookings, getBookingById } from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);
router.get("/:id", getBookingById);

export default router;