import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

import {
  STOCK_IMPORT_TEMP_ROOT,
} from "../config/uploadPaths";

import {
  sitesStore,
} from "../store/sites.store";

import {
  vehiclesStore,
} from "../store/vehicles.store";

import type {
  CreateVehicleInput,
  FuelType,
  VehicleStatus,
} from "../types/vehicle";

import type {
  StockImportMapping,
  StockImportSummary,
} from "../types/stockImport";

import {
  normaliseReg,
  normaliseVin,
} from "../utils/vehicleIdentifiers";

const MAX_INSPECTION_ROWS =
  50;

const MAX_INSPECTION_COLUMNS =
  100;

const MAX_PREVIEW_ROWS =
  100;

function getImportPath(
  uploadId: string
) {
  if (
    path.basename(
      uploadId
    ) !== uploadId
  ) {
    throw new Error(
      "Invalid upload id"
    );
  }

  const filePath =
    path.join(
      STOCK_IMPORT_TEMP_ROOT,
      uploadId
    );

  if (
    !fs.existsSync(
      filePath
    )
  ) {
    throw new Error(
      "Uploaded workbook could not be found or has expired"
    );
  }

  return filePath;
}

function normaliseHeader(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}

function rawValue(
  cell: any
): any {
  const value =
    cell.value;

  if (
    value &&
    typeof value ===
      "object" &&
    "result" in value
  ) {
    return value.result;
  }

  return value;
}

function valueToString(
  value: any
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    value instanceof Date
  ) {
    return value
      .toISOString();
  }

  if (
    typeof value ===
    "object"
  ) {
    if (
      "text" in value
    ) {
      return String(
        value.text ?? ""
      ).trim();
    }

    if (
      "richText" in value &&
      Array.isArray(
        value.richText
      )
    ) {
      return value
        .richText
        .map(
          (part: any) =>
            String(
              part.text ??
              ""
            )
        )
        .join("")
        .trim();
    }

    if (
      "hyperlink" in value &&
      "text" in value
    ) {
      return String(
        value.text ?? ""
      ).trim();
    }
  }

  return String(
    value
  ).trim();
}

