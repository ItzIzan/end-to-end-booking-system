import fs from "fs";
import path from "path";

export const UPLOAD_ROOT = path.resolve(
  process.cwd(),
  "uploads"
);

export const EVIDENCE_ROOT = path.join(
  UPLOAD_ROOT,
  "evidence"
);

export const STOCK_IMPORT_TEMP_ROOT = path.join(
  UPLOAD_ROOT,
  "stock-import-temp"
);

for (const directory of [
  EVIDENCE_ROOT,
  STOCK_IMPORT_TEMP_ROOT,
]) {
  fs.mkdirSync(directory, {
    recursive: true,
  });
}