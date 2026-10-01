const {
  prisma,
} = require("../lib/prisma");

import type {
  BookingEvidence,
  BookingEvidenceType,
} from "../types/bookingEvidence";

export const bookingEvidenceStore =
  {
    async getByBookingId(
      bookingId: number
    ): Promise<
      BookingEvidence[]
    > {
      return prisma
        .bookingEvidence
        .findMany({
          where: {
            bookingId,
          },

          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },

          orderBy: {
            uploadedAt:
              "asc",
          },
        });
    },

    async getById(
      id: number
    ): Promise<
      BookingEvidence | null
    > {
      return prisma
        .bookingEvidence
        .findUnique({
          where: {
            id,
          },
        });
    },

    async countByType(
      bookingId: number,
      type:
        BookingEvidenceType,
      uploadedByUserId?:
        number
    ): Promise<number> {
      return prisma
        .bookingEvidence
        .count({
          where: {
            bookingId,
            type,
            uploadedByUserId,
          },
        });
    },

    async create(
      data: {
        bookingId:
          number;

        type:
          BookingEvidenceType;

        originalFileName:
          string;

        storageKey:
          string;

        mimeType:
          string;

        fileSize:
          number;

        uploadedByUserId:
          number;
      }
    ): Promise<
      BookingEvidence
    > {
      return prisma
        .bookingEvidence
        .create({
          data,
        });
    },

    async deleteById(
      id: number
    ) {
      return prisma
        .bookingEvidence
        .delete({
          where: {
            id,
          },
        });
    },
  };