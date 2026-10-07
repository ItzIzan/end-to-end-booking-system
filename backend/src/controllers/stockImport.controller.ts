import type {
  Request,
  Response,
} from "express";

import {
  auditLogsStore,
} from "../store/auditLogs.store";

import {
  customerAccountsStore,
} from "../store/customerAccounts.store";

import {
  stockImportsStore,
} from "../store/stockImports.store";

import {
  deleteTemporaryWorkbook,
  getWorkbookHeaders,
  inspectWorkbook,
  processWorkbook,
} from "../services/stockImport.service";

import {
  STOCK_IMPORT_FIELDS,
  type StockImportMapping,
} from "../types/stockImport";

import type {
  User,
} from "../types/user";

async function getActor(
  req: Request
): Promise<
  User | null
> {
  return (
    req.authUser ??
    null
  );
}

function validMapping(
  value: unknown
): value is
  StockImportMapping {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return false;
  }

  return Object
    .entries(
      value
    )
    .every(
      ([
        key,
        heading,
      ]) => {
        if (
          !STOCK_IMPORT_FIELDS.includes(
            key as any
          )
        ) {
          return false;
        }

        return (
          heading ===
            null ||
          heading ===
            undefined ||
          typeof heading ===
            "string"
        );
      }
    );
}

function parsePositiveInteger(
  value: unknown
): number | null {
  const parsed =
    Number(value);

  return (
    Number.isInteger(
      parsed
    ) &&
    parsed >= 1
  )
    ? parsed
    : null;
}

export const inspectStockImport =
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.file) {
      return res.status(400).json({
        error:
          "An .xlsx workbook is required",
      });
    }

    try {
      const sheets =
        await inspectWorkbook(
          req.file.filename
        );

      return res.json({
        uploadId:
          req.file.filename,

        originalFileName:
          req.file.originalname,

        sheets,
      });
    } catch (error) {
      try {
        deleteTemporaryWorkbook(
          req.file.filename
        );
      } catch {
        // Ignore cleanup failure.
      }

      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Unable to inspect workbook",
      });
    }
  };

export const getStockImportHeaders =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      uploadId,
      sheetName,
      headerRowNumber,
    } = req.body;

    if (
      !uploadId ||
      !sheetName
    ) {
      return res.status(400).json({
        error:
          "uploadId and sheetName are required",
      });
    }

    const parsedHeaderRowNumber =
      parsePositiveInteger(
        headerRowNumber ??
        1
      );

    if (
      parsedHeaderRowNumber ===
      null
    ) {
      return res.status(400).json({
        error:
          "headerRowNumber must be a positive integer",
      });
    }

    try {
      const headers =
        await getWorkbookHeaders({
          uploadId:
            String(
              uploadId
            ),

          sheetName:
            String(
              sheetName
            ),

          headerRowNumber:
            parsedHeaderRowNumber,
        });

      return res.json({
        sheetName:
          String(
            sheetName
          ),

        headerRowNumber:
          parsedHeaderRowNumber,

        headers,
      });
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Unable to read headers",
      });
    }
  };

