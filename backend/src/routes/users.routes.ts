import { Router } from "express";
import {
  createUser,
  getCurrentUser,
  getUsers,
} from "../controllers/users.controller";

const router = Router();

router.get("/", getUsers);
router.get("/me", getCurrentUser);
router.post("/", createUser);

export default router;