import { Router } from "express";

import {
  createCustomerAccount,
  getCustomerAccountById,
  getCustomerAccounts,
  updateCustomerAccount,
} from "../controllers/customerAccounts.controller";

const router = Router();

router.get(
  "/",
  getCustomerAccounts
);

router.get(
  "/:id",
  getCustomerAccountById
);

router.post(
  "/",
  createCustomerAccount
);

router.patch(
  "/:id",
  updateCustomerAccount
);

export default router;