export const processStockImport =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        uploadId,
        originalFileName,
        customerAccountId,
        defaultSiteId = null,
        profileId = null,

        sheetName:
          requestSheetName,

        headerRowNumber:
          requestHeaderRowNumber,

        mapping:
          requestMapping,
      } = req.body;

      const dryRun =
        req.body.dryRun !==
        false;

      if (!uploadId) {
        return res.status(400).json({
          error:
            "uploadId is required",
        });
      }

      const parsedCustomerAccountId =
        Number(
          customerAccountId
        );

      if (
        !customerAccountId ||
        Number.isNaN(
          parsedCustomerAccountId
        )
      ) {
        return res.status(400).json({
          error:
            "customerAccountId must be a number",
        });
      }

      const customerAccount =
        await customerAccountsStore
          .getById(
            parsedCustomerAccountId
          );

      if (
        !customerAccount ||
        !customerAccount.isActive
      ) {
        return res.status(400).json({
          error:
            "Customer account does not exist or is inactive",
        });
      }

      let profile:
        any = null;

      if (
        profileId !== null &&
        profileId !== undefined &&
        profileId !== ""
      ) {
        const parsedProfileId =
          Number(
            profileId
          );

        if (
          Number.isNaN(
            parsedProfileId
          )
        ) {
          return res.status(400).json({
            error:
              "profileId must be a number",
          });
        }

        profile =
          await stockImportsStore
            .getProfileById(
              parsedProfileId
            );

        if (!profile) {
          return res.status(404).json({
            error:
              "Import profile not found",
          });
        }
      }

      const sheetName =
        requestSheetName ??
        profile?.sheetName;

      if (!sheetName) {
        return res.status(400).json({
          error:
            "sheetName is required",
        });
      }

      const headerRowNumber =
        parsePositiveInteger(
          requestHeaderRowNumber ??
          profile?.headerRowNumber ??
          1
        );

      if (
        headerRowNumber ===
        null
      ) {
        return res.status(400).json({
          error:
            "headerRowNumber must be a positive integer",
        });
      }

      let mapping:
        StockImportMapping =
        {};

      if (
        profile?.columnMapping &&
        validMapping(
          profile.columnMapping
        )
      ) {
        mapping = {
          ...profile.columnMapping,
        };
      }

      if (
        requestMapping !==
        undefined
      ) {
        if (
          !validMapping(
            requestMapping
          )
        ) {
          return res.status(400).json({
            error:
              "A valid column mapping is required",
          });
        }

        mapping = {
          ...mapping,
          ...requestMapping,
        };
      }

      if (
        !validMapping(
          mapping
        ) ||
        !mapping.vin
      ) {
        return res.status(400).json({
          error:
            "A valid column mapping with VIN is required",
        });
      }

      const parsedDefaultSiteId =
        defaultSiteId ===
          null ||
        defaultSiteId ===
          undefined ||
        defaultSiteId ===
          ""
          ? null
          : Number(
              defaultSiteId
            );

      if (
        parsedDefaultSiteId !==
          null &&
        Number.isNaN(
          parsedDefaultSiteId
        )
      ) {
        return res.status(400).json({
          error:
            "defaultSiteId must be a number",
        });
      }

      const summary =
        await processWorkbook({
          uploadId:
            String(
              uploadId
            ),

          customerAccountId:
            parsedCustomerAccountId,

          defaultSiteId:
            parsedDefaultSiteId,

          sheetName:
            String(
              sheetName
            ),

          headerRowNumber,

          mapping,

          dryRun,
        });

      if (dryRun) {
        return res.json({
          dryRun: true,
          summary,
        });
      }

      const actor =
        await getActor(
          req
        );

      const batch =
        await stockImportsStore
          .createBatch({
            customerAccountId:
              parsedCustomerAccountId,

            profileId:
              profile?.id ??
              null,

            originalFileName:
              String(
                originalFileName ??
                uploadId
              ),

            sheetName:
              String(
                sheetName
              ),

            headerRowNumber,

            columnMapping:
              mapping,

            rowsProcessed:
              summary.rowsProcessed,

            rowsCreated:
              summary.rowsCreated,

            rowsUpdated:
              summary.rowsUpdated,

            rowsUnchanged:
              summary.rowsUnchanged,

            rowsFailed:
              summary.rowsFailed,

            errors:
              summary.errors,

            uploadedByUserId:
              actor?.id ??
              null,
          });

      await auditLogsStore.create({
        entityType:
          "STOCK_IMPORT_BATCH",

        entityId:
          batch.id,

        action:
          "STOCK_IMPORT_COMPLETED",

        fieldName:
          "rowsProcessed",

        previousValue:
          null,

        newValue:
          String(
            summary.rowsProcessed
          ),

        changedByUserId:
          actor?.id ??
          null,

        changedByRole:
          actor?.role ??
          null,

        changedByName:
          actor?.name ??
          null,
      });

      try {
        deleteTemporaryWorkbook(
          String(
            uploadId
          )
        );
      } catch {
        // Import succeeded.
      }

      return res.json({
        dryRun: false,
        batch,
        summary,
      });
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Stock import failed",
      });
    }
  };

export const discardStockImportUpload =
  async (
    req: Request,
    res: Response
  ) => {
    const uploadId =
      String(
        req.params.uploadId ??
        ""
      );

    if (!uploadId) {
      return res.status(400).json({
        error:
          "uploadId is required",
      });
    }

    try {
      deleteTemporaryWorkbook(
        uploadId
      );

      return res
        .status(204)
        .send();
    } catch (error) {
      return res.status(404).json({
        error:
          error instanceof Error
            ? error.message
            : "Uploaded workbook not found",
      });
    }
  };

export const getImportProfiles =
  async (
    _req: Request,
    res: Response
  ) => {
    return res.json(
      await stockImportsStore
        .getProfiles()
    );
  };

