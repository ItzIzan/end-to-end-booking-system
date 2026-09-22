import {
  Request,
  Response,
} from "express";

import { auditLogsStore } from "../store/auditLogs.store";

import { customerAccountsStore } from "../store/customerAccounts.store";

import {
  getRoleFromHeader,
  requireRole,
} from "../utils/bookingPermissions";

function getActor(
  req: Request
) {
  const idHeader =
    req.header("x-user-id");

  const id = idHeader
    ? Number(idHeader)
    : null;

  return {
    changedByUserId:
      id &&
      !Number.isNaN(id)
        ? id
        : null,

    changedByRole:
      getRoleFromHeader(
        req.header(
          "x-user-role"
        )
      ),

    changedByName:
      req.header(
        "x-user-name"
      ) || null,
  };
}

export const getCustomerAccounts =
  async (
    req: Request,
    res: Response
  ) => {
    const role =
      getRoleFromHeader(
        req.header(
          "x-user-role"
        )
      );

    const check =
      requireRole(
        role,
        [
          "SYSTEM_ADMIN",
          "TRANSPORT_ADMIN",
          "OPS_ADMIN",
        ]
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    return res.json(
      await customerAccountsStore.getAll()
    );
  };

export const getCustomerAccountById =
  async (
    req: Request,
    res: Response
  ) => {
    const id =
      Number(req.params.id);

    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid customer account id",
        });
    }

    const account =
      await customerAccountsStore.getById(
        id
      );

    if (!account) {
      return res
        .status(404)
        .json({
          error:
            "Customer account not found",
        });
    }

    return res.json(account);
  };

export const createCustomerAccount =
  async (
    req: Request,
    res: Response
  ) => {
    const role =
      getRoleFromHeader(
        req.header(
          "x-user-role"
        )
      );

    const check =
      requireRole(
        role,
        ["SYSTEM_ADMIN"]
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const {
      companyName,
      contactName,
      email,
      phone,
      address,
    } = req.body;

    if (
      !companyName ||
      !contactName ||
      !email ||
      !phone ||
      !address
    ) {
      return res
        .status(400)
        .json({
          error:
            "companyName, contactName, email, phone and address are required",
        });
    }

    const account =
      await customerAccountsStore.create({
        companyName,
        contactName,
        email,
        phone,
        address,
      });

    await auditLogsStore.create({
      entityType:
        "CUSTOMER_ACCOUNT",

      entityId:
        account.id,

      action:
        "CUSTOMER_ACCOUNT_CREATED",

      fieldName: null,
      previousValue: null,

      newValue:
        JSON.stringify(
          account
        ),

      ...getActor(req),
    });

    return res
      .status(201)
      .json(account);
  };

export const updateCustomerAccount =
  async (
    req: Request,
    res: Response
  ) => {
    const role =
      getRoleFromHeader(
        req.header(
          "x-user-role"
        )
      );

    const check =
      requireRole(
        role,
        ["SYSTEM_ADMIN"]
      );

    if (!check.allowed) {
      return res
        .status(403)
        .json({
          error: check.reason,
        });
    }

    const id =
      Number(req.params.id);

    if (Number.isNaN(id)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid customer account id",
        });
    }

    const existing =
      await customerAccountsStore.getById(
        id
      );

    if (!existing) {
      return res
        .status(404)
        .json({
          error:
            "Customer account not found",
        });
    }

    const updated =
      await customerAccountsStore.updateById(
        id,
        req.body
      );

    await auditLogsStore.create({
      entityType:
        "CUSTOMER_ACCOUNT",

      entityId: id,

      action:
        "CUSTOMER_ACCOUNT_UPDATED",

      fieldName: null,

      previousValue:
        JSON.stringify(
          existing
        ),

      newValue:
        JSON.stringify(
          updated
        ),

      ...getActor(req),
    });

    return res.json(updated);
  };