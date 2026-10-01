import {
  Router,
} from "express";

import {
  createImportProfile,
  deleteImportProfile,
  discardStockImportUpload,
  getImportBatches,
  getImportProfiles,
  getStockImportHeaders,
  inspectStockImport,
  processStockImport,
  updateImportProfile,
} from "../controllers/stockImport.controller";

import {
  requireRoles,
} from "../middleware/requireRoles";

import {
  stockImportUpload,
} from "../middleware/uploads";

const router =
  Router();

router.use(
  requireRoles(
    "SYSTEM_ADMIN",
    "OPS_ADMIN"
  )
);

router.post(
  "/inspect",
  stockImportUpload.single(
    "file"
  ),
  inspectStockImport
);

router.post(
  "/headers",
  getStockImportHeaders
);

router.post(
  "/process",
  processStockImport
);

router.delete(
  "/uploads/:uploadId",
  discardStockImportUpload
);

router.get(
  "/profiles",
  getImportProfiles
);

router.post(
  "/profiles",
  createImportProfile
);

router.patch(
  "/profiles/:id",
  updateImportProfile
);

router.delete(
  "/profiles/:id",
  deleteImportProfile
);

router.get(
  "/batches",
  getImportBatches
);

export default router;