export const STOCK_IMPORT_FIELDS =
  [
    "vin",
    "reg",
    "make",
    "model",
    "colour",
    "fuelType",
    "mileage",
    "registrationDate",
    "motExpiryDate",
    "vehicleStatus",
    "stockStage",
    "site",
  ] as const;

export type StockImportField =
  (
    typeof STOCK_IMPORT_FIELDS
  )[number];

export type StockImportMapping =
  Partial<
    Record<
      StockImportField,
      string | null
    >
  >;

export interface StockImportError {
  rowNumber: number;
  reason: string;
}

export type StockImportAction =
  | "CREATE"
  | "UPDATE"
  | "UNCHANGED"
  | "FAILED";

export interface StockImportPreviewRow {
  rowNumber: number;

  vin:
    string | null;

  reg:
    string | null;

  action:
    StockImportAction;
}

export interface StockImportSummary {
  rowsProcessed:
    number;

  rowsCreated:
    number;

  rowsUpdated:
    number;

  rowsUnchanged:
    number;

  rowsFailed:
    number;

  errors:
    StockImportError[];

  preview:
    StockImportPreviewRow[];
}