import { Router } from "express";
import {
  createVehicle,
  getVehicleById,
  getVehicles,
  updateVehicle,
} from "../controllers/vehicles.controller";

const router = Router();

router.get("/", getVehicles);
router.get("/:id", getVehicleById);
router.post("/", createVehicle);
router.patch("/:id", updateVehicle);

export default router;