export const createImportProfile =
  async (
    req: Request,
    res: Response
  ) => {
    const {
      name,
      sheetName = null,
      headerRowNumber = 1,
      columnMapping,
    } = req.body;

    const profileName =
      String(
        name ??
        ""
      ).trim();

    if (!profileName) {
      return res.status(400).json({
        error:
          "name is required",
      });
    }

    const parsedHeaderRowNumber =
      parsePositiveInteger(
        headerRowNumber
      );

    if (
      parsedHeaderRowNumber ===
      null
    ) {
      return res.status(400).json({
        error:
          "headerRowNumber must be a positive integer",
      });
    }

    if (
      !validMapping(
        columnMapping
      ) ||
      !columnMapping.vin
    ) {
      return res.status(400).json({
        error:
          "columnMapping must be valid and include VIN",
      });
    }

    const actor =
      await getActor(
        req
      );

    try {
      const profile =
        await stockImportsStore
          .createProfile({
            name:
              profileName,

            sheetName:
              sheetName
                ? String(
                    sheetName
                  ).trim()
                : null,

            headerRowNumber:
              parsedHeaderRowNumber,

            columnMapping,

            createdByUserId:
              actor?.id ??
              null,
          });

      await auditLogsStore.create({
        entityType:
          "STOCK_IMPORT_PROFILE",

        entityId:
          profile.id,

        action:
          "STOCK_IMPORT_PROFILE_CREATED",

        fieldName:
          "name",

        previousValue:
          null,

        newValue:
          profile.name,

        changedByUserId:
          actor?.id ??
          null,

        changedByRole:
          actor?.role ??
          null,

        changedByName:
          actor?.name ??
          null,
      });

      return res
        .status(201)
        .json(
          profile
        );
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Unable to create profile",
      });
    }
  };

export const updateImportProfile =
  async (
    req: Request,
    res: Response
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      Number.isNaN(id)
    ) {
      return res.status(400).json({
        error:
          "Invalid profile id",
      });
    }

    const existing =
      await stockImportsStore
        .getProfileById(
          id
        );

    if (!existing) {
      return res.status(404).json({
        error:
          "Import profile not found",
      });
    }

    const updates: {
      name?: string;

      sheetName?:
        string | null;

      headerRowNumber?:
        number;

      columnMapping?:
        StockImportMapping;
    } = {};

    if (
      req.body.name !==
      undefined
    ) {
      const name =
        String(
          req.body.name
        ).trim();

      if (!name) {
        return res.status(400).json({
          error:
            "name cannot be empty",
        });
      }

      updates.name =
        name;
    }

    if (
      req.body.sheetName !==
      undefined
    ) {
      updates.sheetName =
        req.body.sheetName
          ? String(
              req.body.sheetName
            ).trim()
          : null;
    }

    if (
      req.body.headerRowNumber !==
      undefined
    ) {
      const parsed =
        parsePositiveInteger(
          req.body.headerRowNumber
        );

      if (
        parsed === null
      ) {
        return res.status(400).json({
          error:
            "headerRowNumber must be a positive integer",
        });
      }

      updates.headerRowNumber =
        parsed;
    }

    if (
      req.body.columnMapping !==
      undefined
    ) {
      if (
        !validMapping(
          req.body.columnMapping
        ) ||
        !req.body
          .columnMapping
          .vin
      ) {
        return res.status(400).json({
          error:
            "columnMapping must be valid and include VIN",
        });
      }

      updates.columnMapping =
        req.body.columnMapping;
    }

    try {
      const updated =
        await stockImportsStore
          .updateProfile(
            id,
            updates
          );

      const actor =
        await getActor(
          req
        );

      await auditLogsStore.create({
        entityType:
          "STOCK_IMPORT_PROFILE",

        entityId:
          id,

        action:
          "STOCK_IMPORT_PROFILE_UPDATED",

        fieldName:
          null,

        previousValue:
          JSON.stringify(
            existing
          ),

        newValue:
          JSON.stringify(
            updated
          ),

        changedByUserId:
          actor?.id ??
          null,

        changedByRole:
          actor?.role ??
          null,

        changedByName:
          actor?.name ??
          null,
      });

      return res.json(
        updated
      );
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Unable to update profile",
      });
    }
  };

export const deleteImportProfile =
  async (
    req: Request,
    res: Response
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      Number.isNaN(id)
    ) {
      return res.status(400).json({
        error:
          "Invalid profile id",
      });
    }

    const existing =
      await stockImportsStore
        .getProfileById(
          id
        );

    if (!existing) {
      return res.status(404).json({
        error:
          "Import profile not found",
      });
    }

    await stockImportsStore
      .deleteProfile(
        id
      );

    const actor =
      await getActor(
        req
      );

    await auditLogsStore.create({
      entityType:
        "STOCK_IMPORT_PROFILE",

      entityId:
        id,

      action:
        "STOCK_IMPORT_PROFILE_DELETED",

      fieldName:
        "name",

      previousValue:
        existing.name,

      newValue:
        null,

      changedByUserId:
        actor?.id ??
        null,

      changedByRole:
        actor?.role ??
        null,

      changedByName:
        actor?.name ??
        null,
    });

    return res
      .status(204)
      .send();
  };

export const getImportBatches =
  async (
    _req: Request,
    res: Response
  ) => {
    return res.json(
      await stockImportsStore
        .getBatches()
    );
  };