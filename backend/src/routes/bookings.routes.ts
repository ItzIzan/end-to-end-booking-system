import { Router } from "express";
import { getBookings } from "../controllers/bookings.controller";

const router = Router();

router.get("/", getBookings);

export default router;