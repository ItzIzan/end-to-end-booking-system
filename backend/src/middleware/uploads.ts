import fs from "fs";
import path from "path";
import {
  randomUUID,
} from "crypto";
import multer from "multer";

import {
  EVIDENCE_ROOT,
  STOCK_IMPORT_TEMP_ROOT,
} from "../config/uploadPaths";

import {
  MAX_EVIDENCE_IMAGES_PER_UPLOAD,
} from "../constants/bookingEvidence";

const imageExtensions:
  Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

const allowedImageTypes =
  new Set(
    Object.keys(
      imageExtensions
    )
  );

const evidenceStorage =
  multer.diskStorage({
    destination: (
      req,
      _file,
      callback
    ) => {
      const bookingId =
        String(
          req.params.id
        );

      const directory =
        path.join(
          EVIDENCE_ROOT,
          bookingId
        );

      fs.mkdirSync(
        directory,
        {
          recursive: true,
        }
      );

      callback(
        null,
        directory
      );
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const extension =
        imageExtensions[
          file.mimetype
        ] ?? ".img";

      callback(
        null,
        `${randomUUID()}${extension}`
      );
    },
  });

export const evidenceUpload =
  multer({
    storage:
      evidenceStorage,

    limits: {
      fileSize:
        10 *
        1024 *
        1024,

      files:
        MAX_EVIDENCE_IMAGES_PER_UPLOAD,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      if (
        !allowedImageTypes.has(
          file.mimetype
        )
      ) {
        callback(
          new Error(
            "Only JPEG, PNG, WEBP, HEIC or HEIF images are allowed"
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    },
  });

const stockImportStorage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      callback
    ) => {
      callback(
        null,
        STOCK_IMPORT_TEMP_ROOT
      );
    },

    filename: (
      _req,
      _file,
      callback
    ) => {
      callback(
        null,
        `${randomUUID()}.xlsx`
      );
    },
  });

export const stockImportUpload =
  multer({
    storage:
      stockImportStorage,

    limits: {
      fileSize:
        25 *
        1024 *
        1024,

      files: 1,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      if (
        extension !== ".xlsx"
      ) {
        callback(
          new Error(
            "Only .xlsx workbooks are supported"
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    },
  });