function parseDate(
  value: any
): Date | null {
  if (
    value instanceof Date
  ) {
    return Number.isNaN(
      value.getTime()
    )
      ? null
      : value;
  }

  if (
    typeof value ===
      "number"
  ) {
    const excelEpoch =
      new Date(
        Date.UTC(
          1899,
          11,
          30
        )
      );

    const milliseconds =
      value *
      24 *
      60 *
      60 *
      1000;

    const date =
      new Date(
        excelEpoch.getTime() +
        milliseconds
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const text =
    valueToString(
      value
    );

  if (!text) {
    return null;
  }

  const date =
    new Date(text);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function parseMileage(
  value: any
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    return value >= 0
      ? Math.round(
          value
        )
      : null;
  }

  const text =
    valueToString(
      value
    );

  if (!text) {
    return null;
  }

  const cleaned =
    text.replace(
      /[^0-9.]/g,
      ""
    );

  if (!cleaned) {
    return null;
  }

  const mileage =
    Number(cleaned);

  return (
    Number.isNaN(
      mileage
    ) ||
    mileage < 0
  )
    ? null
    : Math.round(
        mileage
      );
}

function parseFuelType(
  value: any
): FuelType | null {
  const text =
    valueToString(
      value
    ).toLowerCase();

  if (!text) {
    return null;
  }

  if (
    text.includes(
      "hybrid"
    )
  ) {
    return "HYBRID";
  }

  if (
    text.includes(
      "electric"
    ) ||
    text === "ev" ||
    text === "bev"
  ) {
    return "ELECTRIC";
  }

  if (
    text.includes(
      "diesel"
    )
  ) {
    return "DIESEL";
  }

  if (
    text.includes(
      "petrol"
    ) ||
    text.includes(
      "gasoline"
    )
  ) {
    return "PETROL";
  }

  return null;
}

function parseVehicleStatus(
  value: any
): VehicleStatus | null {
  const text =
    valueToString(
      value
    )
      .trim()
      .toUpperCase();

  if (!text) {
    return null;
  }

  const aliases:
    Record<
      string,
      VehicleStatus
    > = {
      AVAILABLE:
        "AVAILABLE",

      STOCK:
        "AVAILABLE",

      RESERVED:
        "RESERVED",

      SOLD:
        "SOLD",

      HOLD:
        "HOLD",

      "ON HOLD":
        "HOLD",

      REMOVED:
        "REMOVED",
    };

  return aliases[
    text
  ] ?? null;
}

async function loadWorkbook(
  uploadId: string
) {
  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.readFile(
    getImportPath(
      uploadId
    )
  );

  return workbook;
}

export async function inspectWorkbook(
  uploadId: string
) {
  const workbook =
    await loadWorkbook(
      uploadId
    );

  return workbook
    .worksheets
    .map(
      worksheet => {
        const rows =
          [];

        const rowLimit =
          Math.min(
            worksheet.actualRowCount,
            MAX_INSPECTION_ROWS
          );

        const columnLimit =
          Math.min(
            worksheet.actualColumnCount,
            MAX_INSPECTION_COLUMNS
          );

        for (
          let rowNumber = 1;
          rowNumber <=
          rowLimit;
          rowNumber++
        ) {
          const row =
            worksheet.getRow(
              rowNumber
            );

          const values:
            string[] = [];

          for (
            let column = 1;
            column <=
            columnLimit;
            column++
          ) {
            values.push(
              valueToString(
                rawValue(
                  row.getCell(
                    column
                  )
                )
              )
            );
          }

          rows.push({
            rowNumber,
            values,
          });
        }

        return {
          name:
            worksheet.name,

          rowCount:
            worksheet.actualRowCount,

          columnCount:
            worksheet.actualColumnCount,

          previewRows:
            rows,
        };
      }
    );
}

export async function getWorkbookHeaders(
  options: {
    uploadId: string;
    sheetName: string;
    headerRowNumber:
      number;
  }
) {
  const workbook =
    await loadWorkbook(
      options.uploadId
    );

  const worksheet =
    workbook.getWorksheet(
      options.sheetName
    );

  if (!worksheet) {
    throw new Error(
      "Worksheet not found"
    );
  }

  if (
    options.headerRowNumber <
      1 ||
    options.headerRowNumber >
      worksheet.actualRowCount
  ) {
    throw new Error(
      "Invalid header row"
    );
  }

  const headerRow =
    worksheet.getRow(
      options.headerRowNumber
    );

  const headers:
    Array<{
      columnNumber:
        number;

      heading:
        string;
    }> = [];

  for (
    let column = 1;
    column <=
    worksheet.actualColumnCount;
    column++
  ) {
    const heading =
      valueToString(
        rawValue(
          headerRow.getCell(
            column
          )
        )
      );

    if (!heading) {
      continue;
    }

    headers.push({
      columnNumber:
        column,

      heading,
    });
  }

  return headers;
}

export async function processWorkbook(
  options: {
    uploadId: string;

    customerAccountId:
      number;

    defaultSiteId:
      number | null;

    sheetName:
      string;

    headerRowNumber:
      number;

    mapping:
      StockImportMapping;

    dryRun:
      boolean;
  }
): Promise<
  StockImportSummary
> {
  const workbook =
    await loadWorkbook(
      options.uploadId
    );

  const worksheet =
    workbook.getWorksheet(
      options.sheetName
    );

  if (!worksheet) {
    throw new Error(
      "Worksheet not found"
    );
  }

  if (
    options.headerRowNumber <
      1 ||
    options.headerRowNumber >
      worksheet.actualRowCount
  ) {
    throw new Error(
      "Invalid header row"
    );
  }

  if (
    !options.mapping.vin
  ) {
    throw new Error(
      "VIN must be mapped"
    );
  }

  const headerRow =
    worksheet.getRow(
      options.headerRowNumber
    );

  const headerIndexes =
    new Map<
      string,
      number
    >();

  for (
    let column = 1;
    column <=
    worksheet.actualColumnCount;
    column++
  ) {
    const heading =
      valueToString(
        rawValue(
          headerRow.getCell(
            column
          )
        )
      );

    if (!heading) {
      continue;
    }

    const normalised =
      normaliseHeader(
        heading
      );

    if (
      !headerIndexes.has(
        normalised
      )
    ) {
      headerIndexes.set(
        normalised,
        column
      );
    }
  }

  const fieldIndexes =
    new Map<
      string,
      number
    >();

  for (
    const [
      field,
      heading,
    ] of Object.entries(
      options.mapping
    )
  ) {
    if (!heading) {
      continue;
    }

    const column =
      headerIndexes.get(
        normaliseHeader(
          heading
        )
      );

    if (!column) {
      throw new Error(
        `Mapped column "${heading}" for ${field} was not found`
      );
    }

    fieldIndexes.set(
      field,
      column
    );
  }

  const sites =
    await sitesStore.getAll();

  if (
    options.defaultSiteId !==
      null
  ) {
    const defaultSite =
      sites.find(
        site =>
          site.id ===
            options.defaultSiteId &&
          site.isActive
      );

    if (!defaultSite) {
      throw new Error(
        "Default site does not exist or is inactive"
      );
    }
  }

  const getValue =
    (
      row: any,
      field: string
    ) => {
      const column =
        fieldIndexes.get(
          field
        );

      return column
        ? rawValue(
            row.getCell(
              column
            )
          )
        : null;
    };

  const summary:
    StockImportSummary = {
      rowsProcessed: 0,
      rowsCreated: 0,
      rowsUpdated: 0,
      rowsUnchanged: 0,
      rowsFailed: 0,
      errors: [],
      preview: [],
    };

  const seenVins =
    new Set<string>();

  for (
    let rowNumber =
      options.headerRowNumber +
      1;

    rowNumber <=
    worksheet.actualRowCount;

    rowNumber++
  ) {
    const row =
      worksheet.getRow(
        rowNumber
      );

    const mappedValues =
      [
        ...fieldIndexes.keys(),
      ].map(
        field =>
          valueToString(
            getValue(
              row,
              field
            )
          )
      );

    if (
      mappedValues.every(
        value =>
          !value
      )
    ) {
      continue;
    }

    summary.rowsProcessed++;

    try {
      const rawVin =
        valueToString(
          getValue(
            row,
            "vin"
          )
        );

      if (!rawVin) {
        throw new Error(
          "VIN is missing"
        );
      }

      const vin =
        normaliseVin(
          rawVin
        );

      if (
        seenVins.has(
          vin
        )
      ) {
        throw new Error(
          "Duplicate VIN in workbook"
        );
      }

      seenVins.add(
        vin
      );

      const existing =
        await vehiclesStore
          .getByExactVin(
            vin
          );

      if (
        existing &&
        existing.customerAccountId !==
          options.customerAccountId
      ) {
        throw new Error(
          "VIN already belongs to another customer account"
        );
      }

      const rawReg =
        valueToString(
          getValue(
            row,
            "reg"
          )
        );

      const rawMake =
        valueToString(
          getValue(
            row,
            "make"
          )
        );

      const rawModel =
        valueToString(
          getValue(
            row,
            "model"
          )
        );

      const rawColour =
        valueToString(
          getValue(
            row,
            "colour"
          )
        );

      const stockStage =
        valueToString(
          getValue(
            row,
            "stockStage"
          )
        );

      let siteId =
        options.defaultSiteId;

      const mappedSiteName =
        valueToString(
          getValue(
            row,
            "site"
          )
        );

      if (
        mappedSiteName
      ) {
        const matchedSite =
          sites.find(
            site =>
              site.isActive &&
              site.name
                .trim()
                .toLowerCase() ===
              mappedSiteName
                .trim()
                .toLowerCase()
          );

        if (!matchedSite) {
          throw new Error(
            `Site "${mappedSiteName}" was not found`
          );
        }

        siteId =
          matchedSite.id;
      }

      const updates:
        Partial<
          CreateVehicleInput
        > = {};

      if (
        fieldIndexes.has(
          "reg"
        ) &&
        rawReg
      ) {
        updates.reg =
          normaliseReg(
            rawReg
          );
      }

      if (
        fieldIndexes.has(
          "make"
        ) &&
        rawMake
      ) {
        updates.make =
          rawMake;
      }

      if (
        fieldIndexes.has(
          "model"
        ) &&
        rawModel
      ) {
        updates.model =
          rawModel;
      }

      if (
        fieldIndexes.has(
          "colour"
        ) &&
        rawColour
      ) {
        updates.colour =
          rawColour;
      }

      if (
        fieldIndexes.has(
          "fuelType"
        )
      ) {
        const raw =
          getValue(
            row,
            "fuelType"
          );

        if (
          valueToString(
            raw
          )
        ) {
          const fuelType =
            parseFuelType(
              raw
            );

          if (!fuelType) {
            throw new Error(
              `Invalid fuel type "${valueToString(
                raw
              )}"`
            );
          }

          updates.fuelType =
            fuelType;
        }
      }

      if (
        fieldIndexes.has(
          "mileage"
        )
      ) {
        const raw =
          getValue(
            row,
            "mileage"
          );

        if (
          valueToString(
            raw
          )
        ) {
          const mileage =
            parseMileage(
              raw
            );

          if (
            mileage ===
            null
          ) {
            throw new Error(
              "Invalid mileage"
            );
          }

          updates.mileage =
            mileage;
        }
      }

      if (
        fieldIndexes.has(
          "registrationDate"
        )
      ) {
        const raw =
          getValue(
            row,
            "registrationDate"
          );

        if (
          valueToString(
            raw
          )
        ) {
          const date =
            parseDate(
              raw
            );

          if (!date) {
            throw new Error(
              "Invalid registration date"
            );
          }

          updates.registrationDate =
            date.toISOString();
        }
      }

      if (
        fieldIndexes.has(
          "motExpiryDate"
        )
      ) {
        const raw =
          getValue(
            row,
            "motExpiryDate"
          );

        if (
          valueToString(
            raw
          )
        ) {
          const date =
            parseDate(
              raw
            );

          if (!date) {
            throw new Error(
              "Invalid MOT expiry date"
            );
          }

          updates.motExpiryDate =
            date.toISOString();
        }
      }

      if (
        fieldIndexes.has(
          "vehicleStatus"
        )
      ) {
        const raw =
          getValue(
            row,
            "vehicleStatus"
          );

        if (
          valueToString(
            raw
          )
        ) {
          const status =
            parseVehicleStatus(
              raw
            );

          if (!status) {
            throw new Error(
              `Invalid vehicle status "${valueToString(
                raw
              )}"`
            );
          }

          updates.vehicleStatus =
            status;
        }
      }

      if (
        fieldIndexes.has(
          "stockStage"
        )
      ) {
        updates.stockStage =
          stockStage ||
          null;
      }

      if (
        siteId !== null
      ) {
        updates.siteId =
          siteId;
      }

      if (existing) {
        const comparableExisting =
          existing as any;

        let changed =
          false;

        for (
          const [
            key,
            value,
          ] of Object.entries(
            updates
          )
        ) {
          const existingValue =
            comparableExisting[
              key
            ];

          if (
            key ===
              "registrationDate" ||
            key ===
              "motExpiryDate"
          ) {
            const existingTime =
              existingValue
                ? new Date(
                    existingValue
                  ).getTime()
                : null;

            const incomingTime =
              value
                ? new Date(
                    String(
                      value
                    )
                  ).getTime()
                : null;

            if (
              existingTime !==
              incomingTime
            ) {
              changed =
                true;
            }
          } else if (
            existingValue !==
            value
          ) {
            changed =
              true;
          }
        }

        if (!changed) {
          summary.rowsUnchanged++;

          if (
            summary.preview.length <
            MAX_PREVIEW_ROWS
          ) {
            summary.preview.push({
              rowNumber,
              vin,
              reg:
                existing.reg,
              action:
                "UNCHANGED",
            });
          }

          continue;
        }

        if (
          !options.dryRun
        ) {
          await vehiclesStore
            .updateById(
              existing.id,
              updates
            );
        }

        summary.rowsUpdated++;

        if (
          summary.preview.length <
          MAX_PREVIEW_ROWS
        ) {
          summary.preview.push({
            rowNumber,
            vin,
            reg:
              updates.reg ??
              existing.reg,
            action:
              "UPDATE",
          });
        }

        continue;
      }

      if (!rawReg) {
        throw new Error(
          "Registration is required for a new vehicle"
        );
      }

      if (!rawMake) {
        throw new Error(
          "Make is required for a new vehicle"
        );
      }

      if (!rawModel) {
        throw new Error(
          "Model is required for a new vehicle"
        );
      }

      if (!rawColour) {
        throw new Error(
          "Colour is required for a new vehicle"
        );
      }

      if (
        !updates.fuelType
      ) {
        throw new Error(
          "Fuel type is required for a new vehicle"
        );
      }

      if (
        updates.mileage ===
        undefined
      ) {
        throw new Error(
          "Mileage is required for a new vehicle"
        );
      }

      if (
        !updates.registrationDate
      ) {
        throw new Error(
          "Registration date is required for a new vehicle"
        );
      }

      if (
        !updates.motExpiryDate
      ) {
        throw new Error(
          "MOT expiry date is required for a new vehicle"
        );
      }

      if (!siteId) {
        throw new Error(
          "A site is required for a new vehicle"
        );
      }

      const newVehicle:
        CreateVehicleInput = {
          siteId,

          customerAccountId:
            options.customerAccountId,

          vin,

          reg:
            normaliseReg(
              rawReg
            ),

          make:
            rawMake,

          model:
            rawModel,

          colour:
            rawColour,

          fuelType:
            updates.fuelType,

          mileage:
            updates.mileage,

          registrationDate:
            updates.registrationDate,

          motExpiryDate:
            updates.motExpiryDate,

          vehicleStatus:
            updates.vehicleStatus ??
            "AVAILABLE",

          stockStage:
            updates.stockStage ??
            null,

          source:
            "EXCEL_IMPORT",
        };

      if (
        !options.dryRun
      ) {
        await vehiclesStore
          .create(
            newVehicle
          );
      }

      summary.rowsCreated++;

      if (
        summary.preview.length <
        MAX_PREVIEW_ROWS
      ) {
        summary.preview.push({
          rowNumber,
          vin,
          reg:
            newVehicle.reg,
          action:
            "CREATE",
        });
      }
    } catch (error) {
      summary.rowsFailed++;

      const reason =
        error instanceof Error
          ? error.message
          : "Unknown import error";

      summary.errors.push({
        rowNumber,
        reason,
      });

      if (
        summary.preview.length <
        MAX_PREVIEW_ROWS
      ) {
        summary.preview.push({
          rowNumber,

          vin:
            valueToString(
              getValue(
                row,
                "vin"
              )
            ) || null,

          reg:
            valueToString(
              getValue(
                row,
                "reg"
              )
            ) || null,

          action:
            "FAILED",
        });
      }
    }
  }

  return summary;
}

export function deleteTemporaryWorkbook(
  uploadId: string
) {
  const filePath =
    getImportPath(
      uploadId
    );

  if (
    fs.existsSync(
      filePath
    )
  ) {
    fs.unlinkSync(
      filePath
    );
  }
}