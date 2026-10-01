import { Router } from "express";

import {
  createVehicle,
  getVehicleById,
  getVehicles,
  lookupVehicle,
  removeVehicle,
  updateVehicle,
} from "../controllers/vehicles.controller";
import { requireRoles } from "../middleware/requireRoles";

const router = Router();

router.get("/", getVehicles);

router.get(
  "/lookup",
  lookupVehicle
);

router.get(
  "/:id",
  getVehicleById
);

router.post(
  "/",
  requireRoles(
    "SYSTEM_ADMIN",
    "OPS_ADMIN"
  ),
  createVehicle
);

router.patch(
  "/:id",
  requireRoles(
    "SYSTEM_ADMIN",
    "OPS_ADMIN"
  ),
  updateVehicle
);

router.post(
  "/:id/remove",
  requireRoles(
    "SYSTEM_ADMIN",
    "OPS_ADMIN"
  ),
  removeVehicle
);

export default router;