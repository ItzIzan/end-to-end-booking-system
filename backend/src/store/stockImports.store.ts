const {
  prisma,
} = require("../lib/prisma");

import type {
  StockImportMapping,
} from "../types/stockImport";

export const stockImportsStore =
  {
    async getProfiles() {
      return prisma
        .stockImportProfile
        .findMany({
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            name: "asc",
          },
        });
    },

    async getProfileById(
      id: number
    ) {
      return prisma
        .stockImportProfile
        .findUnique({
          where: {
            id,
          },
        });
    },

    async createProfile(
      data: {
        name: string;

        sheetName:
          string | null;

        headerRowNumber:
          number;

        columnMapping:
          StockImportMapping;

        createdByUserId:
          number | null;
      }
    ) {
      return prisma
        .stockImportProfile
        .create({
          data: {
            ...data,

            columnMapping:
              data.columnMapping as any,
          },
        });
    },

    async updateProfile(
      id: number,
      data: {
        name?: string;

        sheetName?:
          string | null;

        headerRowNumber?:
          number;

        columnMapping?:
          StockImportMapping;
      }
    ) {
      return prisma
        .stockImportProfile
        .update({
          where: {
            id,
          },

          data: {
            ...data,

            columnMapping:
              data.columnMapping !==
              undefined
                ? data.columnMapping as any
                : undefined,
          },
        });
    },

    async deleteProfile(
      id: number
    ) {
      return prisma
        .stockImportProfile
        .delete({
          where: {
            id,
          },
        });
    },

    async createBatch(
      data: {
        customerAccountId:
          number;

        profileId:
          number | null;

        originalFileName:
          string;

        sheetName:
          string;

        headerRowNumber:
          number;

        columnMapping:
          StockImportMapping;

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
          Array<{
            rowNumber:
              number;

            reason:
              string;
          }>;

        uploadedByUserId:
          number | null;
      }
    ) {
      return prisma
        .stockImportBatch
        .create({
          data: {
            ...data,

            columnMapping:
              data.columnMapping as any,

            errors:
              data.errors as any,
          },
        });
    },

    async getBatches() {
      return prisma
        .stockImportBatch
        .findMany({
          include: {
            customerAccount:
              true,

            profile:
              true,

            uploadedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 100,
        });
    },
  };