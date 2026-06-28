import { Router } from "express";
import {
  createSite,
  getSiteById,
  getSites,
  updateSite,
} from "../controllers/sites.controller";

const router = Router();

router.get("/", getSites);
router.get("/:id", getSiteById);
router.post("/", createSite);
router.patch("/:id", updateSite);

export default router;