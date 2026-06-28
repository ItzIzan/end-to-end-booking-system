import { Router } from "express";
import {
  getBookingAvailability,
  getBookingSettings,
  updateBookingSettings,
} from "../controllers/bookingSettings.controller";

const router = Router();

router.get("/", getBookingSettings);
router.patch("/", updateBookingSettings);
router.get("/availability", getBookingAvailability);

export default router;